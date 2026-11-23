package peripheral

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"strings"
)

// SessionConfig opts an allowlisted spool into generation/owner fences and explicit
// operator completion stages. This is observation authority, never SIMH control.
// Four configured slots bound job history; reuse retires that slot's old generation.
type SessionConfig struct {
	Device string       `json:"device"`
	Label  string       `json:"label"`
	Reader *ReaderMedia `json:"reader,omitempty"`
}

// ReaderMedia is operator-provisioned metadata, not a browser-supplied host path.
type ReaderMedia struct {
	Name       string `json:"name"`
	Format     string `json:"format"`
	Provenance string `json:"provenance"`
	SHA256     string `json:"sha256"`
}

// MediaView describes a bounded catalog snapshot, not an attached-device claim.
type MediaView struct {
	ID string `json:"id"`
	ReaderMedia
	Bytes      int64  `json:"bytes"`
	Verified   bool   `json:"verified"`
	ReadOnly   bool   `json:"read_only"`
	Generation string `json:"generation"`
	Message    string `json:"message"`
}

func description(s string, max int) bool {
	return s != "" && len(s) <= max && strings.IndexFunc(s, func(r rune) bool { return r < 32 || r == 127 }) < 0
}
func validateSession(c FollowConfig) error {
	s := c.Session
	if s == nil {
		return nil
	}
	if !identifier.MatchString(s.Device) || !description(s.Label, 120) {
		return errors.New("invalid equipment description")
	}
	if (s.Reader == nil) != (c.ReaderPath == "") {
		return errors.New("session reader requires an allowlisted identity")
	}
	if r := s.Reader; r != nil {
		sum, err := hex.DecodeString(r.SHA256)
		if err != nil || len(sum) != 32 || !description(r.Name, 80) || !description(r.Format, 80) || !description(r.Provenance, 160) {
			return errors.New("invalid reader catalog metadata")
		}
	}
	return nil
}

// advanceSession accepts independently witnessed evidence in strict order. The
// operator must inspect the conventional guest/device boundary; these labels do
// not discover OS identity or prove safety from absence of activity.
// Caller holds Followers.mu. No monitor instruction or device write occurs here.
func advanceSession(e *following, op string, a FollowApproval) error {
	if e.config.Session == nil || !description(a.Evidence, 160) {
		return errors.New("supervised session and independent evidence required")
	}
	expected := map[string]string{"guest-returned": "observing", "drained": "guest-returned", "closed": "drained"}
	if e.view.Phase != expected[op] {
		return errors.New("equipment completion stages out of order")
	}
	if op == "drained" {
		if a.ProducedBytes < e.view.Total || a.ProducedBytes > MaxJobBytes {
			return errors.New("invalid independently observed device length")
		}
		e.view.ProducedBytes = a.ProducedBytes
	}
	if op == "closed" {
		info, err := e.file.Stat()
		if err != nil || info.Size() != e.view.ProducedBytes {
			return errors.New("closed host file does not match drained device length")
		}
	}
	e.view.Phase = op
	e.view.Message = "Operator attestation: " + a.Evidence
	e.view.Sequence++
	return nil
}

// Media returns at most four read-only, hash-checked catalog entries. Generation
// identifies the approved observation, not a guarantee of current attachment.
// It never attaches/replaces media. Files are bounded and paths remain private.
func (f *Followers) Media() []MediaView {
	f.mu.Lock()
	defer f.mu.Unlock()
	result := []MediaView{}
	for id, e := range f.entries {
		c := e.config.Session
		if c == nil || c.Reader == nil {
			continue
		}
		row := MediaView{ID: id, ReaderMedia: *c.Reader, ReadOnly: true, Generation: e.view.Generation, Message: "Unavailable or changed media; operator inspection required"}
		file, before, err := openRegular(e.config.ReaderPath, MaxBytes)
		if err == nil {
			data, readErr := io.ReadAll(io.LimitReader(file, MaxBytes+1))
			after, statErr := file.Stat()
			file.Close()
			sum := sha256.Sum256(data)
			row.Bytes = before.Size()
			row.Verified = readErr == nil && statErr == nil && len(data) <= MaxBytes && int64(len(data)) == before.Size() && before.Size() == after.Size() && before.ModTime() == after.ModTime() && before.Mode().Perm()&0222 == 0 && hex.EncodeToString(sum[:]) == c.Reader.SHA256
			if row.Verified {
				row.Message = "Verified read-only working copy; attachment requires independent operator safe-state checks"
			}
		}
		result = append(result, row)
	}
	return result
}
