package storage

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func fixture(t *testing.T) (*Store, Snapshot) {
	t.Helper()
	s, err := New([]Config{{"disk", "RL0", "RL11", 0}, {"tape", "TM0", "TM11", 0}})
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 11, 23, 22, 0, 0, 0, time.UTC)
	s.now = func() time.Time { return now }
	v := Snapshot{ID: "disk", Device: "RL0", Controller: "RL11", Simulator: "isolated-original", Guest: "rt11-attested", Capture: "capture-one", CapturedAt: now.Format(time.RFC3339Nano), Family: "RL02", Configured: true, Attachment: "attached", Media: "Disposable RT11 RL02", Provenance: "Verified original distribution; new working copy", SHA256: strings.Repeat("a", 64), Size: 10478080, Format: "SIMH disk", Capacity: 10485760, Geometry: "512 cylinders; 2 heads; 40 sectors; 256 bytes", WriteProtection: "guest-writable", GuestAccess: "observed", GuestEvidence: "Original console DIR returned verified listing", Activity: "unavailable", Position: -1, PositionMeaning: "unavailable", Ready: "observed-ready", Filemark: "unavailable", EndOfMedium: "unavailable", Registers: "RLCS: 000201", Source: "Independent idle-console capture, REALCONS disconnected"}
	return s, v
}
func publish(s *Store, v Snapshot) error {
	a := s.Status()
	return s.Publish(Approval{Instance: a.Instance, Revision: a.Revision, Verified: true, Snapshot: v})
}
func TestSnapshotsExpireRetireAndRestartWithoutAuthority(t *testing.T) {
	s, v := fixture(t)
	if err := publish(s, v); err != nil {
		t.Fatal(err)
	}
	first := s.List()[0]
	if first.Mode != "captured-snapshot" || first.Activity != "unavailable" {
		t.Fatal(first)
	}
	now := s.now()
	s.now = func() time.Time { return now.Add(FreshFor + time.Second) }
	if s.List()[0].Freshness != "stale" {
		t.Fatal("stale became idle/live")
	}
	s.now = func() time.Time { return now }
	if s.List()[0].Freshness != "stale" {
		t.Fatal("clock rollback revived snapshot")
	}
	if publish(s, v) == nil {
		t.Fatal("replayed capture")
	}
	v.Capture = "next"
	v.CapturedAt = now.Add(time.Second).Format(time.RFC3339Nano)
	v.Guest = "other-guest"
	s.now = func() time.Time { return now.Add(time.Second) }
	if err := publish(s, v); err != nil {
		t.Fatal(err)
	}
	if _, ok := s.Get(v.ID, first.Generation); ok {
		t.Fatal("old guest generation followed new capture")
	}
	current := s.List()[0]
	a := s.Status()
	if err := s.Revoke(Approval{Instance: a.Instance, Revision: a.Revision, Verified: true, ID: v.ID, Generation: current.Generation}); err != nil {
		t.Fatal(err)
	}
	if s.List()[0].Freshness != "disconnected" {
		t.Fatal("revoke ignored")
	}
	fresh, _ := New(s.config)
	if len(fresh.List()) != 0 {
		t.Fatal("restart adopted records")
	}
	if fresh.Publish(Approval{Instance: a.Instance, Revision: 0, Verified: true, Snapshot: v}) == nil {
		t.Fatal("old simulator approval survived restart")
	}
}
func TestIdentityBoundsAndUnknownFacts(t *testing.T) {
	cases := map[string]func(*Snapshot){"unit": func(v *Snapshot) { v.Unit = 1 }, "controller": func(v *Snapshot) { v.Controller = "RQDX3" }, "device": func(v *Snapshot) { v.Device = "RQ0" }, "size": func(v *Snapshot) { v.Size = 1 << 40 }, "metadata": func(v *Snapshot) { v.Provenance = strings.Repeat("x", 513) }, "activity": func(v *Snapshot) { v.Activity = "idle" }, "hash": func(v *Snapshot) { v.SHA256 = "unknown" }, "format": func(v *Snapshot) { v.Format = "VHD" }, "future": func(v *Snapshot) { v.CapturedAt = "2027-01-01T00:00:00Z" }, "stale": func(v *Snapshot) { v.CapturedAt = "2025-01-01T00:00:00Z" }, "configured": func(v *Snapshot) { v.Configured = false }}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			s, v := fixture(t)
			change(&v)
			if publish(s, v) == nil {
				t.Fatal("bad evidence accepted")
			}
		})
	}
	if _, err := New([]Config{{"x", "RQ0", "MSCP", 0}}); err == nil {
		t.Fatal("unsupported configured device")
	}
	s, v := fixture(t)
	v.ID = "unapproved"
	if publish(s, v) == nil {
		t.Fatal("unknown slot")
	}
}
func TestMediaReplacementRemovalAndReadOnlyVerification(t *testing.T) {
	_, v := fixture(t)
	data := []byte("authored fixture disk bytes")
	sum := sha256.Sum256(data)
	v.Size = int64(len(data))
	v.SHA256 = hex.EncodeToString(sum[:])
	path := filepath.Join(t.TempDir(), "disk")
	if err := os.WriteFile(path, data, 0400); err != nil {
		t.Fatal(err)
	}
	before, _ := os.Stat(path)
	if err := VerifyMedia(path, v); err != nil {
		t.Fatal(err)
	}
	after, _ := os.Stat(path)
	if before.Mode() != after.Mode() || !before.ModTime().Equal(after.ModTime()) {
		t.Fatal("collector changed media")
	}
	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
	if VerifyMedia(path, v) == nil {
		t.Fatal("missing media accepted")
	}
	changed := bytes.Repeat([]byte{'x'}, len(data))
	os.WriteFile(path, changed, 0600)
	if VerifyMedia(path, v) == nil {
		t.Fatal("same path/size different bytes accepted")
	}
	os.Remove(path)
	os.Symlink("missing", path)
	if VerifyMedia(path, v) == nil {
		t.Fatal("symlink accepted")
	}
}
func TestConcurrentBoundedReadersAndMalformedControl(t *testing.T) {
	s, v := fixture(t)
	if err := publish(s, v); err != nil {
		t.Fatal(err)
	}
	tape := v
	tape.ID = "tape"
	tape.Device = "TM0"
	tape.Controller = "TM11"
	tape.Family = "TU10"
	tape.Format = "SIMH tape"
	tape.Position = 0
	tape.PositionMeaning = "SIMH logical image byte offset; not host file cursor or physical tape length"
	tape.Geometry = "unavailable"
	tape.Capacity = 0
	if err := publish(s, tape); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for n := 0; n < 20; n++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for n := 0; n < 100; n++ {
				if len(s.List()) != 2 {
					t.Error("lost concurrent device")
				}
			}
		}()
	}
	wg.Wait()
	h := s.ControlHandler()
	for _, body := range []string{"{", `{"path":"/private"}`, strings.Repeat("x", MaxRecord+1), `{} {}`} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("POST", "/storage/publish", strings.NewReader(body)))
		if w.Code != 400 {
			t.Fatal(w.Code)
		}
	}
	a := s.Status()
	payload, _ := json.Marshal(Approval{Instance: a.Instance, Revision: a.Revision - 1, Verified: true, Snapshot: v})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/storage/publish", bytes.NewReader(payload)))
	if w.Code != 409 {
		t.Fatal("stale producer accepted")
	}
}

