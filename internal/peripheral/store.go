// Package peripheral publishes explicitly approved, completed device output.
// It never attaches media, follows files, opens simulator control or writes a spool.
package peripheral

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"sync"
	"syscall"
)

const MaxBytes = 65536

var identifier = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$`)

// Config is an operator-owned allowlist; Path is never exposed to browsers.
// Files must be completed exports in a reserved directory, not original media.
type Config struct {
	ID   string `json:"id"`
	Kind string `json:"kind"` // lp11 or pc11-punch
	Path string `json:"path"`
}

// Snapshot is immutable observation, not a live device or guest identity oracle.
type Snapshot struct {
	ID         string `json:"id"`
	Kind       string `json:"kind"`
	Generation string `json:"generation"`
	Simulator  string `json:"simulator_generation"`
	Guest      string `json:"guest_generation"`
	State      string `json:"state"`
	SHA256     string `json:"sha256"`
	Bytes      int    `json:"bytes"`
	Data       []byte `json:"data"`
}

// Approval is accepted only on the private local control socket. Hash binds the
// operator's completed export; process/guest identities are operator attestations.
type Approval struct {
	Instance  string `json:"instance"`
	ID        string `json:"id"`
	Revision  uint64 `json:"revision"`
	Simulator string `json:"simulator_generation"`
	Guest     string `json:"guest_generation"`
	SHA256    string `json:"sha256"`
	Completed bool   `json:"completed_and_verified"`
}

type entry struct {
	config   Config
	revision uint64
	snapshot *Snapshot
}

// Store owns at most four 64-KiB copies. mu serializes publication and snapshots;
// no callbacks run under it. Concurrent reads return copies, never borrowed bytes.
type Store struct {
	mu       sync.Mutex
	instance string
	entries  map[string]*entry
}
type Status struct {
	Instance string         `json:"instance"`
	Devices  []DeviceStatus `json:"devices"`
}
type DeviceStatus struct {
	ID       string `json:"id"`
	Revision uint64 `json:"revision"`
}

func New(configs []Config) (*Store, error) {
	if len(configs) > 4 {
		return nil, errors.New("at most four device exports")
	}
	var nonce [16]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return nil, err
	}
	s := &Store{instance: hex.EncodeToString(nonce[:]), entries: make(map[string]*entry)}
	for _, c := range configs {
		if !identifier.MatchString(c.ID) || (c.Kind != "lp11" && c.Kind != "pc11-punch") || !filepath.IsAbs(c.Path) || s.entries[c.ID] != nil {
			return nil, errors.New("invalid device export allowlist")
		}
		s.entries[c.ID] = &entry{config: c}
	}
	return s, nil
}
func (s *Store) Status() Status {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := Status{Instance: s.instance, Devices: []DeviceStatus{}}
	for id, e := range s.entries {
		result.Devices = append(result.Devices, DeviceStatus{id, e.revision})
	}
	sort.Slice(result.Devices, func(i, j int) bool { return result.Devices[i].ID < result.Devices[j].ID })
	return result
}
func (s *Store) List() []Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := []Snapshot{}
	for id, e := range s.entries {
		row := Snapshot{ID: id, Kind: e.config.Kind, State: "offline"}
		if e.snapshot != nil {
			row = *e.snapshot
			row.Data = nil
		}
		result = append(result, row)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}
func (s *Store) Get(id, generation string) (Snapshot, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e := s.entries[id]
	if e == nil || e.snapshot == nil || e.snapshot.Generation != generation {
		return Snapshot{}, false
	}
	result := *e.snapshot
	result.Data = append([]byte{}, result.Data...)
	return result, true
}

// Apply consumes a revision before reading. Failed approval never leaves an older
// snapshot current. Publication is one-shot; retraction/replacement revokes its URL.
func (s *Store) Apply(a Approval, publish bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	e := s.entries[a.ID]
	if a.Instance != s.instance || e == nil || e.revision != a.Revision {
		return errors.New("stale device approval")
	}
	e.revision++
	e.snapshot = nil
	if !publish {
		return nil
	}
	if !a.Completed || !identifier.MatchString(a.Simulator) || !identifier.MatchString(a.Guest) {
		return errors.New("completed export and generation attestations required")
	}
	fd, err := syscall.Open(e.config.Path, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return errors.New("approved export unavailable")
	}
	file := os.NewFile(uintptr(fd), e.config.Path)
	defer file.Close()
	before, err := file.Stat()
	if err != nil || !before.Mode().IsRegular() || before.Size() > MaxBytes {
		return errors.New("regular export within 64 KiB required")
	}
	data, err := io.ReadAll(io.LimitReader(file, MaxBytes+1))
	after, statErr := file.Stat()
	if err != nil || statErr != nil || len(data) > MaxBytes || int64(len(data)) != before.Size() || after.Size() != before.Size() || !after.ModTime().Equal(before.ModTime()) {
		return errors.New("export changed or exceeded bounds")
	}
	digest := sha256.Sum256(data)
	sum := hex.EncodeToString(digest[:])
	if sum != a.SHA256 {
		return errors.New("completed export checksum mismatch")
	}
	if e.config.Kind == "lp11" {
		for _, b := range data {
			if b > 127 {
				return errors.New("LP11 export must be ASCII7")
			}
		}
	}
	var nonce [16]byte
	if _, err = rand.Read(nonce[:]); err != nil {
		return err
	}
	e.snapshot = &Snapshot{ID: a.ID, Kind: e.config.Kind, Generation: s.instance + "-" + hex.EncodeToString(nonce[:]), Simulator: a.Simulator, Guest: a.Guest, State: "completed", SHA256: sum, Bytes: len(data), Data: data}
	return nil
}
