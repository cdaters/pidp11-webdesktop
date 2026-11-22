// Package terminalbridge attaches only operator-configured raw guest serial lines.
// It never starts a process, controls SIMH, or participates in panel ownership.
package terminalbridge

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"regexp"
	"strconv"
	"sync"
	"time"
)

// MaxInput bounds a single ASCII7 keyboard operation, not an entire guest command.
const MaxInput = 256

// OutputCredit bounds unacknowledged guest bytes per viewer. A slow viewer is
// disconnected rather than blocking the guest or other viewers.
const OutputCredit = 65536

// Lease limits keyboard authority unless the owning browser renews it.
const Lease = 10 * time.Second

// Config names an operator-selected raw serial endpoint, never a browser address.
// DC11 setup and guest login configuration belong to the separate SIMH lab harness.
type Config struct {
	ID      string `json:"id"`
	Label   string `json:"label"`
	Address string `json:"address"`
	Kind    string `json:"kind"`
}

// Validate accepts one to four unique, literal-loopback raw guest endpoints.
func Validate(configs []Config) error {
	if len(configs) == 0 || len(configs) > 4 {
		return errors.New("one to four guest endpoints required")
	}
	ids, addresses := map[string]bool{}, map[string]bool{}
	for _, c := range configs {
		host, port, e := net.SplitHostPort(c.Address)
		ip := net.ParseIP(host)
		number, portErr := strconv.Atoi(port)
		if e != nil || portErr != nil || number < 1 || number > 65535 || ip == nil || !ip.IsLoopback() || port == "0" || !regexp.MustCompile(`^[0-9]{1,5}$`).MatchString(port) || c.Kind != "raw-guest-line" || !regexp.MustCompile(`^[a-z][a-z0-9-]{0,31}$`).MatchString(c.ID) || len(c.Label) > 80 || ids[c.ID] || addresses[c.Address] {
			return errors.New("invalid or duplicate dedicated guest endpoint")
		}
		ids[c.ID] = true
		addresses[c.Address] = true
	}
	return nil
}

// Frame carries per-viewer ownership state or guest bytes (base64 in JSON).
// Epoch fences keyboard authority; it is not a guest execution acknowledgement.
type Frame struct {
	Type       string `json:"type"`
	Data       []byte `json:"data,omitempty"`
	Connected  bool   `json:"connected"`
	Owner      bool   `json:"owner"`
	Busy       bool   `json:"busy"`
	Epoch      uint64 `json:"epoch"`
	Message    string `json:"message,omitempty"`
	ProposalID string `json:"proposal_id,omitempty"`
	Expires    int64  `json:"expires,omitempty"`
}

// Client is a subscription owned by one WebSocket handler. Endpoint.mu protects
// its accounting; done signals removal, while out is deliberately never closed.
type Client struct {
	out       chan Frame
	done      chan struct{}
	pending   int
	lastSeq   uint64
	proposal  *proposal
	rateStart time.Time
	rateBytes int
}

// Endpoint owns one guest connection and up to eight viewers with one keyboard
// owner. mu serializes membership, leases and guest writes. Helpers without their
// own lock (send, remove, state, broadcastState, expire) require mu to be held.
// Config and the injectable Now clock must not change after concurrent use begins.
type Endpoint struct {
	Config       Config
	mu           sync.Mutex
	conn         net.Conn
	used         bool // One guest attachment per endpoint lifetime, including after Close.
	clients      map[*Client]bool
	viewRevision uint64 // Changes on every membership transition, including eviction.
	owner        *Client
	epoch        uint64
	until        time.Time
	Now          func() time.Time
}

// NewEndpoint creates a detached line. Callers outside New must validate c first.
func NewEndpoint(c Config) *Endpoint {
	return &Endpoint{Config: c, clients: map[*Client]bool{}, Now: time.Now}
}

