package terminalbridge

import (
	"context"
	"io"
	"net"
	"testing"
	"time"
)

// These loopback fixtures deliberately reuse a port for a different peer. They
// test attachment fencing, not the identity or boot state of a real guest OS.
func TestReplacementListenerRequiresFreshBridge(t *testing.T) {
	first, err := net.ListenTCP("tcp4", &net.TCPAddr{IP: net.IPv4(127, 0, 0, 1)})
	if err != nil {
		t.Fatal(err)
	}
	defer first.Close()
	config := Config{ID: "guest", Kind: "raw-guest-line", Address: first.Addr().String()}
	bridge, err := New([]Config{config})
	if err != nil {
		t.Fatal(err)
	}
	defer bridge.Close()
	if err := bridge.Connect(context.Background()); err != nil {
		t.Fatal(err)
	}
	first.SetDeadline(time.Now().Add(time.Second))
	guest, err := first.Accept()
	if err != nil {
		t.Fatal(err)
	}
	defer guest.Close()
	endpoint := bridge.Endpoints["guest"]
	viewer, err := endpoint.Subscribe()
	if err != nil {
		t.Fatal(err)
	}
	frame(t, viewer, "state")
	if err := endpoint.Operation(viewer, "acquire", 0, 0, nil, 0); err != nil {
		t.Fatal(err)
	}
	owned := frame(t, viewer, "state")
	if !owned.Owner {
		t.Fatal("initial ownership missing")
	}
	if err := bridge.Connect(context.Background()); err == nil || !endpoint.Connected() {
		t.Fatal("duplicate setup must fail without disturbing the active attachment")
	}
	guest.Close()
	detached := frame(t, viewer, "state")
	if detached.Connected || detached.Owner || detached.Epoch <= owned.Epoch {
		t.Fatal("guest loss did not revoke authority")
	}
	first.Close()
	replacement, err := net.ListenTCP("tcp4", first.Addr().(*net.TCPAddr))
	if err != nil {
		t.Fatal(err)
	}
	defer replacement.Close()
	if err := bridge.Connect(context.Background()); err == nil {
		t.Fatal("retired bridge dialed a reused address")
	}
	replacement.SetDeadline(time.Now().Add(30 * time.Millisecond))
	if conn, err := replacement.Accept(); err == nil {
		conn.Close()
		t.Fatal("replacement received a connection from the old bridge")
	} else if timeout, ok := err.(net.Error); !ok || !timeout.Timeout() {
		t.Fatal(err)
	}
	if err := endpoint.Operation(viewer, "input", owned.Epoch, 1, []byte("old\r"), 0); err == nil {
		t.Fatal("old input accepted after guest loss")
	}
	endpoint.Operation(viewer, "acquire", 0, 0, nil, 0)
	if frame(t, viewer, "state").Owner {
		t.Fatal("retired viewer reacquired authority")
	}

	// An explicitly created bridge can attach, but carries no old subscription,
	// keyboard lease, parser or input queue. Identity approval remains external.
	fresh, err := New([]Config{config})
	if err != nil {
		t.Fatal(err)
	}
	defer fresh.Close()
	if err := fresh.Connect(context.Background()); err != nil {
		t.Fatal(err)
	}
	replacement.SetDeadline(time.Now().Add(time.Second))
	newGuest, err := replacement.Accept()
	if err != nil {
		t.Fatal(err)
	}
	defer newGuest.Close()
	newViewer, err := fresh.Endpoints["guest"].Subscribe()
	if err != nil {
		t.Fatal(err)
	}
	state := frame(t, newViewer, "state")
	if !state.Connected || state.Owner || state.Busy {
		t.Fatal("new bridge inherited keyboard authority")
	}
	newGuest.SetReadDeadline(time.Now().Add(30 * time.Millisecond))
	if n, err := newGuest.Read(make([]byte, 8)); n != 0 || err == nil {
		t.Fatal("new guest received replayed input")
	}
}

