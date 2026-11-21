package peripheral

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCompletedOutputAndRetirement(t *testing.T) {
	path := filepath.Join(t.TempDir(), "lp.out")
	data := []byte("A\rB\nC\fD")
	if err := os.WriteFile(path, data, 0600); err != nil {
		t.Fatal(err)
	}
	store, err := New([]Config{{ID: "lp", Kind: "lp11", Path: path}})
	if err != nil {
		t.Fatal(err)
	}
	if store.List()[0].State != "offline" {
		t.Fatal("startup attached")
	}
	hash := sha256.Sum256(data)
	status := store.Status()
	approval := Approval{Instance: status.Instance, ID: "lp", Simulator: "sim1", Guest: "guest1", SHA256: hex.EncodeToString(hash[:]), Completed: true}
	if err := store.Apply(approval, true); err != nil {
		t.Fatal(err)
	}
	first := store.List()[0]
	snapshot, ok := store.Get("lp", first.Generation)
	if !ok || string(snapshot.Data) != string(data) {
		t.Fatal("bytes changed")
	}
	snapshot.Data[0] = 'Z'
	again, _ := store.Get("lp", first.Generation)
	if string(again.Data) != string(data) {
		t.Fatal("borrowed state")
	}
	if err := store.Apply(approval, true); err == nil {
		t.Fatal("replayed approval")
	}
	approval.Revision = 1
	approval.Guest = "guest2"
	if err := store.Apply(approval, true); err != nil {
		t.Fatal(err)
	}
	if _, ok := store.Get("lp", first.Generation); ok {
		t.Fatal("old generation followed replacement")
	}
	approval.Revision = 2
	approval.SHA256 = strings.Repeat("0", 64)
	if err := store.Apply(approval, true); err == nil {
		t.Fatal("wrong checksum accepted")
	}
	if store.List()[0].State != "offline" {
		t.Fatal("failed approval left old state")
	}
}
func TestUnsafeAndOversizedExports(t *testing.T) {
	for _, kind := range []string{"oversize", "symlink", "highbit"} {
		t.Run(kind, func(t *testing.T) {
			dir := t.TempDir()
			path := filepath.Join(dir, "export")
			data := []byte{255}
			if kind == "oversize" {
				data = make([]byte, MaxBytes+1)
			}
			target := path
			if kind == "symlink" {
				target = filepath.Join(dir, "target")
			}
			if err := os.WriteFile(target, data, 0600); err != nil {
				t.Fatal(err)
			}
			if kind == "symlink" {
				if err := os.Symlink(target, path); err != nil {
					t.Fatal(err)
				}
			}
			store, _ := New([]Config{{ID: "lp", Kind: "lp11", Path: path}})
			hash := sha256.Sum256(data)
			a := Approval{Instance: store.Status().Instance, ID: "lp", Simulator: "s", Guest: "g", Completed: true, SHA256: hex.EncodeToString(hash[:])}
			if store.Apply(a, true) == nil {
				t.Fatal("unsafe export accepted")
			}
		})
	}
}