// Attach is a local operator lifecycle action. No browser can choose an address.
// Success transfers connection ownership to Endpoint and starts its reader;
// failure leaves the caller responsible for closing conn. There is no retry.
// An endpoint cannot be reused after attachment or Close: a reused address is
// not evidence of the same guest. New guests require a newly provisioned Bridge.
func (e *Endpoint) Attach(conn net.Conn) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if conn == nil {
		return errors.New("guest connection required")
	}
	if e.used {
		return errors.New("guest attachment already consumed; create a fresh bridge")
	}
	e.used = true
	e.conn = conn
	e.epoch++
	e.owner = nil
	e.broadcastState("")
	go e.read(conn)
	return nil
}
func (e *Endpoint) read(conn net.Conn) {
	defer func() {
		e.mu.Lock()
		defer e.mu.Unlock()
		// Close or an uncertain write may already have detached this reader.
		if e.conn == conn {
			conn.Close()
			e.conn = nil
			e.owner = nil
			e.epoch++
			e.broadcastState("Guest line disconnected; no automatic reconnect")
		}
	}()
	buf := make([]byte, 4096)
	for {
		n, err := conn.Read(buf)
		if n > 0 {
			e.mu.Lock()
			// Read can complete with buffered bytes after Close or a failed Write.
			// Never publish those bytes into a detached terminal session.
			if e.conn != conn {
				e.mu.Unlock()
				return
			}
			// Output frames are immutable. Copy once before reusing the read buffer;
			// viewers retain independent queue and credit limits.
			var output []byte
			for c := range e.clients {
				if c.pending+n > OutputCredit {
					e.remove(c)
					continue
				}
				if output == nil {
					output = append([]byte(nil), buf[:n]...)
				}
				c.pending += n
				e.send(c, Frame{Type: "output", Data: output})
			}
			e.mu.Unlock()
		}
		if err != nil {
			return
		}
	}
}
func (e *Endpoint) send(c *Client, f Frame) {
	select {
	case c.out <- f:
	default:
		e.remove(c)
	}
}
func (e *Endpoint) remove(c *Client) {
	if !e.clients[c] {
		return
	}
	delete(e.clients, c)
	e.viewRevision++
	close(c.done)
	if e.owner == c {
		e.owner = nil
		e.epoch++
	}
}
func (e *Endpoint) state(c *Client, message string) Frame {
	return Frame{Type: "state", Connected: e.conn != nil, Owner: e.owner == c, Busy: e.owner != nil, Epoch: e.epoch, Message: message}
}
func (e *Endpoint) broadcastState(message string) {
	for c := range e.clients {
		e.send(c, e.state(c, message))
	}
}

// Observation returns one atomic local-only connection/membership snapshot.
// The revision distinguishes disconnect/reconnect even when viewer counts match.
// It identifies browser subscriptions, not an OS, CPU state or user identity.
func (e *Endpoint) Observation() (connected bool, revision uint64, viewers int) {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.conn != nil, e.viewRevision, len(e.clients)
}

// Subscribe starts a fresh view without replaying guest output or granting input.
// The caller must Unsubscribe when its transport ends.
func (e *Endpoint) Subscribe() (*Client, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if len(e.clients) >= 8 {
		return nil, errors.New("viewer limit")
	}
	c := &Client{out: make(chan Frame, 64), done: make(chan struct{})}
	e.clients[c] = true
	e.viewRevision++
	e.send(c, e.state(c, "Fresh display; ongoing guest line, no history replay"))
	return c, nil
}

// Unsubscribe releases this viewer's keyboard but leaves the guest line attached.
func (e *Endpoint) Unsubscribe(c *Client) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.remove(c)
	e.broadcastState("")
}
func (e *Endpoint) expire() {
	if e.owner != nil && !e.Now().Before(e.until) {
		e.owner = nil
		e.epoch++
		e.broadcastState("Keyboard lease expired")
	}
}

// Tick expires idle keyboard authority; Bridge.Run calls it even without input.
func (e *Endpoint) Tick() { e.mu.Lock(); defer e.mu.Unlock(); e.expire() }

// Close detaches the socket and removes viewers; it does not stop the guest CPU.
func (e *Endpoint) Close() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.used = true
	if e.conn != nil {
		e.conn.Close()
		e.conn = nil
	}
	e.owner = nil
	e.epoch++
	for c := range e.clients {
		e.remove(c)
	}
}

// Connected reports attachment, not guest login or CPU state.
func (e *Endpoint) Connected() bool { e.mu.Lock(); defer e.mu.Unlock(); return e.conn != nil }

// Operation is a single bounded WS request. Sequence and generation fence stale input.
// Writes are serialized with release/expiry; already committed bytes cannot be recalled.
func (e *Endpoint) Operation(c *Client, op string, epoch, seq uint64, data []byte, n int) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.operationLocked(c, op, epoch, seq, data, n)
}

