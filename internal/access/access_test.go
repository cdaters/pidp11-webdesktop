package access

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func req(method, path, body string) *http.Request {
	r := httptest.NewRequest(method, "http://127.0.0.1:8083"+path, strings.NewReader(body))
	r.Header.Set("Origin", "http://127.0.0.1:8083")
	return r
}
func TestIndependentCapabilitiesCSRFAndExpiry(t *testing.T) {
	caps := []Capability{Observe, TerminalObserve, TerminalInput, PanelControl, Media, Admin}
	for _, cap := range caps {
		t.Run(string(cap), func(t *testing.T) {
			token := strings.Repeat("a", 32)
			g := New([]Credential{{token, []Capability{cap}}})
			now := time.Now()
			g.Now = func() time.Time { return now }
			w := httptest.NewRecorder()
			g.Login(w, req("POST", "/api/v1/login", fmt.Sprintf(`{"token":%q}`, token)))
			if w.Code != 200 {
				t.Fatal(w.Code, w.Body)
			}
			cookie := w.Result().Cookies()[0]
			if !cookie.HttpOnly || cookie.SameSite != http.SameSiteStrictMode {
				t.Fatal("unsafe cookie")
			}
			r := req("GET", "/api/v1/observe", "")
			r.AddCookie(cookie)
			for _, other := range caps {
				if g.Allowed(r, other) != (cap == other) {
					t.Fatal("capability escalation", cap, other)
				}
			}
			var result struct {
				CSRF string `json:"csrf"`
			}
			json.Unmarshal(w.Body.Bytes(), &result)
			logout := req("POST", "/api/v1/logout", "")
			logout.AddCookie(cookie)
			w = httptest.NewRecorder()
			g.Logout(w, logout)
			if w.Code != 403 {
				t.Fatal("missing CSRF accepted")
			}
			logout.Header.Set("X-CSRF-Token", result.CSRF)
			w = httptest.NewRecorder()
			g.Logout(w, logout)
			if w.Code != 204 || g.Allowed(r, cap) {
				t.Fatal("logout failed")
			}
			w = httptest.NewRecorder()
			g.Login(w, req("POST", "/api/v1/login", fmt.Sprintf(`{"token":%q}`, token)))
			r = req("GET", "/api/v1/observe", "")
			r.AddCookie(w.Result().Cookies()[0])
			now = now.Add(16 * time.Minute)
			if g.Allowed(r, cap) {
				t.Fatal("expired session authorized")
			}
		})
	}
}
func TestMalformedOriginCredentialsAndBounds(t *testing.T) {
	token := strings.Repeat("a", 32)
	for _, body := range []string{`{}`, `{"token":"wrong"}`, fmt.Sprintf(`{"token":%q} garbage`, token), fmt.Sprintf(`{"token":%q,"capabilities":["admin"]}`, token), strings.Repeat("a", 2000)} {
		g := New([]Credential{{token, []Capability{Observe}}})
		w := httptest.NewRecorder()
		g.Login(w, req("POST", "/api/v1/login", body))
		if w.Code == 200 {
			t.Fatal("malformed login", body)
		}
	}
	g := New([]Credential{{token, []Capability{Observe}}})
	r := req("POST", "/api/v1/login", fmt.Sprintf(`{"token":%q}`, token))
	r.Header.Set("Origin", "http://attacker.invalid")
	w := httptest.NewRecorder()
	g.Login(w, r)
	if w.Code != 403 {
		t.Fatal(w.Code)
	}
	for i := 0; i < 21; i++ {
		w = httptest.NewRecorder()
		g.Login(w, req("POST", "/api/v1/login", `{}`))
	}
	if w.Code != 429 {
		t.Fatal("rate bound")
	}
}
