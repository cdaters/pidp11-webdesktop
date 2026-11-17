package consumer

import (
	"fmt"
	"net"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestAuthorityProtocol(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("Linux unixpacket protocol; exercised in disposable lab")
	}
	path := filepath.Join(t.TempDir(), "authority")
	listener, e := net.ListenUnix("unixpacket", &net.UnixAddr{Name: path, Net: "unixpacket"})
	if e != nil {
		t.Fatal(e)
	}
	defer listener.Close()
	done := make(chan struct{})
	defer func() { listener.Close(); <-done }()
	go func() {
		defer close(done)
		generation := uint64(123)
		armed := 0
		for {
			conn, e := listener.Accept()
			if e != nil {
				return
			}
			b := make([]byte, 128)
			n, _ := conn.Read(b)
			cmd := string(b[:n])
			ok := 1
			switch {
			case cmd == "STATUS":
			case cmd == fmt.Sprintf("ARM %d", generation) && armed == 0:
				generation++
				armed = 1
			case cmd == fmt.Sprintf("PING %d", generation) && armed == 1:
			case cmd == "REVOKE":
				generation++
				armed = 0
			default:
				ok = 0
			}
			fmt.Fprintf(conn, `{"ok":%d,"generation":%d,"armed":%d,"quiescent":1}`, ok, generation, armed)
			conn.Close()
		}
	}()
	c := &Client{Path: path}
	if !c.Ready() {
		t.Fatal("not ready")
	}
	if e = c.Arm(); e != nil {
		t.Fatal(e)
	}
	if c.Ready() {
		t.Fatal("armed considered ready")
	}
	if e = c.Heartbeat(); e != nil {
		t.Fatal(e)
	}
	if e = c.Revoke(); e != nil {
		t.Fatal(e)
	}
	if e = c.Heartbeat(); e == nil {
		t.Fatal("revoked ping accepted")
	}
	if !c.Ready() {
		t.Fatal("not quiescent")
	}
}
func TestUnavailableAuthority(t *testing.T) {
	c := &Client{Path: filepath.Join(t.TempDir(), "absent")}
	start := time.Now()
	if c.Ready() || c.Arm() == nil || c.Revoke() == nil || c.Heartbeat() == nil {
		t.Fatal("missing authority accepted")
	}
	if time.Since(start) > time.Second {
		t.Fatal("unbounded authority call")
	}
	_, e := c.request(strings.Repeat("x", 200))
	if e == nil {
		t.Fatal("absent authority")
	}
}
