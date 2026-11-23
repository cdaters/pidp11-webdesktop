package peripheral

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"hash"
	"io"
	"os"
	"path/filepath"
	"sync"
	"syscall"
	"time"
)

const (
	FollowChunk   = 8192
	MaxJobBytes   = 1024 * 1024
	ProducerLease = 5 * time.Second
)

// FollowConfig names reserved local files. ReaderPath optionally pairs an
// immutable PC11 input with its punch. No browser can supply either path.
type FollowConfig struct {
	Session    *SessionConfig `json:"session,omitempty"`
	ID         string         `json:"id"`
	Kind       string         `json:"kind"`
	Path       string         `json:"path"`
	ReaderPath string         `json:"reader_path,omitempty"`
}

// FollowApproval is local-operator authority only. Renewals attest continued
// producer identity; they do not prove CPU execution or provide simulator control.
type FollowApproval struct {
	Generation    string `json:"generation,omitempty"`
	Owner         string `json:"owner,omitempty"`
	Job           string `json:"job,omitempty"`
	Evidence      string `json:"evidence,omitempty"`
	ProducedBytes int64  `json:"produced_bytes,omitempty"`
	Instance      string `json:"instance"`
	ID            string `json:"id"`
	Revision      uint64 `json:"revision"`
	Simulator     string `json:"simulator_generation"`
	Guest         string `json:"guest_generation"`
	Verified      bool   `json:"producer_verified"`
	SHA256        string `json:"sha256,omitempty"`
	ReaderSHA256  string `json:"reader_sha256,omitempty"`
	ReaderBytes   int    `json:"reader_bytes,omitempty"`
	ReaderEOF     bool   `json:"reader_eof,omitempty"`
}

// FollowView is an ordered slice of a specific observation, never a live-machine
// identity oracle. Reader progress is explicitly reported by the local operator.
type FollowView struct {
	Owner         string `json:"owner,omitempty"`
	Job           string `json:"job,omitempty"`
	Phase         string `json:"phase,omitempty"`
	Device        string `json:"device,omitempty"`
	Label         string `json:"label,omitempty"`
	ProducedBytes int64  `json:"produced_bytes,omitempty"`
	ID            string `json:"id"`
	Kind          string `json:"kind"`
	Generation    string `json:"generation"`
	Simulator     string `json:"simulator_generation"`
	Guest         string `json:"guest_generation"`
	State         string `json:"state"`
	Message       string `json:"message"`
	Sequence      uint64 `json:"sequence"`
	Start         int64  `json:"start_offset"`
	Next          int64  `json:"next_offset"`
	Total         int64  `json:"total_bytes"`
	Lost          bool   `json:"lost"`
	Data          []byte `json:"data"`
	SHA256        string `json:"sha256"`
	ReaderLength  int    `json:"reader_length"`
	ReaderBytes   int    `json:"reader_bytes"`
	ReaderEOF     bool   `json:"reader_eof"`
	ReaderSHA256  string `json:"reader_sha256"`
}

type following struct {
	config   FollowConfig
	revision uint64
	view     FollowView
	file     *os.File
	identity os.FileInfo
	modified time.Time
	deadline time.Time
	retained []byte
	digest   hash.Hash
	reader   []byte
}

// Followers owns four bounded tails and one polling goroutine. mu serializes
// file lifetime, local approvals and snapshots; no emulator callback or public
// socket write runs under it. Only reserved regular local files are supported.
// Start's context owns polling; Close releases descriptors and waits for it.
type Followers struct {
	mu       sync.Mutex
	instance string
	entries  map[string]*following
	now      func() time.Time
	cancel   context.CancelFunc
	done     chan struct{}
	closed   bool // Close is permanent; a late control request cannot reopen files.
}

func NewFollowers(configs []FollowConfig) (*Followers, error) {
	if len(configs) > 4 {
		return nil, errors.New("at most four peripheral followers")
	}
	instance, err := nonce()
	if err != nil {
		return nil, err
	}
	f := &Followers{instance: instance, entries: map[string]*following{}, now: time.Now}
	for _, c := range configs {
		if !identifier.MatchString(c.ID) || !filepath.IsAbs(c.Path) || (c.Kind != "lp11" && c.Kind != "pc11-punch") || f.entries[c.ID] != nil || (c.ReaderPath != "" && (!filepath.IsAbs(c.ReaderPath) || c.Kind != "pc11-punch")) {
			return nil, errors.New("invalid peripheral follower allowlist")
		}
		if err := validateSession(c); err != nil {
			return nil, err
		}
		f.entries[c.ID] = &following{config: c, view: FollowView{ID: c.ID, Kind: c.Kind, State: "detached"}}
	}
	return f, nil
}
func nonce() (string, error) {
	var n [16]byte
	_, err := rand.Read(n[:])
	return hex.EncodeToString(n[:]), err
}

