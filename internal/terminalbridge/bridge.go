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

const MaxInput = 256
const OutputCredit = 65536
const Lease = 10 * time.Second

type Config struct {
	ID      string `json:"id"`
	Label   string `json:"label"`
	Address string `json:"address"`
	Kind    string `json:"kind"`
}

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

type Frame struct {
	Type      string `json:"type"`
	Data      []byte `json:"data,omitempty"`
	Connected bool   `json:"connected"`
	Owner     bool   `json:"owner"`
	Busy      bool   `json:"busy"`
	Epoch     uint64 `json:"epoch"`
	Message   string `json:"message,omitempty"`
}
type Client struct {
	out       chan Frame
	done      chan struct{}
	pending   int
	lastSeq   uint64
	rateStart time.Time
	rateBytes int
}
type Endpoint struct {
	Config  Config
	mu      sync.Mutex
	conn    net.Conn
	clients map[*Client]bool
	owner   *Client
	epoch   uint64
	until   time.Time
	Now     func() time.Time
}

func NewEndpoint(c Config) *Endpoint {
	return &Endpoint{Config: c, clients: map[*Client]bool{}, Now: time.Now}
}

// Attach is a local operator lifecycle action. No browser can choose an address.
func (e *Endpoint) Attach(conn net.Conn) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.conn != nil {
		return errors.New("endpoint already attached")
	}
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
			for c := range e.clients {
				if c.pending+n > OutputCredit {
					e.remove(c)
					continue
				}
				b := append([]byte(nil), buf[:n]...)
				c.pending += n
				e.send(c, Frame{Type: "output", Data: b})
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
func (e *Endpoint) Subscribe() (*Client, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if len(e.clients) >= 8 {
		return nil, errors.New("viewer limit")
	}
	c := &Client{out: make(chan Frame, 64), done: make(chan struct{})}
	e.clients[c] = true
	e.send(c, e.state(c, "Fresh display; ongoing guest line, no history replay"))
	return c, nil
}
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
func (e *Endpoint) Tick() { e.mu.Lock(); defer e.mu.Unlock(); e.expire() }
func (e *Endpoint) Close() {
	e.mu.Lock()
	defer e.mu.Unlock()
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
func (e *Endpoint) Connected() bool { e.mu.Lock(); defer e.mu.Unlock(); return e.conn != nil }

// Operation is a single bounded WS request. Sequence and generation fence stale input.
// Writes are serialized with release/expiry; already committed bytes cannot be recalled.
func (e *Endpoint) Operation(c *Client, op string, epoch, seq uint64, data []byte, n int) error {
	e.mu.Lock()
	defer e.mu.Unlock()
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
		if n < 1 || n > c.pending {
			return errors.New("invalid output acknowledgement")
		}
		c.pending -= n
	case "input":
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

type Bridge struct{ Endpoints map[string]*Endpoint }

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
func (b *Bridge) Connect(ctx context.Context) error {
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
func (b *Bridge) Close() {
	for _, e := range b.Endpoints {
		e.Close()
	}
}
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
