// Package storage accepts explicitly approved captured storage facts. It has no
// simulator connection, media handle, command channel or automatic renewal.
package storage

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"regexp"
	"sync"
	"time"
)

const MaxDevices = 4
const MaxRecord = 8192
const FreshFor = 30 * time.Second

var identifier = regexp.MustCompile(`^[A-Za-z0-9_-]{1,80}$`)
var hash = regexp.MustCompile(`^[a-f0-9]{64}$`)

// Config is an operator-owned allowlist, not an attachment approval. Paths never
// enter the service or browser. Only these two initially qualified families work.
type Config struct {
	ID         string `json:"id"`
	Device     string `json:"device"`
	Controller string `json:"controller"`
	Unit       int    `json:"unit"`
}

// Snapshot keeps configuration, attachment and guest access as separate evidence.
// Status is captured at a quiescent boundary, never a continuous activity feed.
// SHA256 identifies bytes at capture time, not a mutable image's future contents.
type Snapshot struct {
	ID              string `json:"id"`
	Device          string `json:"device"`
	Controller      string `json:"controller"`
	Unit            int    `json:"unit"`
	Simulator       string `json:"simulator"`
	Guest           string `json:"guest"`
	Capture         string `json:"capture"`
	CapturedAt      string `json:"captured_at"`
	Family          string `json:"family"`
	Configured      bool   `json:"configured"`
	Attachment      string `json:"attachment"`
	Media           string `json:"media"`
	Provenance      string `json:"provenance"`
	SHA256          string `json:"sha256"`
	Size            int64  `json:"size"`
	Format          string `json:"format"`
	Capacity        int64  `json:"capacity"`
	Geometry        string `json:"geometry"`
	WriteProtection string `json:"write_protection"`
	GuestAccess     string `json:"guest_access"`
	GuestEvidence   string `json:"guest_evidence"`
	Activity        string `json:"activity"`
	Position        int64  `json:"position"`
	PositionMeaning string `json:"position_meaning"`
	Ready           string `json:"ready"`
	Filemark        string `json:"filemark"`
	EndOfMedium     string `json:"end_of_medium"`
	Registers       string `json:"registers"`
	Source          string `json:"source"`
}

// View adds service lifecycle to immutable captured facts. Retained records are
// never promoted into live telemetry by fetching or displaying them.
type View struct {
	Snapshot
	Generation string `json:"generation"`
	Freshness  string `json:"freshness"`
	Mode       string `json:"mode"`
}
type Status struct {
	Instance string `json:"instance"`
	Revision uint64 `json:"revision"`
}
type Approval struct {
	Instance   string   `json:"instance"`
	Revision   uint64   `json:"revision"`
	Verified   bool     `json:"verified"`
	Snapshot   Snapshot `json:"snapshot"`
	ID         string   `json:"id,omitempty"`
	Generation string   `json:"generation,omitempty"`
}

// Store owns at most four metadata records. mu protects all fields. Get/List
// return values, not mutable shared state. Restart creates a new empty instance.
type Store struct {
	mu      sync.Mutex
	status  Status
	config  []Config
	records map[string]View
	now     func() time.Time
}

func nonce() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b[:])
}
func validConfig(c Config) bool {
	return identifier.MatchString(c.ID) && c.Unit == 0 && ((c.Device == "RL0" && c.Controller == "RL11") || (c.Device == "TM0" && c.Controller == "TM11") || (c.Device == "RP0" && c.Controller == "RH70"))
}
func New(config []Config) (*Store, error) {
	if len(config) > MaxDevices {
		return nil, errors.New("at most four storage entries")
	}
	seen := map[string]bool{}
	devices := map[string]bool{}
	for _, c := range config {
		if !validConfig(c) || seen[c.ID] || devices[c.Device] {
			return nil, errors.New("unsupported or duplicate storage device")
		}
		seen[c.ID] = true
		devices[c.Device] = true
	}
	return &Store{status: Status{Instance: nonce()}, config: append([]Config{}, config...), records: map[string]View{}, now: time.Now}, nil
}
func text(s string, max int) bool {
	if len(s) == 0 || len(s) > max {
		return false
	}
	for _, r := range s {
		if r < 32 || r > 126 {
			return false
		}
	}
	return true
}
func one(value string, choices ...string) bool {
	for _, c := range choices {
		if value == c {
			return true
		}
	}
	return false
}

