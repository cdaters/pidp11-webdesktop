// Package terminalservice manages explicit local approvals around the existing
// one-shot bridge. It has no emulator, GPIO, Screen, or disk operations.
package terminalservice

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"sync"
	"time"

	"pidp11.local/webdesktop/internal/terminalbridge"
)

type line struct {
	config   terminalbridge.Config
	endpoint *terminalbridge.Endpoint
	revision uint64
	state    string
}

// Manager.mu serializes approval publication, not network dialing. Each generation
// gets a new Endpoint; old viewers retain only the retired endpoint. Dial is fixed
// at construction and must not change while the manager is in use. Lock order is
// Manager.mu then Endpoint.mu; endpoints never call back into the manager.
type Manager struct {
	mu       sync.Mutex
	instance string
	lines    map[string]*line
	closed   bool
	dial     func(context.Context, string, string) (net.Conn, error)
}

// Approval fences one local operator action to the observed service and line.
type Approval struct {
	Instance  string `json:"instance"`
	ID        string `json:"id"`
	Revision  uint64 `json:"revision"`
	Confirmed bool   `json:"guest_and_line_verified"`
}

// Status is a fresh local inventory, not evidence of guest identity.
type Status struct {
	Instance string       `json:"instance"`
	Lines    []LineStatus `json:"lines"`
}

// LineStatus exposes the revision required by the next local approval.
type LineStatus struct {
	ID             string `json:"id"`
	Label          string `json:"label"`
	Revision       uint64 `json:"revision"`
	State          string `json:"state"`
	ViewerRevision uint64 `json:"viewer_revision"`
	Viewers        int    `json:"viewers"`
}

// New validates the immutable allowlist and creates no network connections.
func New(configs []terminalbridge.Config) (*Manager, error) {
	if err := terminalbridge.Validate(configs); err != nil {
		return nil, err
	}
	var nonce [16]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return nil, err
	}
	m := &Manager{instance: hex.EncodeToString(nonce[:]), lines: map[string]*line{}, dial: (&net.Dialer{Timeout: time.Second}).DialContext}
	for _, c := range configs {
		m.lines[c.ID] = &line{config: c, state: "detached"}
	}
	return m, nil
}
func state(l *line) string {
	if l.state == "attached" && !l.endpoint.Connected() {
		return "unavailable"
	}
	return l.state
}

// Status returns a snapshot safe for concurrent inspection.
func (m *Manager) Status() Status {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := Status{Instance: m.instance, Lines: []LineStatus{}}
	for id, l := range m.lines {
		row := LineStatus{ID: id, Label: l.config.Label, Revision: l.revision, State: l.state}
		if l.endpoint != nil {
			connected, revision, viewers := l.endpoint.Observation()
			row.ViewerRevision, row.Viewers = revision, viewers
			if row.State == "attached" && !connected {
				row.State = "unavailable"
			}
		}
		s.Lines = append(s.Lines, row)
	}
	return s
}
func (m *Manager) generation(l *line) string { return fmt.Sprintf("%s-%d", m.instance, l.revision) }

// List implements the browser directory without exposing private addresses.
func (m *Manager) List() []terminalbridge.Listing {
	m.mu.Lock()
	defer m.mu.Unlock()
	rows := []terminalbridge.Listing{}
	for id, l := range m.lines {
		s := state(l)
		rows = append(rows, terminalbridge.Listing{ID: id, Label: l.config.Label, Connected: s == "attached", State: s, Generation: m.generation(l), Kind: "real-guest-line", Columns: 80, Rows: 24})
	}
	return rows
}

// Lookup returns only the exact currently attached generation. The caller
// retains that Endpoint even if a later local action retires it.
func (m *Manager) Lookup(id, generation string) *terminalbridge.Endpoint {
	m.mu.Lock()
	defer m.mu.Unlock()
	l := m.lines[id]
	if m.closed || l == nil || generation != m.generation(l) || state(l) != "attached" {
		return nil
	}
	return l.endpoint
}

// Attach consumes a fresh local approval even if dialing fails. Neither browser
// reconnects nor port reuse can produce an approval. Confirmation records an
// operator assertion, not automatic proof of the guest's identity.
func (m *Manager) Attach(ctx context.Context, a Approval) error {
	m.mu.Lock()
	l := m.lines[a.ID]
	if m.closed || l == nil || a.Instance != m.instance || a.Revision != l.revision || !a.Confirmed || state(l) == "attached" || l.state == "attaching" {
		m.mu.Unlock()
		return errors.New("fresh approval for a detached or unavailable line required")
	}
	if l.endpoint != nil {
		l.endpoint.Close()
	}
	l.revision++
	revision := l.revision
	l.state = "attaching"
	config := l.config
	m.mu.Unlock()
	bounded, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	conn, err := m.dial(bounded, "tcp", config.Address)
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.closed || l.revision != revision || l.state != "attaching" {
		if conn != nil {
			conn.Close()
		}
		return errors.New("approval retired during connection attempt")
	}
	if err != nil {
		if conn != nil {
			conn.Close()
		}
		l.state = "unavailable"
		return errors.New("approved guest line unavailable; no retry")
	}
	endpoint := terminalbridge.NewEndpoint(config)
	if err = endpoint.Attach(conn); err != nil {
		conn.Close()
		l.state = "unavailable"
		return err
	}
	l.endpoint = endpoint
	l.state = "attached"
	return nil
}

// Detach invalidates pending approvals and connections without sending guest bytes.
func (m *Manager) Detach(a Approval) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	l := m.lines[a.ID]
	if m.closed || l == nil || a.Instance != m.instance || a.Revision != l.revision {
		return errors.New("stale detach request")
	}
	l.revision++
	l.state = "detached"
	if l.endpoint != nil {
		l.endpoint.Close()
		l.endpoint = nil
	}
	return nil
}

// Close permanently retires this manager and closes only its guest sockets.
func (m *Manager) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.closed = true
	for _, l := range m.lines {
		l.revision++
		l.state = "detached"
		if l.endpoint != nil {
			l.endpoint.Close()
			l.endpoint = nil
		}
	}
}

// Run maintains endpoint leases until cancellation, then closes the manager.
func (m *Manager) Run(ctx context.Context) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			m.Close()
			return
		case <-ticker.C:
			m.mu.Lock()
			for _, l := range m.lines {
				if l.endpoint != nil {
					l.endpoint.Tick()
				}
			}
			m.mu.Unlock()
		}
	}
}
