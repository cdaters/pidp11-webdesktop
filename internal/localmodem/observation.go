package localmodem

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"time"

	"pidp11.local/webdesktop/internal/access"
	"pidp11.local/webdesktop/internal/terminalbridge"
)

var generationPattern = regexp.MustCompile(`^[a-f0-9]{24,64}(-[0-9]{1,20})?$`)
var plainText = regexp.MustCompile(`^[ -~]{0,160}$`)

// DecodeSnapshot accepts only this qualified personality's bounded observations.
// A timestamp is freshness evidence, never proof of guest identity or carrier pins.
func DecodeSnapshot(data []byte, now time.Time) (Snapshot, error) {
	var s Snapshot
	invalid := errors.New("modem observation unavailable or stale")
	if len(data) > 16384 {
		return s, invalid
	}
	d := json.NewDecoder(bytes.NewReader(data))
	d.DisallowUnknownFields()
	if d.Decode(&s) != nil {
		return Snapshot{}, invalid
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return Snapshot{}, invalid
	}
	c := terminalbridge.Config{ID: "modem", Label: "Local modem", Kind: "raw-guest-line", Address: "127.0.0.1:40103", Serial: s.Profile}
	if terminalbridge.Validate([]terminalbridge.Config{c}) != nil || s.Profile.Controller != "DC11" || s.Profile.Line != 3 || s.Profile.Unit != 0 || s.Profile.Guest != "UNIX V7" {
		return Snapshot{}, invalid
	}
	if s.Version != 1 || !generationPattern.MatchString(s.Generation) || !plainText.MatchString(s.Reason) {
		return Snapshot{}, invalid
	}
	switch s.Mode {
	case "detached", "command", "dialing", "data", "unavailable", "stopped":
	default:
		return Snapshot{}, invalid
	}
	switch s.Result {
	case "", "OK", "ERROR", "CONNECT", "NO CARRIER":
	default:
		return Snapshot{}, invalid
	}
	if s.GuestReceived > TransferLimit || s.GuestWritten > TransferLimit || s.PeerReceived > TransferLimit || s.PeerWritten > TransferLimit {
		return Snapshot{}, invalid
	}
	if s.SampleUnixMS <= 0 || s.SampleUnixMS > now.UnixMilli()+1000 || now.UnixMilli()-s.SampleUnixMS > 3000 || s.ActivityUnixMS < 0 || s.ActivityUnixMS > s.SampleUnixMS {
		return Snapshot{}, invalid
	}
	if (s.Mode == "data" && (!s.GuestConnected || !s.PeerConnected)) || (!s.GuestConnected && s.PeerConnected) {
		return Snapshot{}, invalid
	}
	return s, nil
}

// RegisterObservation exposes an optional read-only file supplied by the operator.
// No browser path, transcript, dialing, attachment or lifecycle operation exists.
func RegisterObservation(mux *http.ServeMux, gate *access.Gate, path string, read func(string) ([]byte, error)) {
	mux.Handle("GET /api/v1/modem", gate.Require(access.TerminalObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		if path == "" {
			http.Error(w, "Local modem not configured", http.StatusServiceUnavailable)
			return
		}
		data, err := read(path)
		if err != nil {
			http.Error(w, "Modem observation unavailable", http.StatusServiceUnavailable)
			return
		}
		s, err := DecodeSnapshot(data, time.Now())
		if err != nil {
			http.Error(w, "Modem observation stale or unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(s)
	})))
}
