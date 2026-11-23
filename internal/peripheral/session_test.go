package peripheral

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func sessionFixture(t *testing.T) (*Followers, string, FollowApproval) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "spool")
	if err := os.WriteFile(path, nil, 0600); err != nil {
		t.Fatal(err)
	}
	f, err := NewFollowers([]FollowConfig{{ID: "job", Kind: "lp11", Path: path, Session: &SessionConfig{Device: "LP0", Label: "RSX printer"}}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(f.Close)
	a := FollowApproval{Instance: f.Status().Instance, ID: "job", Simulator: "sim1", Guest: "rsx", Verified: true, Owner: "owner1", Job: "print-1"}
	if err := f.Apply("follow", a); err != nil {
		t.Fatal(err)
	}
	a.Generation = f.List()[0].Generation
	return f, path, a
}
func TestSessionCompletionRequiresAllIndependentStages(t *testing.T) {
	for _, op := range []string{"drained", "closed", "complete"} {
		t.Run(op, func(t *testing.T) {
			f, _, a := sessionFixture(t)
			a = nextApproval(f, a)
			a.Evidence = "prompt observed"
			if f.Apply(op, a) == nil {
				t.Fatal("stage skipped")
			}
			if f.List()[0].State != "faulted" {
				t.Fatal("unsafe session survived")
			}
		})
	}
}
func TestSessionSequentialJobsFenceDelayedOwnerAndRetainImmutableExport(t *testing.T) {
	f, path, a := sessionFixture(t)
	store, err := New([]Config{{ID: "job", Kind: "lp11", Path: path}})
	if err != nil {
		t.Fatal(err)
	}
	for job := 1; job <= 2; job++ {
		data := []byte{byte('A' + job), '\n'}
		appendSpool(t, path, data)
		f.poll()
		for _, op := range []string{"guest-returned", "drained", "closed"} {
			a = nextApproval(f, a)
			a.Evidence = "independent lab evidence"
			a.ProducedBytes = int64(len(data))
			if err := f.Apply(op, a); err != nil {
				t.Fatal(err)
			}
		}
		sum := sha256.Sum256(data)
		a = nextApproval(f, a)
		a.SHA256 = hex.EncodeToString(sum[:])
		if err := f.Apply("complete", a); err != nil {
			t.Fatal(err)
		}
		approval := Approval{Instance: store.Status().Instance, ID: "job", Revision: store.Status().Devices[0].Revision, Simulator: "sim1", Guest: "rsx", SHA256: a.SHA256, Completed: true}
		if err := store.Apply(approval, true); err != nil {
			t.Fatal(err)
		}
		snapshot := store.List()[0]
		oldGeneration := a.Generation
		old := a
		if job == 1 {
			if err := os.WriteFile(path, nil, 0600); err != nil {
				t.Fatal(err)
			}
			a = nextApproval(f, a)
			a.Owner = "owner2"
			a.Job = "print-2"
			if err := f.Apply("follow", a); err != nil {
				t.Fatal(err)
			}
			a.Generation = f.List()[0].Generation
			old = nextApproval(f, old)
			if f.Apply("detach", old) == nil {
				t.Fatal("old owner detached replacement")
			}
			if f.List()[0].State != "observing" {
				t.Fatal("replacement retired by stale request")
			}
			if _, ok := f.Read("job", oldGeneration, 0); ok {
				t.Fatal("old viewer followed replacement")
			}
			retained, ok := store.Get("job", snapshot.Generation)
			if !ok || string(retained.Data) != string(data) {
				t.Fatal("completed artifact changed with reused spool")
			}
		}
	}
}
func TestSessionExpiryCannotBeRenewedOrCompleted(t *testing.T) {
	f, path, a := sessionFixture(t)
	appendSpool(t, path, []byte("partial"))
	f.poll()
	f.now = func() time.Time { return time.Now().Add(ProducerLease + time.Second) }
	f.poll()
	a = nextApproval(f, a)
	if f.Apply("renew", a) == nil {
		t.Fatal("expired owner revived")
	}
	v, _ := f.Read("job", a.Generation, 0)
	if string(v.Data) != "partial" || v.State == "observing" {
		t.Fatal(v)
	}
	appendSpool(t, path, []byte("independent producer still writes"))
}
func TestSessionClosedLengthAndReaderCatalog(t *testing.T) {
	f, _, a := sessionFixture(t)
	for _, op := range []string{"guest-returned", "drained"} {
		a = nextApproval(f, a)
		a.Evidence = "independent register read"
		a.ProducedBytes = 12
		if err := f.Apply(op, a); err != nil {
			t.Fatal(err)
		}
	}
	a = nextApproval(f, a)
	if f.Apply("closed", a) == nil {
		t.Fatal("unflushed length accepted")
	}
	dir := t.TempDir()
	reader := filepath.Join(dir, "reader")
	spool := filepath.Join(dir, "spool")
	os.WriteFile(reader, []byte("abc"), 0400)
	os.WriteFile(spool, nil, 0600)
	sum := sha256.Sum256([]byte("abc"))
	catalog, err := NewFollowers([]FollowConfig{{ID: "punch", Kind: "pc11-punch", Path: spool, ReaderPath: reader, Session: &SessionConfig{Device: "PC11", Label: "RSX tape", Reader: &ReaderMedia{Name: "Working tape", Format: "ASCII", Provenance: "Authored fixture", SHA256: hex.EncodeToString(sum[:])}}}})
	if err != nil {
		t.Fatal(err)
	}
	defer catalog.Close()
	rows := catalog.Media()
	if len(rows) != 1 || !rows[0].Verified || rows[0].Bytes != 3 {
		t.Fatal(rows)
	}
	os.Chmod(reader, 0600)
	if catalog.Media()[0].Verified {
		t.Fatal("writable reader claimed verified read-only")
	}
}

func TestRejectedSessionReplacementPreservesRetainedEvidence(t *testing.T) {
	f, path, a := sessionFixture(t)
	appendSpool(t, path, []byte("verified partial"))
	f.poll()
	a = nextApproval(f, a)
	if err := f.Apply("detach", a); err != nil {
		t.Fatal(err)
	}
	before, _ := f.Read("job", a.Generation, 0)
	a = nextApproval(f, a)
	a.Owner = "new-owner"
	a.Job = "new-job"
	if f.Apply("follow", a) == nil {
		t.Fatal("nonempty spool accepted")
	}
	after, ok := f.Read("job", before.Generation, 0)
	if !ok || string(after.Data) != string(before.Data) || after.State != before.State {
		t.Fatal("rejected replacement erased retained evidence", after)
	}
}