// Validate rejects invented activity and inconsistent family/controller claims.
// It validates attestations, not their historical truth; independent evidence is required.
func Validate(s Snapshot) error {
	if !validConfig(Config{s.ID, s.Device, s.Controller, s.Unit}) || !identifier.MatchString(s.Simulator) || !identifier.MatchString(s.Guest) || !identifier.MatchString(s.Capture) {
		return errors.New("invalid storage identity")
	}
	if !s.Configured || s.Attachment != "attached" || !hash.MatchString(s.SHA256) || s.Size <= 0 || s.Size > 256<<20 || s.Capacity < 0 || s.Capacity > 1<<40 {
		return errors.New("verified bounded attachment required")
	}
	for _, v := range []string{s.Media, s.Provenance, s.Geometry, s.GuestEvidence, s.PositionMeaning, s.Source, s.Registers} {
		if !text(v, 512) {
			return errors.New("invalid bounded evidence text")
		}
	}
	if !one(s.WriteProtection, "read-only", "guest-writable", "unknown") || !one(s.GuestAccess, "observed", "unavailable", "unknown") || s.Activity != "unavailable" || !one(s.Ready, "observed-ready", "observed-error", "unknown") || !one(s.Filemark, "observed", "not-observed", "unavailable") || !one(s.EndOfMedium, "observed", "not-observed", "unavailable") {
		return errors.New("unsupported storage fact")
	}
	if s.Device == "RL0" {
		if s.Family != "RL02" || s.Format != "SIMH disk" || s.Capacity != 10485760 || s.Position != -1 || s.PositionMeaning != "unavailable" || s.Filemark != "unavailable" || s.EndOfMedium != "unavailable" {
			return errors.New("invalid RL02 geometry/status")
		}
	}
	// Only the original 11/70 RH70/RP06 configuration qualified in M5.24.
	// RH11 adapters, other RP models and units need independent evidence.
	if s.Device == "RP0" {
		if s.Family != "RP06" || s.Format != "SIMH disk" || s.Capacity != 174423040 || s.Geometry != "815 cylinders; 19 heads; 22 sectors per track; 512-byte sectors" || s.Position != -1 || s.PositionMeaning != "unavailable" || s.Filemark != "unavailable" || s.EndOfMedium != "unavailable" {
			return errors.New("invalid RP06 geometry/status")
		}
	}
	if s.Device == "TM0" {
		if s.Family != "TU10" || s.Format != "SIMH tape" || s.Position < 0 || s.Position > s.Size || s.PositionMeaning != "SIMH logical image byte offset; not host file cursor or physical tape length" || s.Geometry != "unavailable" {
			return errors.New("invalid TM11 position/status")
		}
	}
	if _, err := time.Parse(time.RFC3339Nano, s.CapturedAt); err != nil {
		return errors.New("invalid capture timestamp")
	}
	return nil
}
func (s *Store) Status() Status { s.mu.Lock(); defer s.mu.Unlock(); return s.status }
func (s *Store) Publish(a Approval) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !a.Verified || a.Instance != s.status.Instance || a.Revision != s.status.Revision {
		return errors.New("stale or unverified approval")
	}
	s.status.Revision++ // Consume once even on invalid publication; never replay uncertainty.
	if err := Validate(a.Snapshot); err != nil {
		return err
	}
	v := a.Snapshot
	matched := false
	for _, c := range s.config {
		if c == (Config{v.ID, v.Device, v.Controller, v.Unit}) {
			matched = true
		}
	}
	if !matched {
		return errors.New("device not in operator allowlist")
	}
	when, _ := time.Parse(time.RFC3339Nano, v.CapturedAt)
	age := s.now().Sub(when)
	if age < 0 || age > FreshFor {
		return errors.New("capture outside freshness window")
	}
	if old, ok := s.records[v.ID]; ok {
		previous, _ := time.Parse(time.RFC3339Nano, old.CapturedAt)
		if old.Capture == v.Capture || !when.After(previous) {
			return errors.New("capture replay or ordering rejected")
		}
	}
	s.records[v.ID] = View{Snapshot: v, Generation: s.status.Instance + "-" + nonce(), Freshness: "observed", Mode: "captured-snapshot"}
	return nil
}
func (s *Store) Revoke(a Approval) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.records[a.ID]
	if !ok || !a.Verified || a.Instance != s.status.Instance || a.Revision != s.status.Revision || a.Generation != v.Generation {
		return errors.New("stale revocation")
	}
	s.status.Revision++
	v.Freshness = "disconnected"
	s.records[a.ID] = v
	return nil
}
func (s *Store) view(v View) View {
	when, _ := time.Parse(time.RFC3339Nano, v.CapturedAt)
	if v.Freshness == "observed" && (s.now().Before(when) || s.now().Sub(when) > FreshFor) {
		v.Freshness = "stale"
		s.records[v.ID] = v // Expiry stays retired even if the wall clock moves back.
	}
	return v
}
func (s *Store) List() []View {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := make([]View, 0, len(s.records))
	for _, c := range s.config {
		if v, ok := s.records[c.ID]; ok {
			rows = append(rows, s.view(v))
		}
	}
	return rows
}
func (s *Store) Get(id, generation string) (View, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.records[id]
	return s.view(v), ok && v.Generation == generation
}
