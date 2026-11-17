package server

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"io/fs"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/coder/websocket"
	"pidp11.local/webdesktop/internal/panel"
	"pidp11.local/webdesktop/internal/web"
)

type Hub interface {
	Connect(string) bool
	Disconnect(string)
	Snapshot() panel.State
	Apply(string, panel.Request, time.Time) panel.Result
	Poll(time.Time)
}
type Server struct {
	Hub          Hub
	assets       fs.FS
	requestLimit int
}

func New(assets fs.FS) *Server { return NewWithHub(assets, panel.New()) }
func NewWithHub(assets fs.FS, hub Hub) *Server {
	return &Server{Hub: hub, assets: assets, requestLimit: 40}
}
func (s *Server) Run(ctx context.Context) {
	t := time.NewTicker(20 * time.Millisecond)
	defer t.Stop()
	for {
		select {
		case now := <-t.C:
			s.Hub.Poll(now)
		case <-ctx.Done():
			return
		}
	}
}
func loopbackHost(hostport string) bool {
	host, _, err := net.SplitHostPort(hostport)
	if err != nil {
		return false
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(s.Hub.Snapshot())
	})
	mux.HandleFunc("GET /api/v1/ws", s.stream)
	mux.Handle("GET /", web.ServeAssets(s.assets))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !loopbackHost(r.Host) {
			http.Error(w, "Loopback IP Host required", http.StatusForbidden)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
		mux.ServeHTTP(w, r)
	})
}

type event struct {
	Type    string      `json:"type"`
	Session string      `json:"session,omitempty"`
	State   panel.State `json:"state"`
}

func decodeRequest(data []byte) (panel.Request, error) {
	var r panel.Request
	d := json.NewDecoder(bytes.NewReader(data))
	d.DisallowUnknownFields()
	err := d.Decode(&r)
	if err == nil {
		var extra any
		if e := d.Decode(&extra); e != io.EOF {
			err = io.ErrUnexpectedEOF
		}
	}
	return r, err
}
func (s *Server) stream(w http.ResponseWriter, r *http.Request) {
	origin, err := url.Parse(r.Header.Get("Origin"))
	if err != nil || origin.Scheme != "http" || origin.Host != r.Host || origin.Path != "" || origin.RawQuery != "" || origin.User != nil {
		http.Error(w, "Same-origin browser required", http.StatusForbidden)
		return
	}
	var nonce [16]byte
	if _, err = rand.Read(nonce[:]); err != nil {
		http.Error(w, "Session unavailable", 503)
		return
	}
	id := hex.EncodeToString(nonce[:])
	if !s.Hub.Connect(id) {
		http.Error(w, "Viewer limit reached", 503)
		return
	}
	defer s.Hub.Disconnect(id)
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{CompressionMode: websocket.CompressionDisabled})
	if err != nil {
		return
	}
	defer c.CloseNow()
	c.SetReadLimit(2048)
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	replies := make(chan panel.Result, 16)
	go func() {
		defer cancel()
		window := time.Now()
		count := 0
		for {
			typ, data, err := c.Read(ctx)
			if err != nil {
				return
			}
			if typ != websocket.MessageText {
				return
			}
			now := time.Now()
			if now.Sub(window) >= time.Second {
				window = now
				count = 0
			}
			count++
			if count > s.requestLimit {
				return
			}
			req, err := decodeRequest(data)
			if err != nil {
				return
			}
			result := s.Hub.Apply(id, req, now)
			select {
			case replies <- result:
			case <-ctx.Done():
				return
			default:
				return
			}
		}
	}()
	write := func(v any) error {
		data, err := json.Marshal(v)
		if err != nil {
			return err
		}
		wc, cancel := context.WithTimeout(ctx, time.Second)
		defer cancel()
		return c.Write(wc, websocket.MessageText, data)
	}
	if write(event{Type: "hello", Session: id, State: s.Hub.Snapshot()}) != nil {
		return
	}
	t := time.NewTicker(50 * time.Millisecond)
	defer t.Stop()
	heartbeat := time.NewTicker(time.Second)
	defer heartbeat.Stop()
	var seq uint64
	for {
		select {
		case result := <-replies:
			if write(result) != nil {
				return
			}
		case <-t.C:
			st := s.Hub.Snapshot()
			if st.Revision != seq {
				seq = st.Revision
				if write(event{Type: "state", State: st}) != nil {
					return
				}
			}
		case <-heartbeat.C:
			if write(event{Type: "state", State: s.Hub.Snapshot()}) != nil {
				return
			}
		case <-ctx.Done():
			return
		}
	}
}

// ValidateListen refuses DNS names and non-loopback addresses without resolving anything.
func ValidateListen(address string) bool {
	return !strings.Contains(address, "\x00") && loopbackHost(address)
}
