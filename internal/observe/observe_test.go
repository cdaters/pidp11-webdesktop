package observe

import (
	"context"
	"encoding/json"
	"github.com/coder/websocket"
	"net"
	"net/http"
	"net/http/httptest"
	"pidp11.local/webdesktop/internal/access"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"testing/fstest"
	"time"
)

func frame(now time.Time, seq uint64) []byte {
	f := Frame{Version: 1, Boot: "0000000000000001", Seq: seq, Captured: now.UnixMilli(), Inputs: map[string]uint64{}, Outputs: map[string]uint64{}}
	for k := range inputs {
		f.Inputs[k] = 0
	}
	for k := range outputs {
		f.Outputs[k] = 0
	}
	f.Inputs["POWER"] = 1
	b, _ := json.Marshal(f)
	return b
}
func TestValidationReorderFreshnessAndCopies(t *testing.T) {
	s := New()
	now := time.Now()
	if s.Snapshot(now).Available {
		t.Fatal("invented state")
	}
	b := frame(now, 1)
	if e := s.Accept(b, now); e != nil {
		t.Fatal(e)
	}
	if s.Accept(b, now) == nil {
		t.Fatal("duplicate")
	}
	if !s.Snapshot(now).Fresh || s.Snapshot(now.Add(time.Second)).Fresh {
		t.Fatal("freshness")
	}
	snap := s.Snapshot(now)
	snap.Frame.Inputs["SR"] = 123
	if s.Snapshot(now).Frame.Inputs["SR"] == 123 {
		t.Fatal("mutable snapshot")
	}
	for _, bad := range [][]byte{[]byte("{}"), append(frame(now, 2), []byte(" trailing")...), []byte(strings.Repeat("x", 4097)), frame(now.Add(-3*time.Second), 3)} {
		if s.Accept(bad, now) == nil {
			t.Fatal("invalid accepted")
		}
	}
	f := Frame{}
	json.Unmarshal(frame(now, 2), &f)
	f.Boot = "0000000000000002"
	b, _ = json.Marshal(f)
	if e := s.Accept(b, now); e != nil {
		t.Fatal(e)
	}
	if s.Accept(frame(now, 3), now) == nil {
		t.Fatal("retired boot revived")
	}
}
func TestAuthenticatedReadOnlyWebSocketReconnect(t *testing.T) {
	s := New()
	s.Accept(frame(time.Now(), 1), time.Now())
	token := strings.Repeat("a", 32)
	g := access.New([]access.Credential{{Token: token, Capabilities: []access.Capability{access.Observe}}})
	srv := httptest.NewServer(NewServer(s, g).Handler(fstest.MapFS{"index.html": {Data: []byte("lab")}}))
	defer srv.Close()
	r, _ := http.NewRequest("POST", srv.URL+"/api/v1/login", strings.NewReader(`{"token":"`+token+`"}`))
	r.Header.Set("Origin", srv.URL)
	resp, e := http.DefaultClient.Do(r)
	if e != nil {
		t.Fatal(e)
	}
	resp.Body.Close()
	cookie := resp.Cookies()[0]
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	dial := func() *websocket.Conn {
		c, _, e := websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http")+"/api/v1/observe/ws", &websocket.DialOptions{HTTPHeader: http.Header{"Origin": {srv.URL}, "Cookie": {cookie.String()}}})
		if e != nil {
			t.Fatal(e)
		}
		return c
	}
	for i := 0; i < 2; i++ {
		c := dial()
		_, b, e := c.Read(ctx)
		if e != nil {
			t.Fatal(e)
		}
		var snap Snapshot
		json.Unmarshal(b, &snap)
		if !snap.Available || snap.Frame.Seq != 1 {
			t.Fatal("no full reconnect snapshot")
		}
		c.CloseNow()
	}
	c := dial()
	defer c.CloseNow()
	c.Read(ctx)
	c.Write(ctx, websocket.MessageText, []byte(`{"type":"start"}`))
	if _, _, e = c.Read(ctx); e == nil {
		t.Fatal("observer mutation accepted")
	}
	r, _ = http.NewRequest("POST", srv.URL+"/api/v1/control", strings.NewReader(`{}`))
	r.AddCookie(cookie)
	resp, e = http.DefaultClient.Do(r)
	if e != nil {
		t.Fatal(e)
	}
	resp.Body.Close()
	if resp.StatusCode != 403 {
		t.Fatal("control route exposed")
	}
}
func FuzzObservation(f *testing.F) {
	f.Add(frame(time.Now(), 1))
	f.Add([]byte("{}"))
	f.Fuzz(func(t *testing.T, b []byte) {
		if len(b) > 8192 {
			return
		}
		s := New()
		_ = s.Accept(b, time.Now())
		_ = s.Snapshot(time.Now())
	})
}