func (f *Followers) Start(ctx context.Context) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.cancel != nil || f.closed {
		return
	}
	ctx, f.cancel = context.WithCancel(ctx)
	f.done = make(chan struct{})
	go func() {
		defer close(f.done)
		tick := time.NewTicker(200 * time.Millisecond)
		defer tick.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-tick.C:
				f.poll()
			}
		}
	}()
}
func (f *Followers) Close() {
	f.mu.Lock()
	f.closed = true
	cancel, done := f.cancel, f.done
	f.mu.Unlock()
	if cancel != nil {
		cancel()
		<-done
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, e := range f.entries {
		retire(e, "disconnected", "Observer service stopped")
	}
}
func (f *Followers) Status() Status {
	f.mu.Lock()
	defer f.mu.Unlock()
	s := Status{Instance: f.instance, Devices: []DeviceStatus{}}
	for id, e := range f.entries {
		s.Devices = append(s.Devices, DeviceStatus{id, e.revision})
	}
	return s
}
func (f *Followers) List() []FollowView {
	f.mu.Lock()
	defer f.mu.Unlock()
	rows := []FollowView{}
	for _, e := range f.entries {
		v := e.view
		v.Data = nil
		v.Start = v.Total - int64(len(e.retained))
		v.Next = v.Total
		rows = append(rows, v)
	}
	return rows
}
func (f *Followers) Read(id, generation string, after int64) (FollowView, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	e := f.entries[id]
	if e == nil || generation == "" || e.view.Generation != generation || after < 0 || after > e.view.Total {
		return FollowView{}, false
	}
	v := e.view
	first := v.Total - int64(len(e.retained))
	v.Lost = after < first
	if after < first {
		after = first
	}
	v.Start = after
	end := after + FollowChunk
	if end > v.Total {
		end = v.Total
	}
	v.Next = end
	v.Data = append([]byte{}, e.retained[after-first:end-first]...)
	return v, true
}

func openRegular(path string, max int64) (*os.File, os.FileInfo, error) {
	fd, err := syscall.Open(path, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return nil, nil, errors.New("approved local file unavailable")
	}
	file := os.NewFile(uintptr(fd), path)
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() || info.Size() > max {
		file.Close()
		return nil, nil, errors.New("bounded regular local file required")
	}
	return file, info, nil
}
func retire(e *following, state, message string) {
	if e.file != nil {
		e.file.Close()
		e.file = nil
	}
	e.view.State = state
	if e.config.Session != nil {
		e.view.Phase = state
	}
	e.view.Message = message
	e.view.Sequence++
}

// Apply consumes a revision even on failure. Following begins only at an empty
// spool; replacing an uncertain producer requires a new explicit generation.
func (f *Followers) Apply(op string, a FollowApproval) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	e := f.entries[a.ID]
	if f.closed || e == nil || a.Instance != f.instance || a.Revision != e.revision {
		return errors.New("stale peripheral approval")
	}
	// A delayed owner must not revoke or complete a replacement generation.
	if e.config.Session != nil && (a.Generation != e.view.Generation || (op != "follow" && a.Owner != e.view.Owner)) {
		return errors.New("stale equipment session owner or generation")
	}
	e.revision++
	fail := func(message string) error { retire(e, "faulted", message); return errors.New(message) }
	if op == "detach" {
		retire(e, "disconnected", "Operator detached observation")
		return nil
	}
	if !a.Verified || !identifier.MatchString(a.Simulator) || !identifier.MatchString(a.Guest) {
		return fail("verified producer identities required")
	}
	if op == "follow" {
		if e.config.Session != nil {
			if e.view.State == "observing" {
				return errors.New("active session must be explicitly retired first")
			}
			if !identifier.MatchString(a.Owner) || !identifier.MatchString(a.Job) {
				return errors.New("explicit supervisor and job identities required")
			}
		}
		// Prepare a supervised replacement transactionally. A missing/old spool
		// or invalid reader must not erase the prior generation's retained data.
		previous := e
		if e.config.Session != nil {
			e = &following{config: previous.config, revision: previous.revision}
		}
		retire(e, "detached", "Starting a new approved observation")
		generation, err := nonce()
		if err != nil {
			return err
		}
		e.retained = nil
		e.reader = nil
		e.digest = sha256.New()
		e.view = FollowView{ID: e.config.ID, Kind: e.config.Kind, Generation: f.instance + "-" + generation, Simulator: a.Simulator, Guest: a.Guest, State: "detached"}
		if c := e.config.Session; c != nil {
			e.view.Owner, e.view.Job, e.view.Phase = a.Owner, a.Job, "observing"
			e.view.Device, e.view.Label = c.Device, c.Label
			if c.Reader != nil && a.ReaderSHA256 != c.Reader.SHA256 {
				return fail("reader is not the allowlisted media identity")
			}
		}
		file, info, err := openRegular(e.config.Path, 0)
		if err != nil {
			return fail("fresh empty spool required; old output is never replayed")
		}
		e.file = file
		e.identity = info
		e.modified = info.ModTime()
		if e.config.ReaderPath != "" {
			reader, before, err := openRegular(e.config.ReaderPath, MaxBytes)
			if err != nil {
				return fail("verified reader image unavailable")
			}
			data, readErr := io.ReadAll(io.LimitReader(reader, MaxBytes+1))
			after, statErr := reader.Stat()
			reader.Close()
			sum := sha256.Sum256(data)
			if (e.config.Session != nil && before.Mode().Perm()&0222 != 0) || readErr != nil || statErr != nil || len(data) > MaxBytes || int64(len(data)) != before.Size() || after.Size() != before.Size() || !after.ModTime().Equal(before.ModTime()) || hex.EncodeToString(sum[:]) != a.ReaderSHA256 {
				return fail("reader image checksum or identity changed")
			}
			e.reader = data
			e.view.ReaderLength = len(data)
			e.view.ReaderSHA256 = a.ReaderSHA256
		}
		e.deadline = f.now().Add(ProducerLease)
		e.view.State = "observing"
		e.view.Message = "Following host-visible device writes; producer identity is operator verified"
		e.view.Sequence++
		if e != previous {
			*previous = *e
		}
		return nil
	}
	if e.file == nil || e.view.State != "observing" || a.Simulator != e.view.Simulator || a.Guest != e.view.Guest || !f.now().Before(e.deadline) {
		return fail("producer approval expired or generation changed")
	}
	switch op {
	case "renew":
		e.deadline = f.now().Add(ProducerLease)
	case "progress":
		if e.reader == nil || a.ReaderBytes < e.view.ReaderBytes || a.ReaderBytes > len(e.reader) || (a.ReaderEOF && a.ReaderBytes != len(e.reader)) || (e.view.ReaderEOF && !a.ReaderEOF) {
			return fail("invalid reported reader progress")
		}
		e.view.ReaderBytes = a.ReaderBytes
		e.view.ReaderEOF = a.ReaderEOF
		e.view.Sequence++
	case "guest-returned", "drained", "closed":
		if err := advanceSession(e, op, a); err != nil {
			return fail(err.Error())
		}
	case "complete":
		// At most one MiB is drained. Completion requires producer close/flush and an
		// independently computed full-file checksum, not an idle-period heuristic.
		for i := 0; i <= MaxJobBytes/FollowChunk; i++ {
			before := e.view.Total
			f.pollEntry(e)
			if e.file == nil {
				return errors.New(e.view.Message)
			}
			if e.view.Total == before {
				break
			}
		}
		if e.config.Session != nil && (e.view.Phase != "closed" || e.view.Total != e.view.ProducedBytes) {
			return fail("explicit safe close and exact flushed length required")
		}
		sum := hex.EncodeToString(e.digest.Sum(nil))
		if a.SHA256 != sum {
			return fail("completed spool checksum mismatch")
		}
		e.view.SHA256 = sum
		retire(e, "completed", "Producer completion verified; retained bytes remain read-only")
	default:
		return fail("unsupported peripheral operation")
	}
	return nil
}
func (f *Followers) poll() {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, e := range f.entries {
		if e.file != nil {
			f.pollEntry(e)
		}
	}
}
func (f *Followers) pollEntry(e *following) {
	if !f.now().Before(e.deadline) {
		retire(e, "disconnected", "Producer approval expired; renew requires a new observation")
		return
	}
	path, err := os.Lstat(e.config.Path)
	if err != nil || !path.Mode().IsRegular() || !os.SameFile(path, e.identity) {
		retire(e, "faulted", "Spool removed, rotated or replaced; explicit new approval required")
		return
	}
	info, err := e.file.Stat()
	if err != nil || info.Size() < e.view.Total || info.Size() > MaxJobBytes {
		retire(e, "faulted", "Spool truncated, unavailable or exceeded one MiB job bound")
		return
	}
	// Verify the retained observed window before accepting an append. A spool
	// can be truncated and regrown to a larger size between polls without changing
	// its inode. This check is bounded to 64 KiB; older discarded prefixes still
	// require the independently verified full-file hash at completion.
	if len(e.retained) > 0 {
		prior := make([]byte, len(e.retained))
		n, err := e.file.ReadAt(prior, e.view.Total-int64(len(prior)))
		if err != nil || n != len(prior) || !bytes.Equal(prior, e.retained) {
			retire(e, "faulted", "Previously observed spool bytes changed; observation retired")
			return
		}
	}
	if info.Size() == e.view.Total {
		if !info.ModTime().Equal(e.modified) {
			retire(e, "faulted", "Spool modified without append; observation retired")
		}
		return
	}
	data := make([]byte, FollowChunk)
	n, err := e.file.ReadAt(data, e.view.Total)
	if err != nil && err != io.EOF {
		retire(e, "faulted", "Spool read failed")
		return
	}
	data = data[:n]
	if e.config.Kind == "lp11" {
		for _, b := range data {
			if b > 127 {
				retire(e, "faulted", "LP11 byte outside ASCII7")
				return
			}
		}
	}
	e.digest.Write(data)
	e.retained = append(e.retained, data...)
	if len(e.retained) > MaxBytes {
		e.retained = append([]byte{}, e.retained[len(e.retained)-MaxBytes:]...)
	}
	e.view.Total += int64(n)
	e.modified = info.ModTime()
	if n > 0 {
		e.view.Sequence++
	}
}
