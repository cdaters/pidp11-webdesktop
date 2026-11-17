// Package access defines independent capabilities and bounded, cookie-based lab sessions.
// This is not a LAN deployment configuration: TLS and operator provisioning remain required.
package access

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type Capability string

const (
	Observe         Capability = "observe"
	TerminalObserve Capability = "terminal.observe"
	TerminalInput   Capability = "terminal.input"
	PanelControl    Capability = "panel.control"
	Media           Capability = "media"
	Admin           Capability = "admin"
)

type Credential struct {
	Token        string
	Capabilities []Capability
}
type session struct {
	Caps  map[Capability]bool
	CSRF  string
	Until time.Time
}
type Gate struct {
	mu       sync.Mutex
	keys     []Credential
	sessions map[string]session
	attempts int
	window   time.Time
	Now      func() time.Time
}

func New(keys []Credential) *Gate {
	return &Gate{keys: keys, sessions: map[string]session{}, Now: time.Now}
}
func nonce() string {
	var b [32]byte
	if _, e := rand.Read(b[:]); e != nil {
		panic(e)
	}
	return hex.EncodeToString(b[:])
}
func LocalHost(hostport string) bool {
	host, _, e := net.SplitHostPort(hostport)
	return e == nil && net.ParseIP(host) != nil && net.ParseIP(host).IsLoopback()
}
func Origin(r *http.Request) bool {
	if !LocalHost(r.Host) {
		return false
	}
	u, e := url.Parse(r.Header.Get("Origin"))
	return e == nil && u.Scheme == "http" && u.Host == r.Host && u.Path == "" && u.RawQuery == "" && u.Fragment == "" && u.User == nil
}
func (g *Gate) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" || !Origin(r) {
		http.Error(w, "same-origin POST required", 403)
		return
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	now := g.Now()
	if now.Sub(g.window) >= time.Minute {
		g.window = now
		g.attempts = 0
	}
	g.attempts++
	if g.attempts > 20 {
		http.Error(w, "login rate limit", 429)
		return
	}
	var req struct {
		Token string `json:"token"`
	}
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
	d.DisallowUnknownFields()
	if d.Decode(&req) != nil || len(req.Token) < 32 || len(req.Token) > 128 {
		http.Error(w, "invalid credentials", 401)
		return
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		http.Error(w, "invalid request", 400)
		return
	}
	sum := sha256.Sum256([]byte(req.Token))
	var caps []Capability
	for _, k := range g.keys {
		key := sha256.Sum256([]byte(k.Token))
		if subtle.ConstantTimeCompare(sum[:], key[:]) == 1 {
			caps = k.Capabilities
		}
	}
	if len(caps) == 0 {
		http.Error(w, "invalid credentials", 401)
		return
	}
	for id, s := range g.sessions {
		if !now.Before(s.Until) {
			delete(g.sessions, id)
		}
	}
	if len(g.sessions) >= 16 {
		http.Error(w, "session limit", 503)
		return
	}
	id := nonce()
	s := session{Caps: map[Capability]bool{}, CSRF: nonce(), Until: now.Add(15 * time.Minute)}
	for _, c := range caps {
		s.Caps[c] = true
	}
	g.sessions[id] = s
	http.SetCookie(w, &http.Cookie{Name: "pidp11_lab", Value: id, Path: "/", HttpOnly: true, SameSite: http.SameSiteStrictMode, MaxAge: 900})
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(map[string]any{"capabilities": caps, "csrf": s.CSRF, "expires": s.Until})
}
func (g *Gate) Allowed(r *http.Request, cap Capability) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	cookie, e := r.Cookie("pidp11_lab")
	if e != nil {
		return false
	}
	s, ok := g.sessions[cookie.Value]
	return ok && g.Now().Before(s.Until) && s.Caps[cap]
}
func (g *Gate) Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" || !Origin(r) {
		http.Error(w, "same-origin POST required", 403)
		return
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	c, e := r.Cookie("pidp11_lab")
	if e != nil {
		http.Error(w, "session required", 401)
		return
	}
	s, ok := g.sessions[c.Value]
	a, b := []byte(r.Header.Get("X-CSRF-Token")), []byte(s.CSRF)
	if !ok || len(a) != len(b) || subtle.ConstantTimeCompare(a, b) != 1 {
		http.Error(w, "CSRF required", 403)
		return
	}
	delete(g.sessions, c.Value)
	http.SetCookie(w, &http.Cookie{Name: "pidp11_lab", Value: "", Path: "/", HttpOnly: true, SameSite: http.SameSiteStrictMode, MaxAge: -1})
	w.WriteHeader(204)
}
func (g *Gate) Require(cap Capability, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !g.Allowed(r, cap) {
			http.Error(w, "capability required: "+string(cap), 403)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func ValidToken(token string) bool {
	return len(token) >= 32 && len(token) <= 128 && !strings.ContainsAny(token, "\r\n\x00")
}
