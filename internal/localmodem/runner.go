package localmodem

import (
	"context"
	"errors"
	"net"
	"sync"
	"time"

	"pidp11.local/webdesktop/internal/terminalbridge"
	"pidp11.local/webdesktop/internal/terminalservice"
)

// TransferLimit caps each direction for one explicitly approved attachment.
const TransferLimit = 65536

// Snapshot is a bounded observation of this modern modem personality. PeerConnected
// is a TCP-peer fact, not an emulated carrier-pin measurement. No transcript is kept.
type Snapshot struct {
	Version        int                          `json:"version"`
	Generation     string                       `json:"generation"`
	Profile        terminalbridge.SerialProfile `json:"profile"`
	Mode           string                       `json:"mode"`
	GuestConnected bool                         `json:"guest_connected"`
	PeerConnected  bool                         `json:"peer_connected"`
	Echo           bool                         `json:"echo"`
	Result         string                       `json:"result"`
	Reason         string                       `json:"reason"`
	GuestReceived  uint64                       `json:"guest_received"`
	GuestWritten   uint64                       `json:"guest_written"`
	PeerReceived   uint64                       `json:"peer_received"`
	PeerWritten    uint64                       `json:"peer_written"`
	SampleUnixMS   int64                        `json:"sample_unix_ms"`
	ActivityUnixMS int64                        `json:"activity_unix_ms"`
}

// Runner owns one modem actor and its fixed local peer. Manager retains all guest
// approval, supervision, generation and input-lease checks. Runner.mu protects
// observation copies; only Run changes protocol/connection state. Trace is a
// synchronous bounded lab-only capture callback, installed before Run or nil.
type Runner struct {
	Manager  *terminalservice.Manager
	config   terminalbridge.Config
	mu       sync.Mutex
	snapshot Snapshot
	dialPeer func(context.Context) (net.Conn, error) // Fixed production dial; replaceable only by package tests.
	Trace    func(kind string, data []byte)
}

// NewRunner starts detached and accepts only the actually qualified V7/DC11 line.
func NewRunner(config terminalbridge.Config) (*Runner, error) {
	if err := terminalbridge.Validate([]terminalbridge.Config{config}); err != nil {
		return nil, err
	}
	if config.Address != "127.0.0.1:40103" || config.Serial.Controller != "DC11" || config.Serial.Unit != 0 || config.Serial.Line != 3 || config.Serial.Guest != "UNIX V7" {
		return nil, errors.New("qualified local V7/DC11 line 3 required")
	}
	manager, err := terminalservice.NewSupervisedActor(config)
	if err != nil {
		return nil, err
	}
	return &Runner{dialPeer: func(ctx context.Context) (net.Conn, error) {
		return (&net.Dialer{Timeout: 250 * time.Millisecond}).DialContext(ctx, "tcp", "127.0.0.1:40200")
	}, Manager: manager, config: config, snapshot: Snapshot{Version: 1, Generation: manager.Status().Instance, Profile: config.Serial, Mode: "detached", Reason: "Independent local approval required"}}, nil
}

// Observe copies current bounded facts and never renews input or attachment authority.
func (r *Runner) Observe() Snapshot {
	r.mu.Lock()
	defer r.mu.Unlock()
	s := r.snapshot
	s.SampleUnixMS = time.Now().UnixMilli()
	return s
}
func (r *Runner) publish(s Snapshot) { r.mu.Lock(); r.snapshot = s; r.mu.Unlock() }
func (r *Runner) trace(kind string, data []byte) {
	if r.Trace != nil {
		r.Trace(kind, data)
	}
}

// Run never launches an emulator or reconnects a retired generation. Only a new
// independent Manager approval can start another attachment. Cancellation closes
// owned serial/peer sockets and waits for their reader goroutines.
func (r *Runner) Run(ctx context.Context) {
	managerDone := make(chan struct{})
	go func() { defer close(managerDone); r.Manager.Run(ctx) }()
	defer func() { r.Manager.Close(); <-managerDone }()
	timer := time.NewTicker(50 * time.Millisecond)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			s := r.Observe()
			s.Mode = "stopped"
			s.GuestConnected = false
			s.PeerConnected = false
			s.Reason = "Modem process stopped"
			r.publish(s)
			return
		case <-timer.C:
			for _, line := range r.Manager.List() {
				if line.State != "attached" {
					continue
				}
				endpoint := r.Manager.Lookup(line.ID, line.Generation)
				if endpoint == nil {
					continue
				}
				r.attachment(ctx, endpoint, line.Generation)
			}
		}
	}
}

