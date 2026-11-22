// Package replicant translates deliberately shared guest excerpts into the
// Hacker Replicant readback shape. It is NOT an adapter to the operator console.
// The optional authenticated HTTP adapter serves only explicit selections.
// No terminal read, keyboard write or process operation exists here.
package replicant

import (
	"encoding/json"
	"errors"
	"unicode/utf8"
)

// Selection is supplied by an explicit user sharing action. Caller must obtain
// generation from the existing authenticated terminal, never a model response.
type Selection struct {
	Endpoint   string `json:"endpoint"`
	Generation string `json:"generation"`
	Text       string `json:"text"`
}

// Snapshot retains the upstream text field but identifies the narrower meaning.
// The text is a selection, not a complete or current GNU Screen hardcopy.
type Snapshot struct {
	Text       string `json:"text"`
	Semantics  string `json:"semantics"`
	Endpoint   string `json:"endpoint"`
	Generation string `json:"generation"`
}

// Readback is a pure conversion, requiring caller-confirmed sharing and matching
// attachment identity. It never refreshes data or infers current machine state.
func Readback(selection Selection, endpoint, generation string, consent bool) (Snapshot, error) {
	if !consent || selection.Endpoint == "" || selection.Generation == "" || selection.Endpoint != endpoint || selection.Generation != generation || len(selection.Endpoint) > 128 || len(selection.Generation) > 128 || len(selection.Text) > 4096 || !utf8.ValidString(selection.Text) {
		return Snapshot{}, errors.New("explicit bounded selection and current attachment required")
	}
	return Snapshot{selection.Text, "explicit-guest-selection; not operator console or live screen", selection.Endpoint, selection.Generation}, nil
}

// DecodeStatus preserves the upstream claim without turning Screen existence
// into a CPU RUN observation or an authenticated guest attachment identity.
func DecodeStatus(data []byte) (map[string]any, error) {
	if len(data) > 1024 {
		return nil, errors.New("status size limit")
	}
	var value struct {
		OS      *string `json:"os"`
		Running *bool   `json:"running"`
	}
	if json.Unmarshal(data, &value) != nil || value.Running == nil || (value.OS != nil && len(*value.OS) > 128) {
		return nil, errors.New("invalid upstream status")
	}
	return map[string]any{"upstream_screen_exists": *value.Running, "upstream_os_claim": value.OS, "cpu_running": "unknown", "guest_attachment": "unverified"}, nil
}

// Keys always refuses upstream automatic keyboard input. A future integration
// must use the existing separate, human-operated proposal/lease flow. Even the
// three locally approved suggestions are not authorization through this API.
func Keys(_ string) error {
	return errors.New("automatic keys unsupported; use existing human command review")
}
