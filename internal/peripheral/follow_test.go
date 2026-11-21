package peripheral

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func setupFollower(t *testing.T) (*Followers, string, FollowApproval) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "spool")
	if err := os.WriteFile(path, nil, 0600); err != nil {
		t.Fatal(err)
	}
	followers, err := NewFollowers([]FollowConfig{{ID: "lp", Kind: "lp11", Path: path}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(followers.Close)
	approval := FollowApproval{Instance: followers.Status().Instance, ID: "lp", Simulator: "sim1", Guest: "guest1", Verified: true}
	if err = followers.Apply("follow", approval); err != nil {
		t.Fatal(err)
	}
	return followers, path, approval
}
func appendSpool(t *testing.T, path string, data []byte) {
	t.Helper()
	file, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0)
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	if _, err = file.Write(data); err != nil {
		t.Fatal(err)
	}
}
func nextApproval(f *Followers, a FollowApproval) FollowApproval {
	a.Revision = f.Status().Devices[0].Revision
	return a
}

func TestFollowPartialOrderedCompletionAndRetirement(t *testing.T) {
	f, path, a := setupFollower(t)
	generation := f.List()[0].Generation
	for _, part := range []string{"A\r", "Z\nSECOND", "\fFORM"} {
		appendSpool(t, path, []byte(part))
		f.poll()
	}
	view, ok := f.Read("lp", generation, 0)
	if !ok || string(view.Data) != "A\rZ\nSECOND\fFORM" || view.Total != 15 || view.State != "observing" {
		t.Fatal(view)
	}
	// Reads are copies; late viewers cannot mutate another observer's bytes.
	view.Data[0] = '!'
	again, _ := f.Read("lp", generation, 0)
	if again.Data[0] != 'A' {
		t.Fatal("borrowed storage")
	}
	sum := sha256.Sum256(again.Data)
	a = nextApproval(f, a)
	a.SHA256 = hex.EncodeToString(sum[:])
	if err := f.Apply("complete", a); err != nil {
		t.Fatal(err)
	}
	if f.List()[0].State != "completed" {
		t.Fatal("completion missing")
	}
	if err := f.Apply("renew", a); err == nil {
		t.Fatal("stale approval reused")
	}
	if err := os.WriteFile(path, nil, 0600); err != nil {
		t.Fatal(err)
	}
	a = nextApproval(f, a)
	if err := f.Apply("follow", a); err != nil {
		t.Fatal(err)
	}
	if _, ok := f.Read("lp", generation, 0); ok {
		t.Fatal("old generation survived replacement")
	}
}
func TestFollowRetiresOnUnsafeProducerChanges(t *testing.T) {
	for _, change := range []string{"truncate", "replace", "remove", "symlink", "lease", "identity", "limit", "old-file"} {
		t.Run(change, func(t *testing.T) {
			f, path, a := setupFollower(t)
			appendSpool(t, path, []byte("FIRST"))
			f.poll()
			switch change {
			case "truncate":
				os.Truncate(path, 0)
			case "replace":
				os.Rename(path, path+".old")
				os.WriteFile(path, []byte("SECOND"), 0600)
			case "remove":
				os.Remove(path)
			case "symlink":
				os.Rename(path, path+".old")
				os.Symlink(path+".old", path)
			case "lease":
				f.now = func() time.Time { return time.Now().Add(ProducerLease + time.Second) }
			case "identity":
				a = nextApproval(f, a)
				a.Guest = "different"
				if f.Apply("renew", a) == nil {
					t.Fatal("new guest silently accepted")
				}
			case "limit":
				os.Truncate(path, MaxJobBytes+1)
			case "old-file":
				a = nextApproval(f, a)
				if f.Apply("follow", a) == nil {
					t.Fatal("old spool replayed")
				}
			}
			f.poll()
			v := f.List()[0]
			if v.State != "faulted" && v.State != "disconnected" {
				t.Fatal(v)
			}
		})
	}
}
func TestSlowFollowReaderBoundAndExplicitLoss(t *testing.T) {
	f, path, a := setupFollower(t)
	data := bytes.Repeat([]byte("X"), MaxBytes+FollowChunk+17)
	appendSpool(t, path, data)
	for i := 0; i < 12; i++ {
		f.poll()
	}
	view, _ := f.Read("lp", f.List()[0].Generation, 0)
	if !view.Lost || view.Start != FollowChunk+17 || len(view.Data) != FollowChunk || len(f.entries["lp"].retained) > MaxBytes {
		t.Fatal(view.Start, len(view.Data), view.Lost)
	}
	sum := sha256.Sum256(data)
	a = nextApproval(f, a)
	a.SHA256 = hex.EncodeToString(sum[:])
	if err := f.Apply("complete", a); err != nil {
		t.Fatal(err)
	}
	if f.List()[0].SHA256 != a.SHA256 {
		t.Fatal("full-file hash lost when tail bounded")
	}
}
func TestFollowReaderProgressAndCleanup(t *testing.T) {
	dir := t.TempDir()
	spool, reader := filepath.Join(dir, "punch"), filepath.Join(dir, "reader")
	os.WriteFile(spool, nil, 0600)
	data := []byte{0, 128, 255}
	os.WriteFile(reader, data, 0400)
	sum := sha256.Sum256(data)
	f, err := NewFollowers([]FollowConfig{{ID: "punch", Kind: "pc11-punch", Path: spool, ReaderPath: reader}})
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	a := FollowApproval{Instance: f.Status().Instance, ID: "punch", Simulator: "sim", Guest: "cpu", Verified: true, ReaderSHA256: hex.EncodeToString(sum[:])}
	if err = f.Apply("follow", a); err != nil {
		t.Fatal(err)
	}
	a = nextApproval(f, a)
	a.ReaderBytes = 3
	a.ReaderEOF = true
	if err = f.Apply("progress", a); err != nil {
		t.Fatal(err)
	}
	if !f.List()[0].ReaderEOF || f.List()[0].ReaderBytes != 3 {
		t.Fatal("reported progress lost")
	}
	a = nextApproval(f, a)
	a.ReaderBytes = 2
	if f.Apply("progress", a) == nil {
		t.Fatal("progress rewound")
	}
	f.Start(context.Background())
	f.Close()
	if f.entries["punch"].file != nil {
		t.Fatal("file retained")
	}
}

func TestFollowingRevokesOnSameSizeWriteAndCompletionMismatch(t *testing.T) {
	for _, mode := range []string{"rewrite", "checksum"} {
		t.Run(mode, func(t *testing.T) {
			f, path, a := setupFollower(t)
			appendSpool(t, path, []byte("12345"))
			f.poll()
			if mode == "rewrite" {
				file, err := os.OpenFile(path, os.O_WRONLY, 0)
				if err != nil {
					t.Fatal(err)
				}
				file.WriteAt([]byte("X"), 0)
				file.Close()
				// Ensure a distinct timestamp even on coarse filesystem clocks.
				os.Chtimes(path, time.Now(), time.Now().Add(time.Second))
				f.poll()
			} else {
				a = nextApproval(f, a)
				a.SHA256 = "wrong"
				if f.Apply("complete", a) == nil {
					t.Fatal("unchecked completion")
				}
			}
			if f.List()[0].State != "faulted" {
				t.Fatal("uncertainty not retired")
			}
		})
	}
}
