package terminalservice

import (
	"net"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestLocalControlRejectsMalformedAndStale(t *testing.T) {
	m := manager(t)
	for _, body := range []string{`{}`, `{"id":"guest","instance":"old","guest_and_line_verified":true}`, `{"id":"guest","extra":true}`, strings.Repeat("x", 1025), `{} {}`} {
		r := httptest.NewRequest("POST", "/attach", strings.NewReader(body))
		w := httptest.NewRecorder()
		m.ControlHandler().ServeHTTP(w, r)
		if w.Code == 200 {
			t.Fatal("accepted invalid approval")
		}
	}
}
func TestPrivateInputsAndControlSocket(t *testing.T) {
	dir, err := os.MkdirTemp("/tmp", "m551-control-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	if err := os.Chmod(dir, 0700); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "private")
	if err := os.WriteFile(path, []byte("test"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := ReadPrivate(path); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(dir, "link")
	if err := os.Symlink(path, link); err != nil {
		t.Fatal(err)
	}
	if _, err := ReadPrivate(link); err == nil {
		t.Fatal("symlink accepted")
	}
	os.Chmod(path, 0644)
	if _, err := ReadPrivate(path); err == nil {
		t.Fatal("public file accepted")
	}
	os.Chmod(path, 0600)
	os.WriteFile(path, make([]byte, 16385), 0600)
	if _, err := ReadPrivate(path); err == nil {
		t.Fatal("oversize accepted")
	}
	socket := filepath.Join(dir, "control.sock")
	listener, err := ControlListener(socket)
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	if _, err = ControlListener(socket); err == nil {
		t.Fatal("existing socket replaced")
	}
	info, _ := os.Stat(socket)
	if info.Mode().Perm() != 0600 {
		t.Fatal("socket permissions")
	}
	os.Chmod(dir, 0755)
	if _, err = ControlListener(filepath.Join(dir, "unsafe.sock")); err == nil {
		t.Fatal("public control directory")
	}
}

func TestListenerBoundsAndReleases(t *testing.T) {
	raw, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	limited := LimitListener(raw, 1)
	defer limited.Close()
	accepted := make(chan net.Conn, 2)
	go func() {
		for {
			conn, err := limited.Accept()
			if err != nil {
				return
			}
			accepted <- conn
		}
	}()
	first, err := net.Dial("tcp", raw.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer first.Close()
	server := <-accepted
	second, err := net.Dial("tcp", raw.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer second.Close()
	second.SetReadDeadline(time.Now().Add(time.Second))
	if _, err = second.Read(make([]byte, 1)); err == nil {
		t.Fatal("excess connection retained")
	}
	server.Close()
	server.Close()
	third, err := net.Dial("tcp", raw.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer third.Close()
	select {
	case conn := <-accepted:
		conn.Close()
	case <-time.After(time.Second):
		t.Fatal("slot not released")
	}
}

func TestStaleControlSocketRequiresExplicitStoppedRecovery(t *testing.T) {
	dir, err := os.MkdirTemp("/tmp", "m514-socket-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	path := filepath.Join(dir, "control.sock")
	listener, err := ControlListener(path)
	if err != nil {
		t.Fatal(err)
	}
	listener.(*net.UnixListener).SetUnlinkOnClose(false)
	listener.Close() // Retain the same artifact left by forced process termination.
	before, err := os.Lstat(path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ControlListener(path); err == nil || !strings.Contains(err.Error(), "verify the companion is stopped") {
		t.Fatal("stale socket silently replaced or no recovery guidance", err)
	}
	after, err := os.Lstat(path)
	if err != nil || !os.SameFile(before, after) {
		t.Fatal("stale evidence changed")
	}
	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
	replacement, err := ControlListener(path)
	if err != nil {
		t.Fatal(err)
	}
	replacement.Close()
}

// Root can bind inside another account's 0700 directory. Permissions alone do
// not protect the control socket from that directory owner replacing its path.
func TestControlRejectsForeignOwner(t *testing.T) {
	if os.Geteuid() != 0 {
		t.Skip("requires disposable Linux root for chown")
	}
	dir := t.TempDir()
	if err := os.Chmod(dir, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.Chown(dir, 65534, 65534); err != nil {
		t.Fatal(err)
	}
	listener, err := ControlListener(filepath.Join(dir, "control.sock"))
	if err == nil {
		listener.Close()
		t.Fatal("foreign-owned private directory accepted")
	}
	if !strings.Contains(err.Error(), "owned by the service account") {
		t.Fatalf("expected owner refusal, got %v", err)
	}
	// UID 0 in a capability-restricted container may lack DAC override. Restore
	// ownership of only this test directory before inspecting its contents;
	// EACCES from Lstat is not evidence that a refused socket was created.
	if err := os.Chown(dir, os.Geteuid(), os.Getegid()); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Lstat(filepath.Join(dir, "control.sock")); !os.IsNotExist(err) {
		t.Fatalf("refused control path was created or could not be inspected: %v", err)
	}
}

func TestPrivateFileRejectsForeignOwner(t *testing.T) {
	if os.Geteuid() != 0 {
		t.Skip("requires disposable Linux root for chown")
	}
	path := filepath.Join(t.TempDir(), "foreign")
	if err := os.WriteFile(path, []byte("not a trusted credential"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Chown(path, 65534, 65534); err != nil {
		t.Fatal(err)
	}
	if _, err := ReadPrivate(path); err == nil {
		t.Fatal("foreign-owned credential accepted")
	}
}
