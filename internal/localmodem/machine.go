// Package localmodem implements a bounded modern Hayes-style laboratory subset.
// It has no simulator, filesystem or network API; its owner supplies one fixed peer.
package localmodem

import (
	"errors"
	"strings"
	"time"
)

// Guard is the required silence on each side of the supported +++ escape.
const Guard = time.Second

// CommandLimit bounds a CR-terminated command before overflow discard.
const CommandLimit = 80

// LineLimit bounds text between LF bytes to protect the historical cu reader.
const LineLimit = 256

// Action describes requested I/O. Dial must be completed before reporting CONNECT.
type Action struct {
	Reply   []byte
	Data    []byte
	Dial    bool
	Hangup  bool
	Command string
}

// Machine is owned by one serialized attachment loop. Its mode is modem-personality
// state, not an observation of emulated DCD/DTR/DSR/CTS/RTS pins.
type Machine struct {
	Mode          string
	Echo          bool
	LastResult    string
	command       [CommandLimit]byte
	used          int
	discard       bool
	peer          bool
	lastInput     time.Time
	escapeStarted time.Time
	escapeCount   int
	lineBytes     int
}

// New creates a detached-from-peer command personality with echo disabled.
func New() *Machine { return &Machine{Mode: "command", Echo: false} }
func (m *Machine) result(code string) []byte {
	m.LastResult = code
	return []byte("\r\n" + code + "\r\n")
}

// Feed handles one guest byte. Command termination is CR only. Data is an ASCII
// text subset; LF must occur within 256 bytes to bound historical cu's line buffer.
func (m *Machine) Feed(b byte, now time.Time) (Action, error) {
	if b > 127 {
		return Action{}, errors.New("ASCII7 subset exceeded; attachment must retire")
	}
	if m.Mode == "dialing" {
		return Action{}, errors.New("input while peer connection unresolved")
	}
	var a Action
	if m.Mode == "data" && m.escapeCount > 0 && now.Sub(m.lastInput) >= Guard {
		prefix, err := m.Tick(now)
		if err != nil {
			return Action{}, err
		}
		next, err := m.Feed(b, now)
		next.Reply = append(prefix.Reply, next.Reply...)
		next.Data = append(prefix.Data, next.Data...)
		return next, err
	}
	if m.Mode == "data" {
		previous := m.lastInput
		m.lastInput = now
		if m.escapeCount > 0 {
			if b == '+' && m.escapeCount < 3 && now.Sub(m.escapeStarted) < Guard {
				m.escapeCount++
				return a, nil
			}
			a.Data = append(a.Data, []byte(strings.Repeat("+", m.escapeCount))...)
			m.escapeCount = 0
		} else if b == '+' && now.Sub(previous) >= Guard {
			m.escapeCount = 1
			m.escapeStarted = now
			return a, nil
		}
		a.Data = append(a.Data, b)
		for _, value := range a.Data {
			if value == '\n' {
				m.lineBytes = 0
			} else {
				m.lineBytes++
			}
			if m.lineBytes > LineLimit {
				return Action{}, errors.New("bounded data line exceeded")
			}
		}
		return a, nil
	}
	if m.Echo {
		a.Reply = append(a.Reply, b)
	}
	if b == '\n' {
		return a, nil
	}
	if b == '\b' || b == 127 {
		if m.used > 0 {
			m.used--
		}
		return a, nil
	}
	if b != '\r' {
		if m.discard {
			return a, nil
		}
		if m.used == CommandLimit {
			m.used = 0
			m.discard = true
			return a, nil
		}
		m.command[m.used] = b
		m.used++
		return a, nil
	}
	if m.discard {
		m.discard = false
		m.used = 0
		a.Reply = append(a.Reply, m.result("ERROR")...)
		return a, nil
	}
	if m.used == 0 {
		return a, nil
	}
	rawCommand := string(m.command[:m.used])
	command := strings.ToUpper(rawCommand)
	m.used = 0
	a.Command = rawCommand
	switch command {
	case "AT":
		a.Reply = append(a.Reply, m.result("OK")...)
	case "ATE0", "ATE1":
		m.Echo = command == "ATE1"
		a.Reply = append(a.Reply, m.result("OK")...)
	case "ATI":
		a.Reply = append(a.Reply, []byte("\r\nRetroRealm local text modem; no external dialing\r\n")...)
		a.Reply = append(a.Reply, m.result("OK")...)
	case "ATH":
		a.Hangup = m.peer
		m.peer = false
		m.Mode = "command"
		m.escapeCount = 0
		m.lineBytes = 0
		a.Reply = append(a.Reply, m.result("OK")...)
	case "ATDLOCAL":
		if m.peer {
			a.Reply = append(a.Reply, m.result("ERROR")...)
		} else {
			m.Mode = "dialing"
			a.Dial = true
		}
	default:
		code := "ERROR"
		if strings.HasPrefix(command, "ATD") {
			code = "NO CARRIER"
		}
		a.Reply = append(a.Reply, m.result(code)...)
	}
	return a, nil
}

// DialResult is called only after the fixed peer connection has succeeded/failed.
func (m *Machine) DialResult(connected bool, now time.Time) []byte {
	if m.Mode != "dialing" {
		return nil
	}
	m.peer = connected
	m.escapeCount = 0
	m.lineBytes = 0
	m.lastInput = now
	if connected {
		m.Mode = "data"
		return m.result("CONNECT")
	}
	m.Mode = "command"
	return m.result("NO CARRIER")
}

// Tick commits a guarded +++ escape, or flushes an incomplete plus sequence.
// Peer input does not reset the guest-transmit guard interval.
func (m *Machine) Tick(now time.Time) (Action, error) {
	if m.Mode != "data" || m.escapeCount == 0 || now.Sub(m.lastInput) < Guard {
		return Action{}, nil
	}
	count := m.escapeCount
	m.escapeCount = 0
	if count == 3 {
		m.Mode = "command"
		return Action{Reply: m.result("OK")}, nil
	}
	m.lineBytes += count
	if m.lineBytes > LineLimit {
		return Action{}, errors.New("bounded data line exceeded")
	}
	return Action{Data: []byte(strings.Repeat("+", count))}, nil
}

// LostPeer returns to command mode; a later dial must be an explicit new command.
func (m *Machine) LostPeer() []byte {
	if !m.peer {
		return nil
	}
	m.peer = false
	m.Mode = "command"
	m.used = 0
	m.discard = false
	m.escapeCount = 0
	m.lineBytes = 0
	return m.result("NO CARRIER")
}
