package terminalbridge

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/coder/websocket"
	"io"
	"io/fs"
	"net/http"
	"pidp11.local/webdesktop/internal/access"
	"pidp11.local/webdesktop/internal/web"
	"time"
)

// Server exposes an existing Bridge through an independently provisioned access
// Gate. It does not dial guest lines or own the HTTP listener; the command does.
type Server struct {
	Bridge         Directory
	Auth           *access.Gate
	Register       func(*http.ServeMux)
	AllowProposals bool
}

// Handler serves assets and terminal-only routes. Configure Bridge and Auth before
// serving; observation permission never implies keyboard permission.
func (s *Server) Handler(assets fs.FS) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/login", s.Auth.Login)
	mux.HandleFunc("POST /api/v1/logout", s.Auth.Logout)
	mux.HandleFunc("GET /api/v1/session", s.Auth.Session)
	mux.Handle("GET /api/v1/terminals", s.Auth.Require(access.TerminalObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(s.Bridge.List())
	})))
	mux.Handle("GET /api/v1/terminals/{id}/ws", s.Auth.Require(access.TerminalObserve, http.HandlerFunc(s.stream)))
	mux.Handle("GET /api/v1/terminals/{id}/generation/{generation}/ws", s.Auth.Require(access.TerminalObserve, http.HandlerFunc(s.stream)))
	if s.Register != nil {
		s.Register(mux)
	}
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) { http.Error(w, "guest terminal service only", 403) })
	mux.Handle("/", web.ServeAssets(assets))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.Auth.TrustedRequest(r) {
			http.Error(w, "untrusted host", 403)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		mux.ServeHTTP(w, r)
	})
}
func (s *Server) stream(w http.ResponseWriter, r *http.Request) {
	if !s.Auth.Origin(r) {
		http.Error(w, "same origin required", 403)
		return
	}
	if r.URL.RawQuery != "" {
		http.Error(w, "query parameters not accepted", 400)
		return
	}
	e := s.Bridge.Lookup(r.PathValue("id"), r.PathValue("generation"))
	if e == nil {
		http.NotFound(w, r)
		return
	}
	client, err := e.Subscribe()
	if err != nil {
		http.Error(w, "viewer limit", 503)
		return
	}
	defer e.Unsubscribe(client)
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{CompressionMode: websocket.CompressionDisabled})
	if err != nil {
		return
	}
	defer c.CloseNow()
	c.SetReadLimit(1024)
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	// One goroutine reads requests; this handler writes frames. Either transport
	// failure cancels the pair, and deferred Unsubscribe releases keyboard ownership.
	go func() {
		defer cancel()
		for {
			kind, data, err := c.Read(ctx)
			if err != nil {
				return
			}
			if kind != websocket.MessageText || !s.Auth.Allowed(r, access.TerminalObserve) {
				return
			}
			var m struct {
				Type       string `json:"type"`
				Epoch      uint64 `json:"epoch"`
				Seq        uint64 `json:"seq"`
				Data       []byte `json:"data"`
				Bytes      int    `json:"bytes"`
				ProposalID string `json:"proposal_id"`
			}
			d := json.NewDecoder(bytes.NewReader(data))
			d.DisallowUnknownFields()
			if d.Decode(&m) != nil {
				return
			}
			var extra any
			if d.Decode(&extra) != io.EOF {
				return
			}
			if m.Type != "ack" && m.Type != "status" && !s.Auth.Allowed(r, access.TerminalInput) {
				return
			}
			if m.Type == "propose" || m.Type == "approve" || m.Type == "cancel-proposal" {
				if !s.AllowProposals || e.ProposalOperation(client, m.Type, m.ProposalID, m.Epoch, m.Seq, m.Data) != nil {
					return
				}
				continue
			}
			if e.Operation(client, m.Type, m.Epoch, m.Seq, m.Data, m.Bytes) != nil {
				return
			}
		}
	}()
	tick := time.NewTicker(500 * time.Millisecond)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-client.done:
			return
		case <-tick.C:
			if !s.Auth.Allowed(r, access.TerminalObserve) {
				return
			}
			if !s.Auth.Allowed(r, access.TerminalInput) {
				e.Operation(client, "release", 0, 0, nil, 0)
			}
		case f := <-client.out:
			if !s.Auth.Allowed(r, access.TerminalObserve) {
				return
			}
			payload, _ := json.Marshal(f)
			writeCtx, stop := context.WithTimeout(ctx, 500*time.Millisecond)
			err = c.Write(writeCtx, websocket.MessageText, payload)
			stop()
			if err != nil {
				return
			}
		}
	}
}
