package terminalservice

import (
	"context"
	"net"
	"pidp11.local/webdesktop/internal/terminalbridge"
	"sync/atomic"
	"testing"
	"time"
)

func manager(t *testing.T) *Manager {
	t.Helper()
	m, e := New([]terminalbridge.Config{{ID: "guest", Label: "Configured guest", Address: "127.0.0.1:40100", Kind: "raw-guest-line"}})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(m.Close)
	return m
}
func approval(m *Manager) Approval {
	s := m.Status()
	return Approval{Instance: s.Instance, ID: "guest", Revision: s.Lines[0].Revision, Confirmed: true}
}
func TestDetachedAndGenerationFences(t *testing.T) {
	m := manager(t)
	var dials atomic.Int32
	var peer net.Conn
	m.dial = func(context.Context, string, string) (net.Conn, error) {
		dials.Add(1)
		a, b := net.Pipe()
		peer = b
		return a, nil
	}
	a := approval(m)
	oldChoice := m.List()[0].Generation
	if m.Lookup("guest", oldChoice) != nil || dials.Load() != 0 {
		t.Fatal("startup dial or attachment")
	}
	if err := m.Attach(context.Background(), a); err != nil {
		t.Fatal(err)
	}
	defer peer.Close()
	attached := m.List()[0].Generation
	old := m.Lookup("guest", attached)
	if old == nil || m.Lookup("guest", oldChoice) != nil || m.Lookup("guest", "") != nil {
		t.Fatal("generation not pinned")
	}
	if err := m.Attach(context.Background(), a); err == nil {
		t.Fatal("approval replay")
	}
	if err := m.Detach(approval(m)); err != nil {
		t.Fatal(err)
	}
	if old.Connected() || m.Lookup("guest", attached) != nil {
		t.Fatal("retired endpoint visible")
	}
	if err := m.Attach(context.Background(), approval(m)); err != nil {
		t.Fatal(err)
	}
	defer peer.Close()
	if m.Lookup("guest", attached) != nil || dials.Load() != 2 {
		t.Fatal("old browser followed replacement")
	}
	fresh := manager(t)
	if fresh.Status().Instance == m.Status().Instance {
		t.Fatal("instance reused")
	}
	if err := fresh.Attach(context.Background(), approval(m)); err == nil {
		t.Fatal("restart restored approval")
	}
}
func TestDetachDuringDial(t *testing.T) {
	m := manager(t)
	entered, release := make(chan struct{}), make(chan struct{})
	a, b := net.Pipe()
	defer b.Close()
	m.dial = func(context.Context, string, string) (net.Conn, error) { close(entered); <-release; return a, nil }
	result := make(chan error, 1)
	go func() { result <- m.Attach(context.Background(), approval(m)) }()
	<-entered
	if err := m.Detach(approval(m)); err != nil {
		t.Fatal(err)
	}
	close(release)
	if err := <-result; err == nil {
		t.Fatal("stale dial published")
	}
	b.SetReadDeadline(time.Now().Add(time.Second))
	if _, err := b.Read(make([]byte, 1)); err == nil {
		t.Fatal("connection leaked")
	}
	if m.List()[0].State != "detached" {
		t.Fatal(m.List())
	}
}
func TestGuestEOFRetiresAndConsumesApproval(t *testing.T) {
	m := manager(t)
	a, b := net.Pipe()
	m.dial = func(context.Context, string, string) (net.Conn, error) { return a, nil }
	request := approval(m)
	if err := m.Attach(context.Background(), request); err != nil {
		t.Fatal(err)
	}
	generation := m.List()[0].Generation
	b.Close()
	deadline := time.Now().Add(time.Second)
	for m.List()[0].State == "attached" && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if m.List()[0].State != "unavailable" || m.Lookup("guest", generation) != nil {
		t.Fatal("EOF not retired")
	}
	if err := m.Attach(context.Background(), request); err == nil {
		t.Fatal("approval reused")
	}
}
