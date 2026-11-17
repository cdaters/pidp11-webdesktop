package observe

import (
	"context"
	"encoding/json"
	"github.com/coder/websocket"
	"io/fs"
	"net/http"
	"pidp11.local/webdesktop/internal/access"
	"pidp11.local/webdesktop/internal/web"
	"time"
)

type Server struct {
	Store *Store
	Auth  *access.Gate
	slots chan struct{}
}

func NewServer(s *Store, a *access.Gate) *Server { return &Server{s, a, make(chan struct{}, 8)} }
func (s *Server) Handler(assets fs.FS) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/login", s.Auth.Login)
	mux.HandleFunc("POST /api/v1/logout", s.Auth.Logout)
	mux.Handle("GET /api/v1/observe", s.Auth.Require(access.Observe, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(s.Store.Snapshot(time.Now())) })))
	mux.Handle("GET /api/v1/observe/ws", s.Auth.Require(access.Observe, http.HandlerFunc(s.stream)))
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "observation service has no control, terminal-input, media or administration routes", 403)
	})
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" && r.Method != "HEAD" {
			http.Error(w, "method not allowed", 405)
			return
		}
		web.ServeAssets(assets).ServeHTTP(w, r)
	}))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !access.LocalHost(r.Host) {
			http.Error(w, "loopback IP Host required", 403)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'")
		mux.ServeHTTP(w, r)
	})
}
func (s *Server) stream(w http.ResponseWriter, r *http.Request) {
	if !access.Origin(r) {
		http.Error(w, "same origin required", 403)
		return
	}
	select {
	case s.slots <- struct{}{}:
		defer func() { <-s.slots }()
	default:
		http.Error(w, "observer limit", 503)
		return
	}
	c, e := websocket.Accept(w, r, &websocket.AcceptOptions{CompressionMode: websocket.CompressionDisabled})
	if e != nil {
		return
	}
	defer c.CloseNow()
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	c.SetReadLimit(512)
	go func() {
		defer cancel()
		_, _, _ = c.Read(ctx)
		c.Close(websocket.StatusPolicyViolation, "observation is read-only")
	}()
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()
	var sequence uint64
	var boot string
	var fresh bool
	last := time.Time{}
	for {
		if !s.Auth.Allowed(r, access.Observe) {
			return
		}
		snap := s.Store.Snapshot(time.Now())
		changed := snap.Frame != nil && (snap.Frame.Seq != sequence || snap.Frame.Boot != boot)
		if changed || snap.Fresh != fresh || time.Since(last) >= time.Second {
			b, _ := json.Marshal(snap)
			writeCtx, stop := context.WithTimeout(ctx, 500*time.Millisecond)
			e = c.Write(writeCtx, websocket.MessageText, b)
			stop()
			if e != nil {
				return
			}
			fresh = snap.Fresh
			last = time.Now()
			if snap.Frame != nil {
				sequence = snap.Frame.Seq
				boot = snap.Frame.Boot
			}
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
