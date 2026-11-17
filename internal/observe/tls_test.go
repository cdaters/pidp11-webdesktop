package observe

import (
	"context"
	"crypto/tls"
	"github.com/coder/websocket"
	"net/http"
	"net/http/httptest"
	"pidp11.local/webdesktop/internal/access"
	"strings"
	"testing"
	"testing/fstest"
	"time"
)

func TestTLSWSSAndCredentialRevocation(t *testing.T) {
	token := strings.Repeat("d", 64)
	srv := httptest.NewUnstartedServer(nil)
	origin := "https://" + srv.Listener.Addr().String()
	g, e := access.NewSecure(origin, []access.Credential{{Token: token, Capabilities: []access.Capability{access.Observe}}})
	if e != nil {
		t.Fatal(e)
	}
	store := New()
	store.Accept(frame(time.Now(), 1), time.Now())
	srv.Config.Handler = NewServer(store, g).Handler(fstest.MapFS{})
	srv.TLS = &tls.Config{MinVersion: tls.VersionTLS13}
	srv.StartTLS()
	defer srv.Close()
	client := srv.Client()
	// httptest.Client trusts this test certificate through RootCAs, not a bypass.
	if client.Transport.(*http.Transport).TLSClientConfig.InsecureSkipVerify {
		t.Fatal("verification disabled")
	}
	r, _ := http.NewRequest("POST", origin+"/api/v1/login", strings.NewReader(`{"token":"`+token+`"}`))
	r.Header.Set("Origin", origin)
	resp, e := client.Do(r)
	if e != nil {
		t.Fatal(e)
	}
	resp.Body.Close()
	if resp.StatusCode != 200 || resp.TLS.Version != tls.VersionTLS13 {
		t.Fatal("TLS/login")
	}
	cookie := resp.Cookies()[0]
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	c, _, e := websocket.Dial(ctx, "wss"+strings.TrimPrefix(origin, "https")+"/api/v1/observe/ws", &websocket.DialOptions{HTTPClient: client, HTTPHeader: http.Header{"Origin": {origin}, "Cookie": {cookie.String()}}})
	if e != nil {
		t.Fatal(e)
	}
	defer c.CloseNow()
	if _, _, e = c.Read(ctx); e != nil {
		t.Fatal(e)
	}
	g.Revoke(access.Identity(token))
	for {
		if _, _, e = c.Read(ctx); e != nil {
			break
		}
	}
	if ctx.Err() != nil {
		t.Fatal("revoked stream did not close")
	}
	// A client restricted to TLS1.2 must fail the handshake.
	tr := client.Transport.(*http.Transport).Clone()
	tr.TLSClientConfig = tr.TLSClientConfig.Clone()
	tr.TLSClientConfig.MaxVersion = tls.VersionTLS12
	old := &http.Client{Transport: tr, Timeout: time.Second}
	if resp, e = old.Get(origin); e == nil {
		resp.Body.Close()
		t.Fatal("TLS1.2 accepted")
	}
}
