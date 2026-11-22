package peripheral

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// Measure the maximum retained-window verification on an idle genuine file.
// Clock is frozen so this measures polling, not the five-second producer lease.
func BenchmarkRetainedSpoolPoll(b *testing.B) {
	path := filepath.Join(b.TempDir(), "spool")
	if err := os.WriteFile(path, nil, 0600); err != nil {
		b.Fatal(err)
	}
	f, err := NewFollowers([]FollowConfig{{ID: "lp", Kind: "lp11", Path: path}})
	if err != nil {
		b.Fatal(err)
	}
	defer f.Close()
	now := time.Now()
	f.now = func() time.Time { return now }
	if err := f.Apply("follow", FollowApproval{Instance: f.Status().Instance, ID: "lp", Simulator: "bench", Guest: "fixture", Verified: true}); err != nil {
		b.Fatal(err)
	}
	if err := os.WriteFile(path, bytes.Repeat([]byte("A"), MaxBytes), 0600); err != nil {
		b.Fatal(err)
	}
	for range MaxBytes / FollowChunk {
		f.poll()
	}
	b.ReportAllocs()
	for b.Loop() {
		f.poll()
	}
	if f.List()[0].State != "observing" {
		b.Fatal("benchmark lost observation")
	}
}
