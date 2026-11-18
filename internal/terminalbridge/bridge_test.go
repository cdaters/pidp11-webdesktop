package terminalbridge

import (
	"context"
	"encoding/json"
	"github.com/coder/websocket"
	"io"
	"net"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"pidp11.local/webdesktop/internal/access"
	"pidp11.local/webdesktop/internal/web"
	"strings"
	"testing"
	"time"
)

func setup(t *testing.T) (*Endpoint, net.Conn) {
	t.Helper()
	e := NewEndpoint(Config{ID: "guest", Kind: "raw-guest-line", Address: "127.0.0.1:40000"})
	a, b := net.Pipe()
	if err := e.Attach(a); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { e.Close(); b.Close() })
	return e, b
}
func frame(t *testing.T, c *Client, typ string) Frame {
	t.Helper()
	timer := time.NewTimer(time.Second)
	defer timer.Stop()
	for {
		select {
		case f := <-c.out:
			if f.Type == typ {
				return f
			}
		case <-timer.C:
			t.Fatal("frame timeout")
			return Frame{}
		}
	}
}
func TestOwnershipOrderingExpiryAndNoReplay(t *testing.T) {
	e, guest := setup(t)
	a, _ := e.Subscribe()
	b, _ := e.Subscribe()
	frame(t, a, "state")
	frame(t, b, "state")
	if err := e.Operation(a, "input", 0, 1, []byte("bad"), 0); err == nil {
		t.Fatal("unowned input accepted")
	}
	e.Operation(a, "acquire", 0, 0, nil, 0)
	state := frame(t, a, "state")
	if !state.Owner {
		t.Fatal("no owner")
	}
	e.Operation(b, "acquire", 0, 0, nil, 0)
	if e.owner != a {
		t.Fatal("takeover")
	}
	data := make(chan string, 1)
	go func() { buf := make([]byte, 3); io.ReadFull(guest, buf); data <- string(buf) }()
	if err := e.Operation(a, "input", state.Epoch, 1, []byte("ls\r"), 0); err != nil {
		t.Fatal(err)
	}
	if <-data != "ls\r" {
		t.Fatal("byte ordering")
	}
	if e.Operation(a, "input", state.Epoch, 1, []byte("repeat"), 0) == nil {
		t.Fatal("replay accepted")
	}
	e.Operation(a, "release", 0, 0, nil, 0)
	if e.Operation(a, "input", state.Epoch, 2, []byte("old"), 0) == nil {
		t.Fatal("stale generation")
	}
	e.Operation(b, "acquire", 0, 0, nil, 0)
	e.mu.Lock()
	e.until = time.Now().Add(-time.Second)
	e.mu.Unlock()
	e.Tick()
	if e.owner != nil {
		t.Fatal("lease did not expire")
	}
	e.Unsubscribe(a)
	e.Unsubscribe(b)
	if !e.Connected() {
		t.Fatal("browser disconnected guest")
	}
}
func TestIndependentEndpointsAndOutputCredit(t *testing.T) {
	e, g := setup(t)
	other, _ := setup(t)
	a, _ := e.Subscribe()
	b, _ := other.Subscribe()
	e.Operation(a, "acquire", 0, 0, nil, 0)
	other.Operation(b, "acquire", 0, 0, nil, 0)
	if e.owner != a || other.owner != b {
		t.Fatal("cross-line ownership")
	}
	go func() { g.Write([]byte("\x1b[2")); g.Write([]byte("Jhello")) }()
	first := frame(t, a, "output")
	second := frame(t, a, "output")
	if string(first.Data)+string(second.Data) != "\x1b[2Jhello" {
		t.Fatal("split output changed")
	}
	if e.Operation(a, "ack", 0, 0, nil, 9) != nil {
		t.Fatal("valid ack")
	}
	if e.Operation(a, "ack", 0, 0, nil, 1) == nil {
		t.Fatal("excess ack")
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		for i := 0; i < 18; i++ {
			g.Write(make([]byte, 4096))
		}
	}()
	select {
	case <-a.done:
	case <-time.After(time.Second):
		t.Fatal("unacknowledged reader not disconnected")
	}
	<-done
	if !e.Connected() {
		t.Fatal("slow reader stopped endpoint")
	}
}
func TestBoundsAndMalformedInput(t *testing.T) {
	e, _ := setup(t)
	c, _ := e.Subscribe()
	e.Operation(c, "acquire", 0, 0, nil, 0)
	epoch := e.epoch
	for _, data := range [][]byte{nil, make([]byte, 257), {128}} {
		if e.Operation(c, "input", epoch, 1, data, 0) == nil {
			t.Fatal("invalid input accepted")
		}
	}
	if e.Operation(c, "shell", 0, 0, nil, 0) == nil {
		t.Fatal("unknown operation")
	}
	for i := 0; i < 7; i++ {
		if _, err := e.Subscribe(); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := e.Subscribe(); err == nil {
		t.Fatal("unbounded viewers")
	}
	for _, addr := range []string{"example.com:22", "192.0.2.1:22", "127.0.0.1:0", "127.0.0.1:99999"} {
		if Validate([]Config{{ID: "guest", Kind: "raw-guest-line", Address: addr}}) == nil {
			t.Fatal("invalid endpoint", addr)
		}
	}
}
func TestStalledWriteIsBoundedAndNeverReplayed(t *testing.T) {
	e, _ := setup(t)
	c, _ := e.Subscribe()
	e.Operation(c, "acquire", 0, 0, nil, 0)
	start := time.Now()
	if e.Operation(c, "input", e.epoch, 1, []byte("command\r"), 0) == nil {
		t.Fatal("stalled write accepted")
	}
	if time.Since(start) > time.Second || e.Connected() {
		t.Fatal("unbounded write or uncertain line retained")
	}
}

type shortConn struct{ net.Conn }

func (c shortConn) Write(b []byte) (int, error) {
	if len(b) > 1 {
		b = b[:1]
	}
	return c.Conn.Write(b)
}
func TestPartialWrites(t *testing.T) {
	e := NewEndpoint(Config{})
	a, b := net.Pipe()
	e.Attach(shortConn{a})
	defer e.Close()
	defer b.Close()
	c, _ := e.Subscribe()
	e.Operation(c, "acquire", 0, 0, nil, 0)
	received := make(chan string, 1)
	go func() { buf := make([]byte, 6); io.ReadFull(b, buf); received <- string(buf) }()
	if err := e.Operation(c, "input", e.epoch, 1, []byte("ABCDEF"), 0); err != nil {
		t.Fatal(err)
	}
	if <-received != "ABCDEF" {
		t.Fatal("partial writes reordered")
	}
}
func TestHTTPAuthorizationAndDisconnect(t *testing.T) {
	e, g := setup(t)
	bridge := &Bridge{Endpoints: map[string]*Endpoint{"guest": e}}
	writer := strings.Repeat("w", 32)
	reader := strings.Repeat("r", 32)
	gate := access.New([]access.Credential{{Token: writer, Capabilities: []access.Capability{access.TerminalObserve, access.TerminalInput}}, {Token: reader, Capabilities: []access.Capability{access.TerminalObserve}}})
	srv := httptest.NewServer((&Server{Bridge: bridge, Auth: gate}).Handler(web.Assets()))
	defer srv.Close()
	login := func(token string) *http.Client {
		jar, _ := cookiejar.New(nil)
		client := &http.Client{Jar: jar}
		req, _ := http.NewRequest("POST", srv.URL+"/api/v1/login", strings.NewReader(`{"token":"`+token+`"}`))
		req.Header.Set("Origin", srv.URL)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.StatusCode != 200 {
			t.Fatal("login", resp.StatusCode)
		}
		return client
	}
	for _, path := range []string{"/api/v1/terminals", "/api/v1/terminals/guest/ws", "/api/v1/commands"} {
		resp, _ := http.Get(srv.URL + path)
		resp.Body.Close()
		if resp.StatusCode != 403 {
			t.Fatal("unauthorized route", path)
		}
	}
	client := login(writer)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	dial := func(path, origin string, h *http.Client) (*websocket.Conn, *http.Response, error) {
		return websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http")+path, &websocket.DialOptions{HTTPClient: h, HTTPHeader: http.Header{"Origin": []string{origin}}})
	}
	if c, _, err := dial("/api/v1/terminals/guest/ws", "http://evil.example", client); err == nil {
		c.CloseNow()
		t.Fatal("cross origin")
	}
	if c, _, err := dial("/api/v1/terminals/missing/ws", srv.URL, client); err == nil {
		c.CloseNow()
		t.Fatal("arbitrary endpoint")
	}
	if c, _, err := dial("/api/v1/terminals/guest/ws?address=127.0.0.1:22", srv.URL, client); err == nil {
		c.CloseNow()
		t.Fatal("target parameter")
	}
	c, _, err := dial("/api/v1/terminals/guest/ws", srv.URL, client)
	if err != nil {
		t.Fatal(err)
	}
	defer c.CloseNow()
	_, data, err := c.Read(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var f Frame
	json.Unmarshal(data, &f)
	if f.Owner {
		t.Fatal("implicit ownership")
	}
	c.Write(ctx, websocket.MessageText, []byte(`{"type":"acquire"}`))
	_, data, _ = c.Read(ctx)
	json.Unmarshal(data, &f)
	if !f.Owner {
		t.Fatal("explicit acquisition")
	}
	c.CloseNow()
	time.Sleep(30 * time.Millisecond)
	if !e.Connected() {
		t.Fatal("websocket destroyed guest")
	}
	g.Write([]byte("alive")) // Guest output drains even with no observers.
	readOnly := login(reader)
	c2, _, err := dial("/api/v1/terminals/guest/ws", srv.URL, readOnly)
	if err != nil {
		t.Fatal(err)
	}
	c2.Read(ctx)
	c2.Write(ctx, websocket.MessageText, []byte(`{"type":"acquire"}`))
	if _, _, err = c2.Read(ctx); err == nil {
		t.Fatal("observer granted writer")
	}
	c2.CloseNow()
	for _, bad := range []string{strings.Repeat("x", 2048), `{"type":"input","data":"invalid base64"}`, `{`, `{"type":"ack","bytes":1}`, `{"type":"acquire","unknown":true}`, `{"type":"renew"} {}`} {
		c3, _, err := dial("/api/v1/terminals/guest/ws", srv.URL, client)
		if err != nil {
			t.Fatal(err)
		}
		c3.Read(ctx)
		c3.Write(ctx, websocket.MessageText, []byte(bad))
		if _, _, err = c3.Read(ctx); err == nil {
			t.Fatal("malformed frame accepted", bad)
		}
		c3.CloseNow()
	}
}

func TestGuestEOFAndRepeatedViewers(t *testing.T) {
	e, guest := setup(t)
	for i := 0; i < 40; i++ {
		c, err := e.Subscribe()
		if err != nil {
			t.Fatal(err)
		}
		e.Operation(c, "acquire", 0, 0, nil, 0)
		e.Unsubscribe(c)
		if !e.Connected() {
			t.Fatal("guest tied to browser lifecycle")
		}
	}
	c, _ := e.Subscribe()
	frame(t, c, "state")
	guest.Close()
	state := frame(t, c, "state")
	if state.Connected || state.Owner {
		t.Fatal("EOF retained connected ownership")
	}
	if e.Operation(c, "input", state.Epoch, 1, []byte("x"), 0) == nil {
		t.Fatal("input after EOF")
	}
}
func TestLeaseExpiresWithoutInjectingBytes(t *testing.T) {
	e, guest := setup(t)
	c, _ := e.Subscribe()
	e.Operation(c, "acquire", 0, 0, nil, 0)
	e.mu.Lock()
	e.until = time.Now().Add(-time.Second)
	e.mu.Unlock()
	e.Tick()
	guest.SetReadDeadline(time.Now().Add(20 * time.Millisecond))
	buf := make([]byte, 1)
	if n, _ := guest.Read(buf); n != 0 {
		t.Fatal("expiry injected terminal bytes")
	}
}
func FuzzConfig(f *testing.F) {
	f.Add(`[{"id":"guest","label":"Guest","address":"127.0.0.1:40100","kind":"raw-guest-line"}]`)
	f.Add(`{`)
	f.Fuzz(func(t *testing.T, s string) {
		if len(s) > 16384 {
			return
		}
		DecodeConfig(strings.NewReader(s))
	})
}

func TestInputRateLimitAndRecovery(t *testing.T) {
	e, guest := setup(t)
	now := time.Now()
	e.Now = func() time.Time { return now }
	c, _ := e.Subscribe()
	e.Operation(c, "acquire", 0, 0, nil, 0)
	epoch := e.epoch
	go io.Copy(io.Discard, guest)
	for i := uint64(1); i <= 16; i++ {
		if err := e.Operation(c, "input", epoch, i, make([]byte, 256), 0); err != nil {
			t.Fatal(err)
		}
	}
	if e.Operation(c, "input", epoch, 17, []byte("x"), 0) == nil {
		t.Fatal("rate limit bypassed")
	}
	now = now.Add(time.Second)
	if err := e.Operation(c, "input", epoch, 17, []byte("x"), 0); err != nil {
		t.Fatal("new rate window rejected", err)
	}
}
