package localmodem

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"strings"
	"testing"
	"time"

	"pidp11.local/webdesktop/internal/terminalbridge"
	"pidp11.local/webdesktop/internal/terminalservice"
)

func testConfig() terminalbridge.Config {
	return terminalbridge.Config{ID: "test", Label: "Isolated fixture", Kind: "raw-guest-line", Address: "127.0.0.1:40103", Serial: terminalbridge.SerialProfile{Simulator: "fixture-instance-0001", Guest: "UNIX V7", Controller: "DC11", Line: 3, GuestDevice: "/dev/tty03", Application: "fixture", Peer: "LOCAL", Framing: "ascii7-raw-socket"}}
}
func TestFixedConfigurationRejectsWrongLineAndController(t *testing.T) {
	for _, change := range []func(*terminalbridge.Config){func(c *terminalbridge.Config) { c.Address = "127.0.0.1:22" }, func(c *terminalbridge.Config) { c.Serial.Controller = "DZ11" }, func(c *terminalbridge.Config) { c.Serial.Line = 2; c.Serial.GuestDevice = "/dev/tty02" }, func(c *terminalbridge.Config) { c.Serial.Guest = "other" }, func(c *terminalbridge.Config) { c.Serial.Simulator = "bad" }} {
		c := testConfig()
		change(&c)
		if r, err := NewRunner(c); err == nil {
			r.Manager.Close()
			t.Fatal("invalid mapping accepted")
		}
	}
}
func TestRunnerPeerLossRevocationAndFreshStartup(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:40103")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	peerListener, err := net.Listen("tcp", "127.0.0.1:40200")
	if err != nil {
		t.Fatal(err)
	}
	defer peerListener.Close()
	runner, err := NewRunner(testConfig())
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { defer close(done); runner.Run(ctx) }()
	defer func() { cancel(); <-done }()
	if runner.Observe().GuestConnected || runner.Manager.Status().Lines[0].State != "detached" {
		t.Fatal("automatic attachment")
	}
	status := runner.Manager.Status()
	proof := terminalservice.Supervision{Process: "fixture-process-0001", Endpoint: "fixture-listener-0001", OperatorEpoch: "fixture-operator-0001"}
	approval := terminalservice.Approval{Instance: status.Instance, ID: "test", Revision: 0, Confirmed: true, Supervision: &proof}
	if err := runner.Manager.Attach(ctx, approval); err != nil {
		t.Fatal(err)
	}
	guest, err := listener.Accept()
	if err != nil {
		t.Fatal(err)
	}
	defer guest.Close()
	attached := runner.Manager.Status()
	revision := attached.Lines[0].Revision
	renewal := terminalservice.Renewal{Instance: status.Instance, ID: "test", Revision: revision, Sequence: 1, Supervision: proof}
	if runner.Manager.ActorClient("test", status.Instance+"-1") != nil {
		t.Fatal("unverified actor exposed")
	}
	guest.SetWriteDeadline(time.Now().Add(time.Second))
	if _, err := io.WriteString(guest, "AT\r"); err != nil {
		t.Fatal(err)
	}
	guest.SetReadDeadline(time.Now().Add(30 * time.Millisecond))
	if n, _ := guest.Read(make([]byte, 8)); n != 0 {
		t.Fatal("unapproved actor replied")
	}
	if err := runner.Manager.Renew(renewal); err != nil {
		t.Fatal(err)
	}
	wrong := renewal
	wrong.Sequence = 2
	wrong.Supervision.Process = "different-process-0001"
	if runner.Manager.Renew(wrong) == nil {
		t.Fatal("changed producer accepted")
	}
	stopRenew := make(chan struct{})
	renewDone := make(chan struct{})
	go func() {
		defer close(renewDone)
		tick := time.NewTicker(100 * time.Millisecond)
		defer tick.Stop()
		for {
			select {
			case <-stopRenew:
				return
			case <-tick.C:
				renewal.Sequence++
				if runner.Manager.Renew(renewal) != nil {
					return
				}
			}
		}
	}()
	stopped := false
	defer func() {
		if !stopped {
			close(stopRenew)
		}
		<-renewDone
	}()
	read := func(expected string) {
		t.Helper()
		guest.SetReadDeadline(time.Now().Add(2 * time.Second))
		buffer := make([]byte, len(expected))
		if _, err := io.ReadFull(guest, buffer); err != nil || string(buffer) != expected {
			t.Fatalf("read %q: %q %v", expected, buffer, err)
		}
	}
	write := func(data string) {
		t.Helper()
		guest.SetWriteDeadline(time.Now().Add(time.Second))
		if _, err := io.WriteString(guest, data); err != nil {
			t.Fatal(err)
		}
	}
	read("\r\nOK\r\n")
	write("ATDLOCAL\r")
	peer, err := peerListener.Accept()
	if err != nil {
		t.Fatal(err)
	}
	defer peer.Close()
	read("\r\nCONNECT\r\n")
	write("guest message\n")
	peer.SetReadDeadline(time.Now().Add(time.Second))
	payload := make([]byte, 14)
	if _, err := io.ReadFull(peer, payload); err != nil || string(payload) != "guest message\n" {
		t.Fatal(string(payload), err)
	}
	io.WriteString(peer, "separate reply\n")
	read("separate reply\n")
	peer.Close()
	read("\r\nNO CARRIER\r\n")
	write("AT\r")
	read("\r\nOK\r\n")
	close(stopRenew)
	stopped = true
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) && runner.Observe().GuestConnected {
		time.Sleep(20 * time.Millisecond)
	}
	if runner.Observe().GuestConnected {
		t.Fatal("expired approval remains attached")
	}
	if runner.Manager.Renew(renewal) == nil {
		t.Fatal("expired proof revived")
	}
	before := runner.Observe()
	time.Sleep(100 * time.Millisecond)
	if runner.Observe().Generation != before.Generation {
		t.Fatal("silent reconnect")
	}
	fresh, err := NewRunner(testConfig())
	if err != nil {
		t.Fatal(err)
	}
	defer fresh.Manager.Close()
	if fresh.Observe().GuestConnected || fresh.Manager.Status().Instance == status.Instance {
		t.Fatal("restart retained authority")
	}
	encoded, _ := json.Marshal(runner.Observe())
	if strings.Contains(string(encoded), "separate reply") {
		t.Fatal("snapshot contains transcript")
	}
}

