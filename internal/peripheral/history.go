package peripheral

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"sort"
	"time"
)

// MaxHistory bounds retained terminal jobs independently of the four live slots.
// At most eight 64-KiB byte copies are kept; insertion evicts the oldest record.
const MaxHistory = 8

// Record is data, never authority. SHA256 covers the retained range; FullSHA256
// covers the entire independently completed job, when one was established.
// Times are host observations/attestations, not historical guest clock readings.
type Record struct {
	ID             string `json:"id"`
	Slot           string `json:"slot"`
	Kind           string `json:"kind"`
	Device         string `json:"device"`
	Label          string `json:"label"`
	Job            string `json:"job"`
	Generation     string `json:"generation"`
	Simulator      string `json:"simulator_generation"`
	Guest          string `json:"guest_generation"`
	Started        string `json:"started_at"`
	Ended          string `json:"ended_at"`
	Completed      string `json:"completed_at,omitempty"`
	State          string `json:"state"`
	Start          int64  `json:"start_offset"`
	Observed       int64  `json:"observed_bytes"`
	CompletedBytes int64  `json:"completed_bytes"`
	SHA256         string `json:"sha256"`
	FullSHA256     string `json:"full_sha256,omitempty"`
	Provenance     string `json:"provenance"`
	Recovered      bool   `json:"recovered"`
	Data           []byte `json:"data,omitempty"`
}

func recordID(generation string) string {
	digest := sha256.Sum256([]byte(generation))
	return hex.EncodeToString(digest[:])
}

// ValidateRecord checks a bounded retained range and its metadata. It cannot prove
// an operator's historical completion attestation; recovery requires trusted records.
func ValidateRecord(r Record) error {
	if r.ID != recordID(r.Generation) || !identifier.MatchString(r.Slot) || !identifier.MatchString(r.Device) || !identifier.MatchString(r.Job) ||
		!identifier.MatchString(r.Simulator) || !identifier.MatchString(r.Guest) || !description(r.Generation, 160) || !description(r.Label, 120) || !description(r.Provenance, 160) ||
		(r.Kind != "lp11" && r.Kind != "pc11-punch") || r.Start < 0 || r.Observed < r.Start || r.Observed > MaxJobBytes || len(r.Data) > MaxBytes || int64(len(r.Data)) != r.Observed-r.Start {
		return errors.New("invalid bounded equipment record")
	}
	started, err := time.Parse(time.RFC3339Nano, r.Started)
	if err != nil {
		return errors.New("invalid record start time")
	}
	ended, err := time.Parse(time.RFC3339Nano, r.Ended)
	if err != nil || ended.Before(started) {
		return errors.New("invalid record end time")
	}
	sum := sha256.Sum256(r.Data)
	if hex.EncodeToString(sum[:]) != r.SHA256 {
		return errors.New("retained data checksum mismatch")
	}
	if r.Kind == "lp11" {
		for _, b := range r.Data {
			if b > 127 {
				return errors.New("non-ASCII printer record")
			}
		}
	}
	switch r.State {
	case "completed":
		full, err := hex.DecodeString(r.FullSHA256)
		if err != nil || len(full) != 32 || r.Completed != r.Ended || r.CompletedBytes != r.Observed || (r.Start == 0 && r.FullSHA256 != r.SHA256) {
			return errors.New("invalid completed record")
		}
	case "incomplete", "interrupted", "expired":
		if r.Completed != "" || r.CompletedBytes != 0 || r.FullSHA256 != "" {
			return errors.New("incomplete record claims completion")
		}
	default:
		return errors.New("invalid terminal record state")
	}
	return nil
}

// remember runs only under Followers.mu, once per terminal supervised generation.
// It never copies a live job into history or changes a producer approval.
func (f *Followers) remember(e *following) {
	if e == nil || e.config.Session == nil || e.recorded || e.started.IsZero() || e.view.State == "observing" {
		return
	}
	state := map[string]string{"completed": "completed", "disconnected": "expired", "faulted": "interrupted", "detached": "incomplete"}[e.view.State]
	if state == "" {
		return
	}
	v := e.view
	ended := f.now()
	if ended.Before(e.started) {
		ended = e.started
	} // Wall-clock correction cannot invert a record.
	r := Record{ID: recordID(v.Generation), Slot: v.ID, Kind: v.Kind, Device: v.Device, Label: v.Label, Job: v.Job, Generation: v.Generation, Simulator: v.Simulator, Guest: v.Guest, Started: e.started.UTC().Format(time.RFC3339Nano), Ended: ended.UTC().Format(time.RFC3339Nano), State: state, Start: v.Total - int64(len(e.retained)), Observed: v.Total, Provenance: "Operator-attested guest/device; original emulator spool; completion requires independent close", Data: append([]byte{}, e.retained...)}
	sum := sha256.Sum256(r.Data)
	r.SHA256 = hex.EncodeToString(sum[:])
	if state == "completed" {
		r.Completed = r.Ended
		r.CompletedBytes = v.Total
		r.FullSHA256 = v.SHA256
	}
	f.insertRecord(r)
	e.recorded = true
}
func (f *Followers) insertRecord(r Record) {
	if len(f.history) == MaxHistory {
		f.history = append(f.history[:0], f.history[1:]...)
	}
	f.history = append(f.history, r)
}

// History returns detached metadata copies. Explicit reads return copied bytes.
func (f *Followers) History() []Record {
	f.mu.Lock()
	defer f.mu.Unlock()
	rows := make([]Record, 0, len(f.history))
	for _, r := range f.history {
		r.Data = nil
		rows = append(rows, r)
	}
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].Ended > rows[j].Ended })
	return rows
}
func (f *Followers) HistoryRecord(id string) (Record, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, r := range f.history {
		if r.ID == id {
			r.Data = append([]byte{}, r.Data...)
			return r, true
		}
	}
	return Record{}, false
}

// Recover adds verified retained data through private local operator control.
// It does not open a spool, renew authority, restore a session or create an export.
func (f *Followers) Recover(r Record) error {
	if err := ValidateRecord(r); err != nil {
		return err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	e := f.entries[r.Slot]
	if f.closed || e == nil || e.config.Session == nil || e.config.Kind != r.Kind || e.config.Session.Device != r.Device {
		return errors.New("record not in configured equipment allowlist")
	}
	for _, old := range f.history {
		if old.ID == r.ID {
			return errors.New("record already retained; never replace it")
		}
	}
	r.Recovered = true
	r.Data = append([]byte{}, r.Data...)
	f.insertRecord(r)
	return nil
}