// operationLocked shares the ordinary input path with single-use approval.
// Caller holds Endpoint.mu, including throughout the bounded guest write.
func (e *Endpoint) operationLocked(c *Client, op string, epoch, seq uint64, data []byte, n int) error {
	e.expire()
	if !e.clients[c] {
		return errors.New("disconnected")
	}
	switch op {
	case "acquire":
		if e.conn == nil || (e.owner != nil && e.owner != c) {
			e.send(c, e.state(c, "Keyboard unavailable"))
			return nil
		}
		if e.owner != c {
			e.owner = c
			e.epoch++
		}
		e.until = e.Now().Add(Lease)
		e.broadcastState("")
	case "release":
		if e.owner == c {
			e.owner = nil
			e.epoch++
			e.broadcastState("")
		}
	case "renew":
		if e.owner == c && epoch == e.epoch {
			e.until = e.Now().Add(Lease)
		}
	case "ack":
		// Credit returns only after the browser renderer consumes output. Merely
		// writing a WebSocket frame would hide an accumulating renderer backlog.
		if n < 1 || n > c.pending {
			return errors.New("invalid output acknowledgement")
		}
		c.pending -= n
	case "input":
		c.proposal = nil // Ordinary typing changes the context of a pending suggestion.
		if e.conn == nil || e.owner != c || epoch != e.epoch {
			return errors.New("keyboard ownership required")
		}
		if seq != c.lastSeq+1 || len(data) == 0 || len(data) > MaxInput {
			return errors.New("invalid input sequence/size")
		}
		for _, b := range data {
			if b > 127 {
				return errors.New("ASCII7 input required")
			}
		}
		now := e.Now()
		if now.Sub(c.rateStart) >= time.Second {
			c.rateStart = now
			c.rateBytes = 0
		}
		c.rateBytes += len(data)
		if c.rateBytes > 4096 {
			return errors.New("input rate exceeded")
		}
		c.lastSeq = seq
		// Keep the lock across this bounded write so release cannot overtake it.
		// Partial delivery is uncertain: disconnect instead of retrying a command.
		budget := min(250*time.Millisecond, e.until.Sub(e.Now()))
		e.conn.SetWriteDeadline(time.Now().Add(budget))
		rest := data
		for len(rest) > 0 {
			written, err := e.conn.Write(rest)
			if written > 0 {
				rest = rest[written:]
			}
			if err != nil || written == 0 {
				e.conn.Close()
				e.conn = nil
				e.owner = nil
				e.epoch++
				e.broadcastState("Input delivery uncertain; line disconnected, never replayed")
				return errors.New("guest write failed")
			}
		}
	default:
		return errors.New("unknown operation")
	}
	return nil
}

// Bridge owns the configured endpoints. Its map is fixed after New; individual
// endpoints synchronize their own state. Connect is a one-shot operator setup
// action. mu protects the attempt flag, not the immutable Endpoints map.
type Bridge struct {
	Endpoints        map[string]*Endpoint
	mu               sync.Mutex
	connectAttempted bool
}

// New validates configuration and creates detached endpoints without dialing.
func New(configs []Config) (*Bridge, error) {
	if err := Validate(configs); err != nil {
		return nil, err
	}
	b := &Bridge{Endpoints: map[string]*Endpoint{}}
	for _, c := range configs {
		b.Endpoints[c.ID] = NewEndpoint(c)
	}
	return b, nil
}

// Connect attempts each configured line once and closes all lines on any failure.
// Call during setup, before Run; do not run concurrent lifecycle operations.
// Repeated calls fail before dialing, even after an unsuccessful first attempt.
// A new Bridge still needs independent operator verification of guest identity;
// TCP connection success alone supplies no such evidence.
func (b *Bridge) Connect(ctx context.Context) error {
	b.mu.Lock()
	if b.connectAttempted {
		b.mu.Unlock()
		return errors.New("guest connection already attempted; create a fresh bridge")
	}
	b.connectAttempted = true
	b.mu.Unlock()
	for _, e := range b.Endpoints {
		conn, err := (&net.Dialer{Timeout: time.Second}).DialContext(ctx, "tcp", e.Config.Address)
		if err != nil {
			b.Close()
			return errors.New("configured guest endpoint unavailable")
		}
		if err = e.Attach(conn); err != nil {
			conn.Close()
			b.Close()
			return err
		}
	}
	return nil
}

// Close detaches all lines and viewers without sending guest shutdown commands.
func (b *Bridge) Close() {
	b.mu.Lock()
	b.connectAttempted = true
	b.mu.Unlock()
	for _, e := range b.Endpoints {
		e.Close()
	}
}

// Run maintains leases until cancellation, then closes the owned endpoints.
func (b *Bridge) Run(ctx context.Context) {
	t := time.NewTicker(100 * time.Millisecond)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			b.Close()
			return
		case <-t.C:
			for _, e := range b.Endpoints {
				e.Tick()
			}
		}
	}
}

// DecodeConfig reads bounded operator JSON, rejects extra fields/data, and validates
// endpoints. It neither opens the configuration file nor closes the supplied reader.
func DecodeConfig(r io.Reader) ([]Config, error) {
	var c []Config
	d := json.NewDecoder(io.LimitReader(r, 8193))
	d.DisallowUnknownFields()
	if err := d.Decode(&c); err != nil {
		return nil, err
	}
	var x any
	if d.Decode(&x) != io.EOF {
		return nil, errors.New("extra config data")
	}
	return c, Validate(c)
}