// A deterministic transport fault proves a committed prefix is counted once.
// It is not evidence of guest binary transparency or physical flow control.
type prefixFailure struct {
	net.Conn
	written int
}

func (c *prefixFailure) Write(p []byte) (int, error) {
	if c.written >= 2 {
		return 0, io.ErrUnexpectedEOF
	}
	n := min(len(p), 2-c.written)
	c.written += n
	return n, nil
}
func TestRunnerSlowAndPartialPeerRetireWithoutReplay(t *testing.T) {
	for _, partial := range []bool{false, true} {
		t.Run(map[bool]string{false: "slow", true: "partial"}[partial], func(t *testing.T) {
			listener, err := net.Listen("tcp", "127.0.0.1:40103")
			if err != nil {
				t.Fatal(err)
			}
			defer listener.Close()
			runner, err := NewRunner(testConfig())
			if err != nil {
				t.Fatal(err)
			}
			a, b := net.Pipe()
			defer b.Close()
			runner.dialPeer = func(context.Context) (net.Conn, error) {
				if partial {
					return &prefixFailure{Conn: a}, nil
				}
				return a, nil
			}
			ctx, cancel := context.WithCancel(context.Background())
			done := make(chan struct{})
			go func() { defer close(done); runner.Run(ctx) }()
			defer func() { cancel(); <-done }()
			status := runner.Manager.Status()
			proof := terminalservice.Supervision{Process: "fixture-process-0001", Endpoint: "fixture-listener-0001", OperatorEpoch: "fixture-operator-0001"}
			if err := runner.Manager.Attach(ctx, terminalservice.Approval{Instance: status.Instance, ID: "test", Confirmed: true, Supervision: &proof}); err != nil {
				t.Fatal(err)
			}
			guest, err := listener.Accept()
			if err != nil {
				t.Fatal(err)
			}
			defer guest.Close()
			revision := runner.Manager.Status().Lines[0].Revision
			if err := runner.Manager.Renew(terminalservice.Renewal{Instance: status.Instance, ID: "test", Revision: revision, Sequence: 1, Supervision: proof}); err != nil {
				t.Fatal(err)
			}
			guest.SetDeadline(time.Now().Add(time.Second))
			io.WriteString(guest, "ATDLOCAL\r")
			reply := make([]byte, len("\r\nCONNECT\r\n"))
			if _, err := io.ReadFull(guest, reply); err != nil {
				t.Fatal(err)
			}
			io.WriteString(guest, "ABC\n")
			deadline := time.Now().Add(700 * time.Millisecond)
			for time.Now().Before(deadline) && runner.Observe().GuestConnected {
				time.Sleep(10 * time.Millisecond)
			}
			s := runner.Observe()
			if s.GuestConnected || !strings.Contains(s.Reason, "peer write failed") {
				t.Fatal(s)
			}
			expected := uint64(0)
			if partial {
				expected = 2
			}
			if s.PeerWritten != expected {
				t.Fatal("wrong committed prefix", s)
			}
		})
	}
}
