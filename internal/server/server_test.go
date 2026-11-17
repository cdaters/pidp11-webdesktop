package server

import (
	"context"
	"encoding/json"
	"github.com/coder/websocket"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"pidp11.local/webdesktop/internal/panel"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"testing/fstest"
	"time"
)

type wire struct {
	Type, Session, Message string
	ID                     uint64
	Accepted               bool
	State                  panel.State
}

func setup(t testing.TB) (*Server, *httptest.Server) {
	t.Helper()
	s := New(fstest.MapFS{"index.html": {Data: []byte("mock")}})
	ctx, cancel := context.WithCancel(context.Background())
	go s.Run(ctx)
	ts := httptest.NewServer(s.Handler())
	t.Cleanup(func() { cancel(); ts.Close() })
	return s, ts
}
func dial(t testing.TB, ts *httptest.Server) (*websocket.Conn, wire) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	c, _, e := websocket.Dial(ctx, strings.Replace(ts.URL, "http:", "ws:", 1)+"/api/v1/ws", &websocket.DialOptions{HTTPHeader: http.Header{"Origin": {ts.URL}}})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { c.CloseNow() })
	return c, read(t, c, 0, "hello")
}
func read(t testing.TB, c *websocket.Conn, id uint64, kind string) wire {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	for {
		_, b, e := c.Read(ctx)
		if e != nil {
			t.Fatal(e)
		}
		var w wire
		if e = json.Unmarshal(b, &w); e != nil {
			t.Fatal(e)
		}
		if w.Type == kind && (id == 0 || w.ID == id) {
			return w
		}
	}
}
func send(t testing.TB, c *websocket.Conn, r panel.Request) wire {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	b, _ := json.Marshal(r)
	if e := c.Write(ctx, websocket.MessageText, b); e != nil {
		t.Fatal(e)
	}
	return read(t, c, r.ID, "ack")
}
func TestWebSocketSynchronizationAndReconnect(t *testing.T) {
	s, ts := setup(t)
	a, hello := dial(t, ts)
	b, bhello := dial(t, ts)
	if hello.Session == bhello.Session || hello.State.Owner != "" {
		t.Fatal("bad spectator baseline")
	}
	owned := send(t, a, panel.Request{ID: 1, Type: "acquire"})
	if !owned.Accepted {
		t.Fatal(owned)
	}
	conflict := send(t, b, panel.Request{ID: 1, Type: "acquire"})
	if conflict.Accepted {
		t.Fatal("two owners")
	}
	set := send(t, a, panel.Request{ID: 2, Type: "set", Control: "sr", Value: 0o12345, Epoch: owned.State.Epoch, Expected: owned.State.ControlRevision})
	if !set.Accepted {
		t.Fatal(set)
	}
	for {
		w := read(t, b, 0, "state")
		if w.State.Revision >= set.State.Revision {
			if w.State.SwitchRegister != 0o12345 {
				t.Fatal(w)
			}
			break
		}
	}
	a.CloseNow()
	deadline := time.Now().Add(time.Second)
	for s.Hub.Snapshot().Owner != "" && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	c, reconnected := dial(t, ts)
	if reconnected.Session == hello.Session || reconnected.State.Owner != "" || reconnected.State.SwitchRegister != 0o12345 || !reconnected.State.Halted {
		t.Fatal(reconnected)
	}
	r := send(t, c, panel.Request{ID: 1, Type: "set", Control: "sr", Value: 0, Epoch: owned.State.Epoch, Expected: set.State.ControlRevision})
	if r.Accepted {
		t.Fatal("reconnect replay accepted")
	}
}
func TestRejectOriginHostAndMalformed(t *testing.T) {
	_, ts := setup(t)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	for _, origin := range []string{"", "http://evil.invalid", ts.URL + "/path"} {
		c, res, e := websocket.Dial(ctx, strings.Replace(ts.URL, "http:", "ws:", 1)+"/api/v1/ws", &websocket.DialOptions{HTTPHeader: http.Header{"Origin": {origin}}})
		if c != nil {
			c.CloseNow()
		}
		if e == nil || res.StatusCode != 403 {
			t.Fatalf("origin %q accepted", origin)
		}
	}
	req, _ := http.NewRequest("GET", ts.URL+"/api/v1/status", nil)
	req.Host = "evil.invalid:80"
	res, e := http.DefaultClient.Do(req)
	if e != nil {
		t.Fatal(e)
	}
	res.Body.Close()
	if res.StatusCode != 403 {
		t.Fatal("Host accepted")
	}
	for _, data := range []string{`{"id":1,"type":"acquire","unexpected":true}`, `{"id":1,"type":"set","value":-1}`, `{"id":1,"type":"acquire"} {}`, strings.Repeat("x", 3000)} {
		c, _ := dial(t, ts)
		c.Write(ctx, websocket.MessageText, []byte(data))
		for {
			_, _, e := c.Read(ctx)
			if e != nil {
				break
			}
		}
		if ctx.Err() != nil {
			t.Fatal("malformed client was not disconnected promptly")
		}
		c.CloseNow()
	}
}
func TestRequestFloodAndListenerBoundary(t *testing.T) {
	for _, a := range []string{"0.0.0.0:8080", "pidp11.local:8080", "192.168.1.1:80", "localhost:8080"} {
		if ValidateListen(a) {
			t.Fatal(a)
		}
	}
	if !ValidateListen("127.0.0.1:8080") {
		t.Fatal("loopback refused")
	}
	s, ts := setup(t)
	c, _ := dial(t, ts)
	if !send(t, c, panel.Request{ID: 1, Type: "acquire"}).Accepted {
		t.Fatal("owner not established")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	for i := 0; i < 60; i++ {
		if e := c.Write(ctx, websocket.MessageText, []byte(`{"id":1,"type":"acquire"}`)); e != nil {
			break
		}
	}
	// Assert server-side eviction, not TCP FIN/RST arrival while the peer has
	// deliberately left many replies unread (whose timing varies by platform).
	deadline := time.Now().Add(time.Second)
	for s.Hub.Snapshot().Owner != "" && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if s.Hub.Snapshot().Owner != "" {
		t.Fatal("flood retained control ownership")
	}
	replacement, _ := dial(t, ts)
	if !send(t, replacement, panel.Request{ID: 1, Type: "acquire"}).Accepted {
		t.Fatal("flood blocked replacement owner")
	}

}
func BenchmarkCommandRoundTrip(b *testing.B) {
	s, ts := setup(b)
	s.requestLimit = 1000000000
	c, _ := dial(b, ts)
	r := send(b, c, panel.Request{ID: 1, Type: "acquire"})
	id := uint64(1)
	b.ReportAllocs()
	b.ResetTimer()
	for b.Loop() {
		id++
		r = send(b, c, panel.Request{ID: id, Type: "set", Control: "sr", Value: uint32(id) & panel.AddressMask, Epoch: r.State.Epoch, Expected: r.State.ControlRevision})
		if !r.Accepted {
			b.Fatal(r)
		}
	}
}

// Deterministic slow-reader fixture: after the handshake, stop making progress on
// this connection's writes until the WebSocket deadline closes it. This avoids
// depending on platform-specific TCP buffer sizes to exercise backpressure.
type gatedConn struct {
	net.Conn
	blocked atomic.Bool
	closed  chan struct{}
	once    sync.Once
}

func (c *gatedConn) Write(b []byte) (int, error) {
	if c.blocked.Load() {
		<-c.closed
		return 0, io.ErrClosedPipe
	}
	return c.Conn.Write(b)
}
func (c *gatedConn) Close() error {
	c.once.Do(func() { close(c.closed) })
	return c.Conn.Close()
}

type gatedListener struct {
	net.Listener
	accepted chan *gatedConn
}

func (l *gatedListener) Accept() (net.Conn, error) {
	c, err := l.Listener.Accept()
	if err != nil {
		return nil, err
	}
	g := &gatedConn{Conn: c, closed: make(chan struct{})}
	l.accepted <- g
	return g, nil
}
func TestStalledWriterRevokesOwnerWithoutBlockingOtherViewer(t *testing.T) {
	s := New(fstest.MapFS{"index.html": {Data: []byte("mock")}})
	ctx, cancel := context.WithCancel(context.Background())
	go s.Run(ctx)
	ts := httptest.NewUnstartedServer(s.Handler())
	gate := &gatedListener{Listener: ts.Listener, accepted: make(chan *gatedConn, 8)}
	ts.Listener = gate
	ts.Start()
	t.Cleanup(func() { cancel(); ts.Close() })
	owner, _ := dial(t, ts)
	conn := <-gate.accepted
	viewer, _ := dial(t, ts)
	<-gate.accepted
	r := send(t, owner, panel.Request{ID: 1, Type: "acquire"})
	r = send(t, owner, panel.Request{ID: 2, Type: "set", Control: "halt", Value: 0, Epoch: r.State.Epoch, Expected: r.State.ControlRevision})
	r = send(t, owner, panel.Request{ID: 3, Type: "pulse", Control: "continue", Epoch: r.State.Epoch, Expected: r.State.ControlRevision})
	if !r.Accepted || !r.State.Running {
		t.Fatal(r)
	}
	conn.blocked.Store(true)
	deadline := time.Now().Add(3 * time.Second)
	for {
		state := read(t, viewer, 0, "state").State
		if state.Owner == "" {
			if state.Running || !state.Halted {
				t.Fatal(state)
			}
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("stalled writer did not release owner")
		}
	}
	r = send(t, viewer, panel.Request{ID: 1, Type: "acquire"})
	if !r.Accepted {
		t.Fatal(r)
	}
}