func TestEndpointAttachmentCannotBeReused(t *testing.T) {
	for _, event := range []string{"connected", "eof", "close", "close-before-attach", "write-failure"} {
		t.Run(event, func(t *testing.T) {
			endpoint := NewEndpoint(Config{})
			defer endpoint.Close()
			if event != "close-before-attach" {
				conn, peer := net.Pipe()
				defer peer.Close()
				if err := endpoint.Attach(conn); err != nil {
					t.Fatal(err)
				}
				viewer, _ := endpoint.Subscribe()
				frame(t, viewer, "state")
				switch event {
				case "eof":
					peer.Close()
					frame(t, viewer, "state")
				case "close":
					endpoint.Close()
				case "write-failure":
					endpoint.Operation(viewer, "acquire", 0, 0, nil, 0)
					state := frame(t, viewer, "state")
					if endpoint.Operation(viewer, "input", state.Epoch, 1, []byte("x"), 0) == nil {
						t.Fatal("expected stalled write failure")
					}
				}
			} else {
				endpoint.Close()
			}
			conn, peer := net.Pipe()
			defer conn.Close()
			defer peer.Close()
			if err := endpoint.Attach(conn); err == nil {
				t.Fatal("endpoint accepted another guest")
			}
			// Rejection must leave the supplied connection owned by its caller.
			peer.SetWriteDeadline(time.Now().Add(time.Second))
			done := make(chan error, 1)
			go func() { _, err := peer.Write([]byte("x")); done <- err }()
			conn.SetReadDeadline(time.Now().Add(time.Second))
			if _, err := io.ReadFull(conn, make([]byte, 1)); err != nil {
				t.Fatal("rejection closed caller's connection", err)
			}
			if err := <-done; err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestFailedOrClosedBridgeCannotRetry(t *testing.T) {
	for _, closeFirst := range []bool{false, true} {
		listener, err := net.ListenTCP("tcp4", &net.TCPAddr{IP: net.IPv4(127, 0, 0, 1)})
		if err != nil {
			t.Fatal(err)
		}
		defer listener.Close()
		bridge, err := New([]Config{{ID: "guest", Kind: "raw-guest-line", Address: listener.Addr().String()}})
		if err != nil {
			t.Fatal(err)
		}
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Deterministic failure without contacting a local service.
		if closeFirst {
			bridge.Close()
		}
		if bridge.Connect(ctx) == nil || bridge.Connect(context.Background()) == nil {
			t.Fatal("failed/closed bridge was reusable")
		}
		listener.SetDeadline(time.Now().Add(30 * time.Millisecond))
		if conn, err := listener.Accept(); err == nil {
			conn.Close()
			t.Fatal("failed/closed bridge attempted another connection")
		} else if timeout, ok := err.(net.Error); !ok || !timeout.Timeout() {
			t.Fatal(err)
		}
		bridge.Close()
	}
}

// delayedReadConn models bytes already read by a reader before a concurrent
// failed write detaches the line, but not yet published to browser viewers.
type delayedReadConn struct {
	net.Conn
	reading chan struct{}
	release chan struct{}
}

func (c *delayedReadConn) Read(buf []byte) (int, error) {
	close(c.reading)
	<-c.release
	return copy(buf, "late output"), io.EOF
}

func (c *delayedReadConn) Write([]byte) (int, error) { return 0, io.ErrClosedPipe }

func TestDetachedReaderCannotPublishBufferedOutput(t *testing.T) {
	conn, peer := net.Pipe()
	defer peer.Close()
	delayed := &delayedReadConn{Conn: conn, reading: make(chan struct{}), release: make(chan struct{})}
	endpoint := NewEndpoint(Config{})
	defer endpoint.Close()
	// Start the real reader explicitly so this test can join it deterministically.
	endpoint.conn, endpoint.used = delayed, true
	finished := make(chan struct{})
	go func() { endpoint.read(delayed); close(finished) }()
	<-delayed.reading
	viewer, _ := endpoint.Subscribe()
	frame(t, viewer, "state")
	endpoint.Operation(viewer, "acquire", 0, 0, nil, 0)
	owned := frame(t, viewer, "state")
	if endpoint.Operation(viewer, "input", owned.Epoch, 1, []byte("x"), 0) == nil {
		t.Fatal("expected write failure")
	}
	if frame(t, viewer, "state").Connected {
		t.Fatal("uncertain write left connection available")
	}
	close(delayed.release)
	select {
	case <-finished:
	case <-time.After(time.Second):
		t.Fatal("detached reader did not exit")
	}
	select {
	case unexpected := <-viewer.out:
		t.Fatalf("frame published after detach: %+v", unexpected)
	default:
	}
}
