package terminalservice

import (
	"context"
	"net"
	"sync"
	"testing"
	"time"
)

func supervised(t *testing.T) (*Manager, Approval, net.Conn) {
	t.Helper()
	m := manager(t)
	m.lines["guest"].supervised = true
	a := approval(m)
	a.Supervision = &Supervision{Process: "observed-process-lifetime", Endpoint: "observed-listener-inode", OperatorEpoch: "explicit-operator-epoch"}
	left, right := net.Pipe()
	m.dial = func(context.Context, string, string) (net.Conn, error) { return left, nil }
	t.Cleanup(func() { right.Close() })
	return m, a, right
}
func renewal(m *Manager) Renewal {
	s := m.Status()
	l := s.Lines[0]
	r := Renewal{Instance: s.Instance, ID: l.ID, Revision: l.Revision, Sequence: l.Sequence + 1}
	if l.Supervision != nil {
		r.Supervision = *l.Supervision
	}
	return r
}
func TestSupervisionRequiresConnectedSocketVerification(t *testing.T) {
	m, a, _ := supervised(t)
	missing := a
	missing.Supervision = nil
	if m.Attach(context.Background(), missing) == nil {
		t.Fatal("manual bypass")
	}
	if err := m.Attach(context.Background(), a); err != nil {
		t.Fatal(err)
	}
	generation := m.List()[0].Generation
	if m.Lookup("guest", generation) != nil || m.List()[0].Connected {
		t.Fatal("unverified socket published")
	}
	r := renewal(m)
	if err := m.Renew(r); err != nil {
		t.Fatal(err)
	}
	if m.Lookup("guest", generation) == nil {
		t.Fatal("verified line unavailable")
	}
	if m.Renew(r) == nil {
		t.Fatal("replayed renewal")
	}
	r = renewal(m)
	r.Sequence++
	if m.Renew(r) == nil {
		t.Fatal("out-of-order renewal")
	}
	r = renewal(m)
	r.Supervision.Process = "replacement-process-lifetime"
	if m.Renew(r) == nil {
		t.Fatal("changed producer")
	}
	r = renewal(m)
	r.Supervision.OperatorEpoch = "changed-guest-operator-epoch"
	if m.Renew(r) == nil {
		t.Fatal("guest change inherited approval")
	}
}
func TestSupervisionExpiryPermanentlyRetiresOldEndpoint(t *testing.T) {
	m, a, peer := supervised(t)
	if err := m.Attach(context.Background(), a); err != nil {
		t.Fatal(err)
	}
	if err := m.Renew(renewal(m)); err != nil {
		t.Fatal(err)
	}
	generation := m.List()[0].Generation
	old := m.Lookup("guest", generation)
	r := renewal(m)
	m.mu.Lock()
	m.lines["guest"].deadline = time.Now().Add(-time.Second)
	m.mu.Unlock()
	if m.Renew(r) == nil || old.Connected() || m.Lookup("guest", generation) != nil {
		t.Fatal("expired authority survived")
	}
	peer.SetReadDeadline(time.Now().Add(time.Second))
	if _, err := peer.Read(make([]byte, 1)); err == nil {
		t.Fatal("socket retained")
	}
	if m.Attach(context.Background(), a) == nil {
		t.Fatal("stale approval replay")
	}
	if m.Status().Lines[0].Supervision != nil {
		t.Fatal("old proof retained")
	}
}
func TestConcurrentRenewalHasOnlyOneWinner(t *testing.T) {
	m, a, _ := supervised(t)
	if err := m.Attach(context.Background(), a); err != nil {
		t.Fatal(err)
	}
	r := renewal(m)
	results := make(chan error, 2)
	var wg sync.WaitGroup
	for range 2 {
		wg.Add(1)
		go func() { defer wg.Done(); results <- m.Renew(r) }()
	}
	wg.Wait()
	close(results)
	wins := 0
	for err := range results {
		if err == nil {
			wins++
		}
	}
	if wins != 1 {
		t.Fatal(wins)
	}
	if err := m.Detach(approval(m)); err != nil {
		t.Fatal(err)
	}
	if m.Renew(renewal(m)) == nil {
		t.Fatal("renewal attached detached line")
	}
}
func TestSupervisionExpiresWhileDialBlocked(t *testing.T) {
	m, a, _ := supervised(t)
	entered, release := make(chan struct{}), make(chan struct{})
	dial := m.dial
	m.dial = func(ctx context.Context, n, address string) (net.Conn, error) {
		close(entered)
		<-release
		return dial(ctx, n, address)
	}
	result := make(chan error, 1)
	go func() { result <- m.Attach(context.Background(), a) }()
	<-entered
	m.mu.Lock()
	m.lines["guest"].deadline = time.Now().Add(-time.Second)
	m.mu.Unlock()
	if m.Status().Lines[0].State != "unavailable" {
		t.Fatal("pending approval survived")
	}
	close(release)
	if <-result == nil {
		t.Fatal("late dial published")
	}
}
