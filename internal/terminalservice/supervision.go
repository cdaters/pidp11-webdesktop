package terminalservice

import (
	"errors"
	"strings"
	"time"
)

// Supervision separates externally observed process/socket identities from an
// operator-supplied guest-change epoch. None of these fields identifies an OS.
// The observer must check the actual connected socket before its first renewal.
type Supervision struct {
	Process       string `json:"process"`
	Endpoint      string `json:"endpoint"`
	OperatorEpoch string `json:"operator_epoch"`
}

func (s Supervision) valid() bool {
	for _, value := range []string{s.Process, s.Endpoint, s.OperatorEpoch} {
		if len(value) < 16 || len(value) > 128 || strings.TrimSpace(value) != value {
			return false
		}
	}
	return true
}

const supervisionLifetime = time.Second

// Renewal is a one-use, ordered assertion by the private local observer. It
// cannot attach a detached line or alter any of its approved identities.
type Renewal struct {
	Instance    string      `json:"instance"`
	ID          string      `json:"id"`
	Revision    uint64      `json:"revision"`
	Sequence    uint64      `json:"sequence"`
	Supervision Supervision `json:"supervision"`
}

// expireLocked retires authority on supervision loss, never the simulator.
// Caller holds Manager.mu. Closing the socket also retires every keyboard lease.
func (m *Manager) expireLocked(l *line, now time.Time) bool {
	if !l.supervised || l.proof == nil || (l.state != "attached" && l.state != "attaching" && l.state != "verifying") || now.Before(l.deadline) {
		return false
	}
	l.revision++
	l.state = "unavailable"
	l.proof = nil
	l.localAddress, l.peerAddress = "", ""
	if l.endpoint != nil {
		l.endpoint.Close()
		l.endpoint = nil
	}
	return true
}

// Renew consumes the next observation only while its existing lease is fresh.
// Late, replayed or reordered observations cannot revive expired authority.
func (m *Manager) Renew(r Renewal) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	l := m.lines[r.ID]
	if l != nil {
		m.expireLocked(l, time.Now())
	}
	if m.closed || l == nil || !l.supervised || l.proof == nil || r.Instance != m.instance || r.Revision != l.revision || r.Supervision != *l.proof || r.Sequence != l.sequence+1 || (l.state != "attached" && l.state != "verifying") || !l.endpoint.Connected() {
		return errors.New("fresh matching supervision required; no automatic reattachment")
	}
	l.sequence = r.Sequence
	l.deadline = time.Now().Add(supervisionLifetime)
	l.state = "attached"
	return nil
}
