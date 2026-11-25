// Package modem is an intentionally small local laboratory modem personality.
// It has no network or dial API. LOCAL selects only this object's ASCII echo peer.
// It is not a full Hayes implementation or a claim about historical V7 equipment.
package modem

import "strings"

// Machine owns one caller's bounded command buffer and virtual connection state.
// The caller serializes Feed and must discard the Machine on transport loss.
type Machine struct {
	line      [80]byte
	used      int
	discard   bool
	connected bool
}

// Connected reports this personality's local data mode, not a DC11 carrier signal.
func (m *Machine) Connected() bool { return m.connected }

// Feed consumes one ASCII byte. Replies are at most 72 bytes; data-mode bytes are
// echoed locally. There is no escape-sequence/guard-time implementation. Physical
// flow control, parity, baud timing and DTR/DSR/RTS/CTS are outside this prototype.
func (m *Machine) Feed(b byte) []byte {
	if b > 127 {
		m.used = 0
		m.discard = true
		m.connected = false
		return []byte("\r\nERROR\r\n")
	}
	if m.connected {
		return []byte{b}
	}
	if b == '\r' || b == '\n' {
		if m.discard {
			m.discard = false
			m.used = 0
			return nil
		}
		if m.used == 0 {
			return nil
		}
		command := strings.ToUpper(string(m.line[:m.used]))
		m.used = 0
		switch command {
		case "AT", "ATE0", "ATH":
			return []byte("\r\nOK\r\n")
		case "ATI":
			return []byte("\r\nM5.26 LOCAL LAB PERSONALITY; NO EXTERNAL DIALING\r\nOK\r\n")
		case "ATDLOCAL":
			m.connected = true
			return []byte("\r\nCONNECT\r\n")
		default:
			if strings.HasPrefix(command, "ATD") {
				return []byte("\r\nNO CARRIER\r\n")
			}
			return []byte("\r\nERROR\r\n")
		}
	}
	if m.discard {
		return nil
	}
	if m.used == len(m.line) {
		m.used = 0
		m.discard = true
		return []byte("\r\nERROR\r\n")
	}
	m.line[m.used] = b
	m.used++
	return nil
}