func BenchmarkVerifyMediaRL02(b *testing.B) {
	data := make([]byte, 10485760)
	sum := sha256.Sum256(data)
	path := filepath.Join(b.TempDir(), "disposable-rl02")
	if err := os.WriteFile(path, data, 0400); err != nil {
		b.Fatal(err)
	}
	v := Snapshot{ID: "disk", Device: "RL0", Controller: "RL11", Simulator: "benchmark", Guest: "no-guest", Capture: "fixture", CapturedAt: time.Now().UTC().Format(time.RFC3339Nano), Family: "RL02", Configured: true, Attachment: "attached", Media: "Authored zero fixture", Provenance: "No guest bytes", SHA256: hex.EncodeToString(sum[:]), Size: int64(len(data)), Format: "SIMH disk", Capacity: int64(len(data)), Geometry: "512 cylinders; 2 heads; 40 sectors; 256 bytes", WriteProtection: "read-only", GuestAccess: "unavailable", GuestEvidence: "No guest", Activity: "unavailable", Position: -1, PositionMeaning: "unavailable", Ready: "unknown", Filemark: "unavailable", EndOfMedium: "unavailable", Registers: "unavailable", Source: "Fixture benchmark"}
	b.ReportAllocs()
	b.SetBytes(int64(len(data)))
	b.ResetTimer()
	for n := 0; n < b.N; n++ {
		if err := VerifyMedia(path, v); err != nil {
			b.Fatal(err)
		}
	}
}

func TestRP06IdentityAndGuestRetirement(t *testing.T) {
	_, v := fixture(t)
	v.ID, v.Device, v.Controller, v.Family = "rp-disk", "RP0", "RH70", "RP06"
	v.Capacity, v.Size = 174423040, 174423040
	v.Geometry = "815 cylinders; 19 heads; 22 sectors per track; 512-byte sectors"
	v.Guest, v.GuestEvidence = "unix-v7-attested", "Original console ls / completed"
	s, err := New([]Config{{"disk", "RL0", "RL11", 0}, {"tape", "TM0", "TM11", 0}, {v.ID, v.Device, v.Controller, 0}})
	if err != nil {
		t.Fatal(err)
	}
	when, _ := time.Parse(time.RFC3339Nano, v.CapturedAt)
	s.now = func() time.Time { return when }
	if err := publish(s, v); err != nil {
		t.Fatal(err)
	}
	old := s.List()[0]
	for name, change := range map[string]func(*Snapshot){
		"controller":  func(v *Snapshot) { v.Controller = "RH11" },
		"unit":        func(v *Snapshot) { v.Unit = 1 },
		"model":       func(v *Snapshot) { v.Family = "RP04" },
		"capacity":    func(v *Snapshot) { v.Capacity-- },
		"geometry":    func(v *Snapshot) { v.Geometry = "unavailable" },
		"position":    func(v *Snapshot) { v.Position = 0 },
		"media-bound": func(v *Snapshot) { v.Size = 256<<20 + 1 },
	} {
		t.Run(name, func(t *testing.T) {
			bad := v
			change(&bad)
			if Validate(bad) == nil {
				t.Fatal("unqualified RP identity accepted")
			}
		})
	}
	when = when.Add(time.Second)
	v.Guest, v.Capture, v.CapturedAt = "replacement-guest", "capture-two", when.Format(time.RFC3339Nano)
	if err := publish(s, v); err != nil {
		t.Fatal(err)
	}
	if _, ok := s.Get(v.ID, old.Generation); ok {
		t.Fatal("RP capture followed replacement guest")
	}
	current := s.List()[0]
	a := s.Status()
	if err := s.Revoke(Approval{Instance: a.Instance, Revision: a.Revision, Verified: true, ID: v.ID, Generation: current.Generation}); err != nil {
		t.Fatal(err)
	}
	if s.List()[0].Freshness != "disconnected" {
		t.Fatal("revocation ignored")
	}
}
