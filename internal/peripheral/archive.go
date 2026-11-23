package peripheral

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"syscall"
)

const MaxRecordFile = 100000

var recordName = regexp.MustCompile(`^[a-f0-9]{64}$`)

type recordEnvelope struct {
	Version int    `json:"version"`
	Record  Record `json:"record"`
	SHA256  string `json:"record_sha256"`
}

// archiveRoot reserves an operator-owned directory. os.Root confines all later
// accesses to it; no browser participates. A small lock directory serializes writers.
// A stale lock is a visible error requiring operator inspection, never auto-removal.
func archiveRoot(directory string) (*os.Root, error) {
	if !filepath.IsAbs(directory) {
		return nil, errors.New("absolute configured archive directory required")
	}
	info, err := os.Lstat(directory)
	if err != nil {
		return nil, err
	}
	owner, ok := info.Sys().(*syscall.Stat_t)
	if !ok || !info.IsDir() || info.Mode().Perm() != 0700 || int(owner.Uid) != os.Geteuid() {
		return nil, errors.New("reserved owner-only archive directory required (0700)")
	}
	root, err := os.OpenRoot(directory)
	if err != nil {
		return nil, err
	}
	if err = root.Mkdir(".lock", 0700); err != nil {
		root.Close()
		return nil, errors.New("archive locked; inspect prior operation without replay")
	}
	file, err := root.Open(".")
	if err != nil {
		releaseArchive(root)
		return nil, err
	}
	entries, readErr := file.ReadDir(MaxHistory + 2)
	file.Close()
	if readErr != nil && readErr != io.EOF {
		releaseArchive(root)
		return nil, readErr
	}
	count := 0
	for _, entry := range entries {
		if entry.Name() == ".lock" {
			continue
		}
		name := entry.Name()
		if len(name) != 69 || name[64:] != ".json" || !recordName.MatchString(name[:64]) || !entry.Type().IsRegular() {
			releaseArchive(root)
			return nil, errors.New("unexpected archive entry; inspect without deleting")
		}
		count++
	}
	if count > MaxHistory {
		releaseArchive(root)
		return nil, errors.New("archive record limit exceeded")
	}
	return root, nil
}
func releaseArchive(root *os.Root) { root.Remove(".lock"); root.Close() }

// SaveRecord writes an immutable, independently checksummed envelope to the
// preconfigured private directory. Eight records maximum; full archives refuse
// new writes. No automatic eviction, deletion or authority persistence occurs.
func SaveRecord(directory string, r Record) error {
	if err := ValidateRecord(r); err != nil {
		return err
	}
	root, err := archiveRoot(directory)
	if err != nil {
		return err
	}
	defer releaseArchive(root)
	dir, err := root.Open(".")
	if err != nil {
		return err
	}
	entries, err := dir.ReadDir(MaxHistory + 2)
	dir.Close()
	if err != nil && err != io.EOF {
		return err
	}
	if len(entries) >= MaxHistory+1 {
		return errors.New("archive full; preserve records and provision a new explicit directory")
	}
	encoded, err := json.Marshal(r)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(encoded)
	data, err := json.Marshal(recordEnvelope{1, r, hex.EncodeToString(sum[:])})
	if err != nil {
		return err
	}
	if len(data) > MaxRecordFile {
		return errors.New("record envelope too large")
	}
	file, err := root.OpenFile(r.ID+".json", os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	// A failed write remains visible and is never repaired or overwritten silently.
	_, writeErr := file.Write(data)
	syncErr := file.Sync()
	closeErr := file.Close()
	if writeErr != nil {
		return writeErr
	}
	if syncErr != nil {
		return syncErr
	}
	return closeErr
}

// LoadRecord rereads one exact allowlisted identity. Strict decoding, metadata
// digest and data digest must pass before a record can be explicitly recovered.
func LoadRecord(directory, id string) (Record, error) {
	if !recordName.MatchString(id) {
		return Record{}, errors.New("invalid artifact identity")
	}
	root, err := archiveRoot(directory)
	if err != nil {
		return Record{}, err
	}
	defer releaseArchive(root)
	file, err := root.OpenFile(id+".json", os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return Record{}, err
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() || info.Mode().Perm() != 0600 || info.Size() > MaxRecordFile {
		return Record{}, errors.New("bounded private record required")
	}
	data, err := io.ReadAll(io.LimitReader(file, MaxRecordFile+1))
	if err != nil || len(data) > MaxRecordFile {
		return Record{}, errors.New("record read exceeds bound")
	}
	var envelope recordEnvelope
	var extra any
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&envelope) != nil || decoder.Decode(&extra) != io.EOF || envelope.Version != 1 || envelope.Record.ID != id {
		return Record{}, errors.New("invalid record envelope")
	}
	encoded, err := json.Marshal(envelope.Record)
	if err != nil {
		return Record{}, err
	}
	sum := sha256.Sum256(encoded)
	if hex.EncodeToString(sum[:]) != envelope.SHA256 {
		return Record{}, errors.New("record metadata checksum mismatch")
	}
	if err := ValidateRecord(envelope.Record); err != nil {
		return Record{}, err
	}
	return envelope.Record, nil
}
