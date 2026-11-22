package modelhost

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"pidp11.local/webdesktop/internal/companion"
)

type testProvider func(context.Context, []companion.Message) (string, error)

func (f testProvider) Reply(c context.Context, m []companion.Message) (string, error) { return f(c, m) }
func TestAuthenticatedTLSAndNoManagement(t *testing.T) {
	var calls atomic.Int32
	token := strings.Repeat("a", 32)
	server := httptest.NewTLSServer(New(token, "approved", testProvider(func(_ context.Context, m []companion.Message) (string, error) {
		calls.Add(1)
		return "bounded fixture", nil
	})))
	defer server.Close()
	client := server.Client()
	call := func(method, path, auth, origin, body string) int {
		t.Helper()
		r, _ := http.NewRequest(method, server.URL+path, strings.NewReader(body))
		r.Header.Set("Authorization", auth)
		r.Header.Set("Origin", origin)
		reply, err := client.Do(r)
		if err != nil {
			t.Fatal(err)
		}
		defer reply.Body.Close()
		io.Copy(io.Discard, reply.Body)
		return reply.StatusCode
	}
	if code := call("GET", "/v1/models", "", "", ""); code != 401 {
		t.Fatal(code)
	}
	if code := call("GET", "/v1/models", "Bearer "+token, "http://browser", ""); code != 403 {
		t.Fatal(code)
	}
	for _, path := range []string{"/api/pull", "/api/delete", "/api/create", "/api/push", "/keys", "/screen", "/status"} {
		if code := call("POST", path, "Bearer "+token, "", "{}"); code != 404 {
			t.Fatal(path, code)
		}
	}
	body := `{"model":"approved","messages":[{"role":"system","content":"tutor only"},{"role":"user","content":"Explain V7"}]}`
	for _, bad := range []string{strings.Replace(body, "approved", "other", 1), strings.TrimSuffix(body, "}") + `,"tools":[]}`, body + `{}`, strings.Replace(body, "tutor only", strings.Repeat("x", 4097), 1)} {
		if code := call("POST", "/v1/chat/completions", "Bearer "+token, "", bad); code != 400 {
			t.Fatal(code)
		}
	}
	if calls.Load() != 0 {
		t.Fatal("invalid request reached runner")
	}
	if code := call("POST", "/v1/chat/completions", "Bearer "+token, "", body); code != 200 {
		t.Fatal(code)
	}
	if code := call("GET", "/v1/references?q=virtual%20physical%20architecture", "Bearer "+token, "", ""); code != 200 {
		t.Fatal(code)
	}
	if calls.Load() != 1 {
		t.Fatal("reference search called model")
	}
	// An unrelated TLS client must not accept the ephemeral certificate.
	untrusted := &http.Client{Timeout: time.Second}
	if response, err := untrusted.Get(server.URL + "/v1/models"); err == nil {
		response.Body.Close()
		t.Fatal("untrusted certificate accepted")
	}
}
func TestCancellationAndBusyDoNotQueue(t *testing.T) {
	entered, cancelled := make(chan struct{}), make(chan struct{})
	token := strings.Repeat("b", 32)
	s := httptest.NewTLSServer(New(token, "approved", testProvider(func(ctx context.Context, _ []companion.Message) (string, error) {
		close(entered)
		<-ctx.Done()
		close(cancelled)
		return "", ctx.Err()
	})))
	defer s.Close()
	client := s.Client()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	request := func(ctx context.Context) *http.Request {
		r, _ := http.NewRequestWithContext(ctx, "POST", s.URL+"/v1/chat/completions", strings.NewReader(`{"model":"approved","messages":[{"role":"user","content":"test"}]}`))
		r.Header.Set("Authorization", "Bearer "+token)
		return r
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		r, err := client.Do(request(ctx))
		if err == nil {
			r.Body.Close()
		}
	}()
	<-entered
	r, err := client.Do(request(context.Background()))
	if err != nil {
		t.Fatal(err)
	}
	r.Body.Close()
	if r.StatusCode != 429 {
		t.Fatal(r.StatusCode)
	}
	cancel()
	select {
	case <-cancelled:
	case <-time.After(time.Second):
		t.Fatal("provider context not cancelled")
	}
	<-done
}

func TestGatewayQuotationAndDurableAttribution(t *testing.T) {
	token := strings.Repeat("q", 32)
	for _, c := range []struct {
		answer string
		code   int
	}{
		{`The guide says "Every terminal has its own monitor session."`, 502},
		{"A cautious paraphrase.", 200},
	} {
		h := New(token, "approved", testProvider(func(context.Context, []companion.Message) (string, error) { return c.answer, nil }))
		r := httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(`{"model":"approved","messages":[{"role":"user","content":"Explain RT-11"}]}`))
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != c.code {
			t.Fatal(w.Code, w.Body.String())
		}
		if c.code == 200 && !strings.Contains(w.Body.String(), "Source status:") {
			t.Fatal("gateway omitted durable label")
		}
	}
}