func TestObserverLimitsExpiryAndSlowReader(t *testing.T) {
	s := New()
	g := access.New([]access.Credential{{Token: strings.Repeat("b", 32), Capabilities: []access.Capability{access.Observe}}})
	var clock atomic.Int64
	clock.Store(time.Now().UnixNano())
	g.Now = func() time.Time { return time.Unix(0, clock.Load()) }
	service := NewServer(s, g)
	srv := httptest.NewUnstartedServer(service.Handler(fstest.MapFS{}))
	var stall atomic.Bool
	srv.Listener = &stallListener{Listener: srv.Listener, stall: &stall}
	srv.Start()
	defer srv.Close()
	r, _ := http.NewRequest("POST", srv.URL+"/api/v1/login", strings.NewReader(`{"token":"`+strings.Repeat("b", 32)+`"}`))
	r.Header.Set("Origin", srv.URL)
	resp, e := http.DefaultClient.Do(r)
	if e != nil {
		t.Fatal(e)
	}
	resp.Body.Close()
	cookie := resp.Cookies()[0]
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	dial := func(slow bool) (*websocket.Conn, *http.Response, error) {
		client := http.DefaultClient
		if slow {
			client = &http.Client{Transport: &http.Transport{DialContext: func(ctx context.Context, n, a string) (net.Conn, error) {
				c, e := (&net.Dialer{}).DialContext(ctx, n, a)
				if e == nil {
					c.(*net.TCPConn).SetReadBuffer(1024)
				}
				return c, e
			}}}
		}
		return websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http")+"/api/v1/observe/ws", &websocket.DialOptions{HTTPClient: client, HTTPHeader: http.Header{"Origin": {srv.URL}, "Cookie": {cookie.String()}}})
	}
	conns := []*websocket.Conn{}
	for i := 0; i < 8; i++ {
		c, _, e := dial(false)
		if e != nil {
			t.Fatal(e)
		}
		conns = append(conns, c)
	}
	if c, r, e := dial(false); e == nil || r.StatusCode != 503 {
		if c != nil {
			c.CloseNow()
		}
		t.Fatal("observer limit not enforced")
	}
	clock.Add(int64(16 * time.Minute))
	for _, c := range conns {
		for {
			if _, _, e = c.Read(ctx); e != nil {
				break
			}
		}
		c.CloseNow()
	}
	deadline := time.Now().Add(time.Second)
	for len(service.slots) > 0 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if len(service.slots) != 0 {
		t.Fatal("expired sockets retained")
	}
	clock.Add(-int64(16 * time.Minute))
	stall.Store(true)
	c, _, e := dial(true)
	if e != nil {
		t.Fatal(e)
	}
	defer c.CloseNow()
	// Deterministic transport stops completing writes after 4 KiB. This avoids
	// platform TCP autotuning and tests the real stream cancellation deadline.
	start := time.Now()
	seq := uint64(1)
	for len(service.slots) > 0 && time.Since(start) < 12*time.Second {
		s.Accept(frame(time.Now(), seq), time.Now())
		seq++
		time.Sleep(20 * time.Millisecond)
	}
	if len(service.slots) != 0 {
		t.Fatal("stalled reader was not evicted")
	}
	if !s.Snapshot(time.Now()).Available {
		t.Fatal("slow observer stalled publication")
	}
}

type stallListener struct {
	net.Listener
	stall *atomic.Bool
}

func (l *stallListener) Accept() (net.Conn, error) {
	c, e := l.Listener.Accept()
	if e != nil {
		return nil, e
	}
	return &stallConn{Conn: c, stall: l.stall, closed: make(chan struct{})}, nil
}

type stallConn struct {
	net.Conn
	stall  *atomic.Bool
	sent   int
	closed chan struct{}
	once   sync.Once
}

func (c *stallConn) Write(b []byte) (int, error) {
	if c.stall.Load() && c.sent > 4096 {
		<-c.closed
		return 0, net.ErrClosed
	}
	n, e := c.Conn.Write(b)
	c.sent += n
	return n, e
}
func (c *stallConn) Close() error { c.once.Do(func() { close(c.closed) }); return c.Conn.Close() }

func BenchmarkSnapshotJSON(b *testing.B) {
	s := New()
	s.Accept(frame(time.Now(), 1), time.Now())
	b.ReportAllocs()
	for b.Loop() {
		json.Marshal(s.Snapshot(time.Now()))
	}
}
