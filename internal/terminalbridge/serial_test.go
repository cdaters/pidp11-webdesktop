package terminalbridge

import (
	"io"
	"net"
	"testing"
	"time"
)

func serialFixture() SerialProfile {
	return SerialProfile{Simulator: "isolated-instance-1", Guest: "UNIX V7", Controller: "DC11", Line: 3, GuestDevice: "/dev/tty03", Application: "/bin/cu", Peer: "local peer", Framing: "ascii7-raw-socket"}
}
func TestSerialProfileRejectsContradictoryOrUnboundedIdentity(t *testing.T) {
	if err := serialFixture().Validate(); err != nil {
		t.Fatal(err)
	}
	for _, mutate := range []func(*SerialProfile){
		func(p *SerialProfile) { p.Controller = "DH11" }, func(p *SerialProfile) { p.Unit = 1 },
		func(p *SerialProfile) { p.Line = 16 }, func(p *SerialProfile) { p.GuestDevice = "/dev/tty02" },
		func(p *SerialProfile) { p.Simulator = "" }, func(p *SerialProfile) { p.Peer = "bad\nlabel" },
		func(p *SerialProfile) { p.Framing = "binary" }, func(p *SerialProfile) { p.Guest = "" },
	} {
		p := serialFixture()
		mutate(&p)
		if p.Validate() == nil {
			t.Fatalf("accepted %+v", p)
		}
	}
	if (SerialProfile{}).Validate() != nil {
		t.Fatal("ordinary terminal requires no profile")
	}
}
func TestSerialCountsAndObservationCannotRenewOwnership(t *testing.T) {
	e, peer := setup(t)
	e.Config.Serial = serialFixture()
	viewer, _ := e.Subscribe()
	frame(t, viewer, "state")
	if err := e.Operation(viewer, "acquire", 0, 0, nil, 0); err != nil {
		t.Fatal(err)
	}
	owned := frame(t, viewer, "state")
	received := make(chan string, 1)
	go func() {
		b := make([]byte, 3)
		_, err := io.ReadFull(peer, b)
		if err != nil {
			received <- "error"
		} else {
			received <- string(b)
		}
	}()
	if err := e.Operation(viewer, "input", owned.Epoch, 1, []byte("A\rB"), 0); err != nil {
		t.Fatal(err)
	}
	if <-received != "A\rB" {
		t.Fatal("transport altered input")
	}
	if _, err := peer.Write([]byte("C\nD")); err != nil {
		t.Fatal(err)
	}
	output := frame(t, viewer, "output")
	if string(output.Data) != "C\nD" {
		t.Fatal("transport altered output")
	}
	e.mu.Lock()
	deadline := e.until
	e.mu.Unlock()
	e.Operation(viewer, "status", 0, 0, nil, 0)
	state := frame(t, viewer, "state")
	if state.Serial == nil || state.Serial.Received != 3 || state.Serial.Written != 3 || state.Serial.Pending != 3 {
		t.Fatalf("counts %+v", state.Serial)
	}
	e.mu.Lock()
	if !e.until.Equal(deadline) {
		t.Error("observation renewed lease")
	}
	e.until = time.Now().Add(-time.Second)
	e.mu.Unlock()
	e.Operation(viewer, "status", 0, 0, nil, 0)
	expired := frame(t, viewer, "state")
	if expired.Owner {
		t.Fatal("observation kept expired owner")
	}
	if e.Operation(viewer, "input", owned.Epoch, 2, []byte("stale"), 0) == nil {
		t.Fatal("expired input accepted")
	}
}
func TestSerialCountSaturatesExactlyForBrowser(t *testing.T) {
	count := maxSerialCount - 1
	capped := false
	addSerialCount(&count, 3, &capped)
	if count != maxSerialCount || !capped {
		t.Fatal(count, capped)
	}
	addSerialCount(&count, 1, &capped)
	if count != maxSerialCount {
		t.Fatal(count)
	}
}

// A failed write can commit a prefix. Count only that prefix and retire the line.
type partialFailure struct{ net.Conn }

func (c partialFailure) Write(data []byte) (int, error) { return 2, io.ErrUnexpectedEOF }
func TestSerialIncompleteWriteIsCountedWithoutReplay(t *testing.T) {
	e := NewEndpoint(Config{Serial: serialFixture()})
	a, b := net.Pipe()
	if err := e.Attach(partialFailure{a}); err != nil {
		t.Fatal(err)
	}
	defer e.Close()
	defer b.Close()
	viewer, _ := e.Subscribe()
	frame(t, viewer, "state")
	e.Operation(viewer, "acquire", 0, 0, nil, 0)
	owned := frame(t, viewer, "state")
	if e.Operation(viewer, "input", owned.Epoch, 1, []byte("ABCDE"), 0) == nil {
		t.Fatal("uncertain write accepted")
	}
	e.mu.Lock()
	written := e.serialWritten
	e.mu.Unlock()
	if written != 2 || e.Connected() {
		t.Fatal(written, "uncertain connection retained")
	}
	if e.Operation(viewer, "input", owned.Epoch, 2, []byte("retry"), 0) == nil {
		t.Fatal("retired input accepted")
	}
}