type peerEvent struct {
	connection net.Conn
	data       []byte
	err        error
}

func (r *Runner) attachment(ctx context.Context, endpoint *terminalbridge.Endpoint, generation string) {
	ctx, cancel := context.WithCancel(ctx)
	var peer net.Conn
	var readers sync.WaitGroup
	defer func() {
		cancel()
		if peer != nil {
			peer.Close()
		}
		endpoint.Close()
		readers.Wait()
	}()
	client := r.Manager.ActorClient(r.config.ID, generation)
	if client == nil {
		return
	}
	defer endpoint.Unsubscribe(client)
	machine := New()
	s := Snapshot{Version: 1, Generation: generation, Profile: r.config.Serial, Mode: "command", GuestConnected: true, Echo: false}
	reason := "Attachment retired"
	defer func() {
		s.Mode = "unavailable"
		s.GuestConnected = false
		s.PeerConnected = false
		s.Reason = reason
		r.publish(s)
	}()
	events := make(chan peerEvent, 8)
	var epoch, sequence uint64
	owned := false
	ownershipEstablished := false
	peerLine := 0
	timer := time.NewTicker(20 * time.Millisecond)
	defer timer.Stop()
	lastRenew := time.Now()
	current := func() bool { return r.Manager.Lookup(r.config.ID, generation) == endpoint }
	closePeer := func() {
		peerLine = 0
		if peer != nil {
			peer.Close()
			peer = nil
		}
	}
	update := func() {
		s.Mode = machine.Mode
		s.PeerConnected = peer != nil
		s.Echo = machine.Echo
		s.Result = machine.LastResult
		r.publish(s)
	}
	sendGuest := func(data []byte) error {
		for len(data) > 0 {
			if !owned || !current() {
				return errors.New("guest authority retired")
			}
			n := min(len(data), terminalbridge.MaxInput)
			if s.GuestWritten+uint64(n) > TransferLimit {
				return errors.New("guest output bound reached")
			}
			sequence++
			before := s.GuestWritten
			err := endpoint.Operation(client, "input", epoch, sequence, data[:n], 0)
			_, s.GuestWritten = endpoint.TransportCounts()
			committed := s.GuestWritten - before
			if committed > uint64(n) {
				return errors.New("unexpected competing serial writer")
			}
			if err != nil {
				r.trace("modem_to_guest_partial", data[:int(committed)])
				return errors.New("guest write failed; delivery uncertain; no replay")
			}
			s.ActivityUnixMS = time.Now().UnixMilli()
			r.trace("modem_to_guest", data[:n])
			data = data[n:]
		}
		return nil
	}
	sendPeer := func(data []byte) error {
		if len(data) == 0 {
			return nil
		}
		if peer == nil || !current() {
			return errors.New("peer or guest authority unavailable")
		}
		if s.PeerWritten+uint64(len(data)) > TransferLimit {
			return errors.New("peer output bound reached")
		}
		if err := peer.SetWriteDeadline(time.Now().Add(250 * time.Millisecond)); err != nil {
			return err
		}
		for len(data) > 0 {
			n, err := peer.Write(data)
			if n > 0 {
				s.PeerWritten += uint64(n)
				r.trace("modem_to_peer", data[:n])
				data = data[n:]
			}
			if err != nil || n == 0 {
				return errors.New("peer write failed; delivery uncertain; no replay")
			}
		}
		s.ActivityUnixMS = time.Now().UnixMilli()
		return nil
	}
	startReader := func(connection net.Conn) {
		readers.Add(1)
		go func() {
			defer readers.Done()
			buffer := make([]byte, 256)
			for {
				n, err := connection.Read(buffer)
				event := peerEvent{connection: connection, err: err}
				if n > 0 {
					event.data = append([]byte(nil), buffer[:n]...)
				}
				select {
				case events <- event:
				case <-ctx.Done():
					return
				}
				if err != nil {
					return
				}
			}
		}()
	}
	handle := func(action Action) error {
		if len(action.Command) > 0 {
			r.trace("parsed_command", []byte(action.Command))
		}
		if action.Hangup {
			closePeer()
		}
		if err := sendGuest(action.Reply); err != nil {
			return err
		}
		if action.Dial {
			if !current() {
				return errors.New("approval expired before local dial")
			}
			connection, err := r.dialPeer(ctx)
			if err == nil {
				peer = connection
				startReader(connection)
			}
			if err := sendGuest(machine.DialResult(err == nil, time.Now())); err != nil {
				return err
			}
		}
		return sendPeer(action.Data)
	}
	if err := endpoint.Operation(client, "acquire", 0, 0, nil, 0); err != nil {
		reason = "Modem cannot own serial replies"
		return
	}
	owned, epoch = endpoint.Ownership(client)
	if !owned {
		reason = "Modem did not acquire serial reply ownership"
		return
	}
	ownershipEstablished = true
	update()
	for {
		select {
		case <-ctx.Done():
			reason = "Modem cancelled"
			return
		case <-client.Done():
			reason = "Guest connection or approval lost"
			return
		case frame := <-client.Frames():
			if frame.Type == "state" {
				if frame.Epoch < epoch {
					continue
				}
				if ownershipEstablished && !frame.Owner {
					reason = "Serial reply ownership expired"
					return
				}
				owned = frame.Owner
				ownershipEstablished = ownershipEstablished || owned
				epoch = frame.Epoch
				if !frame.Connected {
					reason = "Guest disconnected"
					return
				}
				continue
			}
			if frame.Type != "output" {
				continue
			}
			if s.GuestReceived+uint64(len(frame.Data)) > TransferLimit {
				reason = "Guest input bound reached"
				return
			}
			s.GuestReceived += uint64(len(frame.Data))
			s.ActivityUnixMS = time.Now().UnixMilli()
			r.trace("guest_to_modem", frame.Data)
			for _, b := range frame.Data {
				action, err := machine.Feed(b, time.Now())
				if err != nil {
					reason = err.Error()
					return
				}
				if err := handle(action); err != nil {
					reason = err.Error()
					return
				}
			}
			if err := endpoint.Operation(client, "ack", 0, 0, nil, len(frame.Data)); err != nil {
				reason = "Output credit rejected"
				return
			}
			update()
		case event := <-events:
			if peer == nil || event.connection != peer {
				continue
			}
			if s.PeerReceived+uint64(len(event.data)) > TransferLimit {
				reason = "Peer input bound reached"
				return
			}
			for _, b := range event.data {
				if b > 127 {
					reason = "Peer exceeded ASCII7 subset"
					return
				}
				if b == '\n' {
					peerLine = 0
				} else {
					peerLine++
				}
				if peerLine > LineLimit {
					reason = "Peer line bound reached"
					return
				}
			}
			s.PeerReceived += uint64(len(event.data))
			s.ActivityUnixMS = time.Now().UnixMilli()
			r.trace("peer_to_modem", event.data)
			// Online command mode keeps the peer connection but never delivers its data
			// as modem commands; input remains guest-owned. Responses may interleave.
			if err := sendGuest(event.data); err != nil {
				reason = err.Error()
				return
			}
			if event.err != nil {
				closePeer()
				peerLine = 0
				if err := sendGuest(machine.LostPeer()); err != nil {
					reason = err.Error()
					return
				}
			}
			update()
		case now := <-timer.C:
			if !current() {
				reason = "Guest generation or approval retired"
				return
			}
			if owned && now.Sub(lastRenew) >= time.Second {
				if err := endpoint.Operation(client, "renew", epoch, 0, nil, 0); err != nil {
					reason = "Serial reply ownership expired"
					return
				}
				lastRenew = now
			}
			action, err := machine.Tick(now)
			if err != nil {
				reason = err.Error()
				return
			}
			if err := handle(action); err != nil {
				reason = err.Error()
				return
			}
			update()
		}
	}
}
