package terminalbridge

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// SerialProfile describes an independently configured communications line.
// These are operator assertions, not automatic guest/controller discovery. The
// existing approval generation and keyboard lease still govern every operation.
// Value fields keep caller configuration immutable after construction.
type SerialProfile struct {
	Simulator   string `json:"simulator"`
	Guest       string `json:"guest"`
	Controller  string `json:"controller"`
	Unit        int    `json:"unit"`
	Line        int    `json:"line"`
	GuestDevice string `json:"guest_device"`
	Application string `json:"application"`
	Peer        string `json:"peer"`
	Framing     string `json:"framing"`
}

// Present reports whether a communications profile was explicitly provisioned.
func (p SerialProfile) Present() bool { return p != (SerialProfile{}) }

// Validate accepts only the initial qualified DC11 ASCII text profile. It does
// not prove that the configured loopback socket belongs to that device; the
// independent operator/supervisor must verify the actual mapping before approval.
func (p SerialProfile) Validate() error {
	if !p.Present() {
		return nil
	}
	if p.Controller != "DC11" || p.Unit != 0 || p.Line < 0 || p.Line > 15 ||
		p.Framing != "ascii7-raw-socket" || !regexp.MustCompile(`^[a-zA-Z0-9_-]{16,64}$`).MatchString(p.Simulator) ||
		p.GuestDevice != fmt.Sprintf("/dev/tty%02d", p.Line) {
		return errors.New("invalid qualified serial profile")
	}
	for _, text := range []string{p.Guest, p.Application, p.Peer} {
		if len(text) < 1 || len(text) > 80 || strings.TrimSpace(text) != text {
			return errors.New("bounded serial identity labels required")
		}
		for _, char := range text {
			if char < 32 || char > 126 {
				return errors.New("ASCII serial labels required")
			}
		}
	}
	return nil
}

// SerialState reports actual bridge transport accounting for one attachment.
// Written bytes reached the host socket, not necessarily the historical program.
// Pending counts this viewer's unacknowledged output; it is not a device FIFO.
// Signals are deliberately absent: socket connectivity does not prove carrier.
type SerialState struct {
	Received     uint64 `json:"received"`
	Written      uint64 `json:"written"`
	Capped       bool   `json:"capped"`
	Pending      int    `json:"pending"`
	SampleUnixMS int64  `json:"sample_unix_ms"`
}

const maxSerialCount = uint64(1<<53 - 1) // Exact in browser JSON numbers.

func addSerialCount(value *uint64, amount int, capped *bool) {
	if uint64(amount) > maxSerialCount-*value {
		*value = maxSerialCount
		*capped = true
	} else {
		*value += uint64(amount)
	}
}
