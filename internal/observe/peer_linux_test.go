//go:build linux

package observe

import (
	"context"
	"encoding/json"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
	"testing"
	"time"
)

func TestPeerHelper(t *testing.T) {
	path := os.Getenv("PIDP43_SEND_PATH")
	if path == "" {
		return
	}
	b := make([]byte, 1)
	os.Stdin.Read(b)
	c, e := net.DialUnix("unixgram", nil, &net.UnixAddr{Name: path, Net: "unixgram"})
	if e != nil {
		os.Exit(3)
	}
	defer c.Close()
	_, e = c.Write(frame(time.Now(), 1))
	if e != nil {
		os.Exit(3)
	}
	os.Stdin.Read(b)
	os.Exit(0)
}
func TestKernelPublisherIdentity(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "state.sock")
	p, e := PinPublisher(uint32(os.Geteuid()), os.Getpid())
	if e != nil {
		t.Fatal(e)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	s := New()
	errc := make(chan error, 1)
	go func() { errc <- s.ListenVerified(ctx, path, p, -1) }()
	for i := 0; i < 100; i++ {
		if _, e = os.Stat(path); e == nil {
			break
		}
		time.Sleep(time.Millisecond)
	}
	helper := exec.Command(os.Args[0], "-test.run=^TestPeerHelper$")
	helper.Env = append(os.Environ(), "PIDP43_SEND_PATH="+path)
	helper.Stdin = nil
	if e = helper.Run(); e != nil {
		t.Fatal(e)
	}
	time.Sleep(10 * time.Millisecond)
	if s.Snapshot(time.Now()).Available || s.Snapshot(time.Now()).Rejected != 1 {
		t.Fatal("same UID wrong PID accepted")
	}
	c, e := net.DialUnix("unixgram", nil, &net.UnixAddr{Name: path, Net: "unixgram"})
	if e != nil {
		t.Fatal(e)
	}
	defer c.Close()
	c.Write(frame(time.Now(), 1))
	for i := 0; i < 100 && !s.Snapshot(time.Now()).Available; i++ {
		time.Sleep(time.Millisecond)
	}
	if !s.Snapshot(time.Now()).Fresh {
		t.Fatal("pinned publisher rejected")
	}
	cancel()
	if e = <-errc; e != nil {
		t.Fatal(e)
	}
}
func TestDifferentUIDPublisher(t *testing.T) {
	if os.Geteuid() != 0 {
		t.Skip("isolated lab root/setuid fixture")
	}
	dir := "/tmp/pidp43-peer-" + strconv.Itoa(os.Getpid())
	if e := os.Mkdir(dir, 0750); e != nil {
		t.Fatal(e)
	}
	defer os.RemoveAll(dir)
	path := filepath.Join(dir, "state.sock")
	helper := exec.Command(os.Args[0], "-test.run=^TestPeerHelper$")
	helper.Env = append(os.Environ(), "PIDP43_SEND_PATH="+path)
	helper.SysProcAttr = &syscall.SysProcAttr{Credential: &syscall.Credential{Uid: 65534, Gid: 0}}
	stdin, _ := helper.StdinPipe()
	if e := helper.Start(); e != nil {
		t.Fatal(e)
	}
	defer helper.Process.Kill()
	p, e := PinPublisher(65534, helper.Process.Pid)
	if e != nil {
		t.Fatal(e)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	s := New()
	errc := make(chan error, 1)
	go func() { errc <- s.ListenVerified(ctx, path, p, 0) }()
	for i := 0; i < 100; i++ {
		if _, e = os.Stat(path); e == nil {
			break
		}
		time.Sleep(time.Millisecond)
	}
	stdin.Write([]byte{1})
	for i := 0; i < 100 && !s.Snapshot(time.Now()).Available; i++ {
		time.Sleep(time.Millisecond)
	}
	snap := s.Snapshot(time.Now())
	b, _ := json.Marshal(snap)
	if !snap.Available {
		t.Fatal(string(b))
	}
	stdin.Close()
	helper.Wait()
	cancel()
	if e = <-errc; e != nil {
		t.Fatal(e)
	}
}
