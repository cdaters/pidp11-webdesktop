package peripheral

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func completedRecord(t *testing.T) (*Followers, string, Record) {
	t.Helper()
	f, path, a := sessionFixture(t)
	data := []byte("HISTORICAL JOB\r\n")
	appendSpool(t, path, data)
	f.poll()
	for _, op := range []string{"guest-returned", "drained", "closed", "complete"} {
		a = nextApproval(f, a)
		a.Evidence = "independent test inspection"
		a.ProducedBytes = int64(len(data))
		sum := sha256.Sum256(data)
		a.SHA256 = hex.EncodeToString(sum[:])
		if err := f.Apply(op, a); err != nil {
			t.Fatal(err)
		}
	}
	rows := f.History()
	if len(rows) != 1 {
		t.Fatal(rows)
	}
	r, ok := f.HistoryRecord(rows[0].ID)
	if !ok {
		t.Fatal("missing record")
	}
	if err := ValidateRecord(r); err != nil {
		t.Fatal(err)
	}
	return f, path, r
}
func TestHistoryRetainsJobsAcrossReuseAndRecoversDataWithoutAuthority(t *testing.T) {
	f, path, first := completedRecord(t)
	a := FollowApproval{Instance: f.Status().Instance, ID: "job", Simulator: "sim1", Guest: "rsx", Verified: true, Owner: "new-owner", Job: "second", Generation: first.Generation}
	a = nextApproval(f, a)
	if err := os.WriteFile(path, nil, 0600); err != nil {
		t.Fatal(err)
	}
	if err := f.Apply("follow", a); err != nil {
		t.Fatal(err)
	}
	if _, ok := f.Read("job", first.Generation, 0); ok {
		t.Fatal("stale observer followed replacement")
	}
	old, ok := f.HistoryRecord(first.ID)
	if !ok || string(old.Data) != string(first.Data) {
		t.Fatal("history changed")
	}
	old.Data[0] = 'X'
	unchanged, _ := f.HistoryRecord(first.ID)
	if string(unchanged.Data) != string(first.Data) {
		t.Fatal("borrowed history bytes")
	}
	directory := t.TempDir()
	os.Chmod(directory, 0700)
	if err := SaveRecord(directory, first); err != nil {
		t.Fatal(err)
	}
	if SaveRecord(directory, first) == nil {
		t.Fatal("archive overwrite allowed")
	}
	restored, err := LoadRecord(directory, first.ID)
	if err != nil {
		t.Fatal(err)
	}
	fresh, err := NewFollowers([]FollowConfig{{ID: "job", Kind: "lp11", Path: path, Session: &SessionConfig{Device: "LP0", Label: "RSX printer"}}})
	if err != nil {
		t.Fatal(err)
	}
	defer fresh.Close()
	if err := fresh.Recover(restored); err != nil {
		t.Fatal(err)
	}
	if fresh.List()[0].State != "detached" || fresh.List()[0].Generation != "" {
		t.Fatal("data recovery restored authority")
	}
	if fresh.Recover(restored) == nil {
		t.Fatal("duplicate replaced immutable record")
	}
	if _, ok := fresh.Read("job", first.Generation, 0); ok {
		t.Fatal("recovery recreated live generation")
	}
}
func TestHistoryExpiryAndBoundsRemainHonest(t *testing.T) {
	f, path, a := sessionFixture(t)
	appendSpool(t, path, []byte("partial"))
	f.poll()
	f.now = func() time.Time { return time.Now().Add(ProducerLease + time.Second) }
	f.poll()
	rows := f.History()
	if len(rows) != 1 || rows[0].State != "expired" || rows[0].Completed != "" {
		t.Fatal(rows)
	}
	r, _ := f.HistoryRecord(rows[0].ID)
	if err := ValidateRecord(r); err != nil {
		t.Fatal(err)
	}
	a = nextApproval(f, a)
	if f.Apply("renew", a) == nil {
		t.Fatal("expired generation revived")
	}
	firstID := r.ID
	for n := 0; n < MaxHistory; n++ {
		r.Generation = string(rune('a' + n))
		r.ID = recordID(r.Generation)
		if err := f.Recover(r); err != nil {
			t.Fatal(err)
		}
	}
	if len(f.History()) != MaxHistory {
		t.Fatal("unbounded history")
	}
	if _, ok := f.HistoryRecord(firstID); ok {
		t.Fatal("oldest retained beyond bound")
	}
	r.State = "completed"
	if f.Recover(r) == nil {
		t.Fatal("partial record became completed")
	}
}
func TestArchiveRejectsCorruptionLinksOverflowAndMetadataChanges(t *testing.T) {
	_, _, r := completedRecord(t)
	dir := t.TempDir()
	os.Chmod(dir, 0700)
	if err := SaveRecord(dir, r); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, r.ID+".json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var envelope recordEnvelope
	if err := json.Unmarshal(data, &envelope); err != nil {
		t.Fatal(err)
	}
	envelope.Record.Job = "different"
	changed, _ := json.Marshal(envelope)
	os.WriteFile(path, changed, 0600)
	if _, err := LoadRecord(dir, r.ID); err == nil {
		t.Fatal("changed metadata accepted")
	}
	os.Remove(path)
	os.Symlink(filepath.Join(t.TempDir(), "missing"), path)
	if _, err := LoadRecord(dir, r.ID); err == nil {
		t.Fatal("symlink accepted")
	}
	os.Remove(path)
	for n := 0; n < MaxHistory; n++ {
		r.Generation = string(rune('a' + n))
		r.ID = recordID(r.Generation)
		if err := SaveRecord(dir, r); err != nil {
			t.Fatal(err)
		}
	}
	r.Generation = "extra"
	r.ID = recordID(r.Generation)
	if SaveRecord(dir, r) == nil {
		t.Fatal("archive exceeded bound")
	}
	if _, err := LoadRecord(dir, "../elsewhere"); err == nil {
		t.Fatal("path accepted")
	}
}
