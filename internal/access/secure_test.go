package access

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestSecureOriginCookiesRevocationAndAudit(t *testing.T) {
	token := strings.Repeat("c", 64)
	g, e := NewSecure("https://127.0.0.1:8443", []Credential{{token, []Capability{Observe}}})
	if e != nil {
		t.Fatal(e)
	}
	request := func(method, path, body string) *http.Request {
		r := httptest.NewRequest(method, "https://127.0.0.1:8443"+path, strings.NewReader(body))
		r.Header.Set("Origin", "https://127.0.0.1:8443")
		return r
	}
	for _, change := range []func(*http.Request){func(r *http.Request) { r.TLS = nil }, func(r *http.Request) { r.Host = "attacker.invalid" }, func(r *http.Request) { r.Header.Set("Origin", "https://attacker.invalid") }, func(r *http.Request) { r.Header.Set("Origin", "https://127.0.0.1:8443/") }} {
		r := request("POST", "/api/v1/login", `{"token":"`+token+`"}`)
		change(r)
		r.Header.Set("X-Forwarded-Proto", "https")
		w := httptest.NewRecorder()
		g.Login(w, r)
		if w.Code != 403 {
			t.Fatal("trust boundary", w.Code)
		}
	}
	w := httptest.NewRecorder()
	g.Login(w, request("POST", "/api/v1/login", `{"token":"`+token+`"}`))
	if w.Code != 200 {
		t.Fatal(w.Code)
	}
	c := w.Result().Cookies()[0]
	if c.Name != "__Host-pidp11" || !c.Secure || !c.HttpOnly || c.Domain != "" || c.Path != "/" {
		t.Fatal("cookie", c)
	}
	r := request("GET", "/api/v1/session", "")
	r.AddCookie(c)
	if !g.Allowed(r, Observe) || g.Allowed(r, Admin) {
		t.Fatal("capabilities")
	}
	w = httptest.NewRecorder()
	g.Session(w, r)
	if w.Code != 200 {
		t.Fatal(w.Code)
	}
	g.Revoke(Identity(token))
	if g.Allowed(r, Observe) {
		t.Fatal("revocation")
	}
	w = httptest.NewRecorder()
	g.Login(w, request("POST", "/api/v1/login", `{"token":"`+token+`"}`))
	if w.Code != 401 {
		t.Fatal("revoked credential")
	}
	for i := 0; i < 200; i++ {
		g.ReplaceCredentials(nil)
	}
	audit := g.Audit()
	if len(audit) != 128 {
		t.Fatal("audit bound")
	}
	b, _ := json.Marshal(audit)
	if strings.Contains(string(b), token) || strings.Contains(string(b), c.Value) {
		t.Fatal("secret in audit")
	}
}

func TestCredentialsAreCopied(t *testing.T) {
	keys := []Credential{{strings.Repeat("a", 64), []Capability{Observe}}}
	g := New(keys)
	keys[0].Capabilities[0] = Admin
	if g.keys[0].Capabilities[0] != Observe {
		t.Fatal("caller mutated capability")
	}
	g.ReplaceCredentials(keys)
	keys[0].Capabilities[0] = PanelControl
	if g.keys[0].Capabilities[0] != Admin {
		t.Fatal("reload aliases capability")
	}
	g.Revoke(Identity(keys[0].Token))
	if len(keys) != 1 || keys[0].Token == "" {
		t.Fatal("revoke mutated caller")
	}
}

// A half-sent login must not delay session revocation or snapshot authorization.
func TestSlowLoginDoesNotHoldSessionLock(t *testing.T) {
	token := strings.Repeat("d", 64)
	g, err := NewSecure("https://127.0.0.1:8443", []Credential{{token, []Capability{Observe}}})
	if err != nil {
		t.Fatal(err)
	}
	reader, writer := io.Pipe()
	defer reader.Close()
	defer writer.Close()
	started := make(chan struct{})
	body := &announcedReader{Reader: reader, started: started}
	r := httptest.NewRequest("POST", "https://127.0.0.1:8443/api/v1/login", body)
	r.Header.Set("Origin", "https://127.0.0.1:8443")
	w := httptest.NewRecorder()
	loginDone := make(chan struct{})
	go func() { defer close(loginDone); g.Login(w, r) }()
	<-started
	revoked := make(chan struct{})
	go func() { g.ReplaceCredentials(nil); close(revoked) }()
	select {
	case <-revoked:
	case <-time.After(time.Second):
		writer.Close()
		<-loginDone
		<-revoked
		t.Fatal("slow request blocked credential revocation")
	}
	if _, err := io.WriteString(writer, `{"token":"`+token+`"}`); err != nil {
		t.Fatal(err)
	}
	writer.Close()
	<-loginDone
	if w.Code != 401 {
		t.Fatalf("in-flight revoked login accepted: %d", w.Code)
	}
}

type announcedReader struct {
	io.Reader
	once    sync.Once
	started chan struct{}
}

func (r *announcedReader) Read(p []byte) (int, error) {
	r.once.Do(func() { close(r.started) })
	return r.Reader.Read(p)
}
