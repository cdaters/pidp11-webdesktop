package peripheral

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestReaderEOFDoesNotCompletePunchAndExpiryDoesNotStopProducer(t *testing.T) {
	dir := t.TempDir()
	spool, reader := filepath.Join(dir, "punch"), filepath.Join(dir, "reader")
	input := []byte{0, 128, 255}
	if err := os.WriteFile(spool, nil, 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(reader, input, 0400); err != nil {
		t.Fatal(err)
	}
	sum := sha256.Sum256(input)
	f, err := NewFollowers([]FollowConfig{{ID: "punch", Kind: "pc11-punch", Path: spool, ReaderPath: reader}})
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	a := FollowApproval{Instance: f.Status().Instance, ID: "punch", Simulator: "sim", Guest: "cpu", Verified: true, ReaderSHA256: hex.EncodeToString(sum[:])}
	if err := f.Apply("follow", a); err != nil {
		t.Fatal(err)
	}
	a = nextApproval(f, a)
	a.ReaderBytes, a.ReaderEOF = len(input), true
	if err := f.Apply("progress", a); err != nil {
		t.Fatal(err)
	}
	appendSpool(t, spool, input)
	f.poll()
	v, ok := f.Read("punch", f.List()[0].Generation, 0)
	if !ok || v.State != "observing" || !v.ReaderEOF || string(v.Data) != string(input) {
		t.Fatal("reader completion incorrectly ended or changed punch output", v)
	}
	f.now = func() time.Time { return time.Now().Add(ProducerLease + time.Second) }
	f.poll()
	appendSpool(t, spool, []byte("producer remains independent"))
	retained, ok := f.Read("punch", v.Generation, 0)
	if !ok || retained.State != "disconnected" || string(retained.Data) != string(input) {
		t.Fatal("expired observation did not retain only previously accepted bytes", retained)
	}
}

func TestFollowerRejectsWrongOrOversizedReaderAndHighBitPrinter(t *testing.T) {
	for _, scenario := range []string{"reader-hash", "reader-size", "reader-symlink", "printer-high-bit"} {
		t.Run(scenario, func(t *testing.T) {
			dir := t.TempDir()
			spool, reader := filepath.Join(dir, "spool"), filepath.Join(dir, "reader")
			if err := os.WriteFile(spool, nil, 0600); err != nil {
				t.Fatal(err)
			}
			input := []byte{0, 128, 255}
			if scenario == "reader-size" {
				input = make([]byte, MaxBytes+1)
			}
			if err := os.WriteFile(reader, input, 0400); err != nil {
				t.Fatal(err)
			}
			sum := sha256.Sum256(input)
			config := FollowConfig{ID: "device", Kind: "pc11-punch", Path: spool, ReaderPath: reader}
			if scenario == "reader-symlink" {
				config.ReaderPath = reader + "-link"
				if err := os.Symlink(reader, config.ReaderPath); err != nil {
					t.Fatal(err)
				}
			}
			if scenario == "printer-high-bit" {
				config.Kind, config.ReaderPath = "lp11", ""
			}
			f, err := NewFollowers([]FollowConfig{config})
			if err != nil {
				t.Fatal(err)
			}
			defer f.Close()
			a := FollowApproval{Instance: f.Status().Instance, ID: "device", Simulator: "sim", Guest: "guest", Verified: true, ReaderSHA256: hex.EncodeToString(sum[:])}
			if scenario == "reader-hash" {
				a.ReaderSHA256 = "incorrect"
			}
			err = f.Apply("follow", a)
			if scenario == "printer-high-bit" {
				if err != nil {
					t.Fatal(err)
				}
				appendSpool(t, spool, []byte{128})
				f.poll()
			} else if err == nil {
				t.Fatal("unsafe reader accepted")
			}
			if f.List()[0].State != "faulted" {
				t.Fatal("invalid media not retired")
			}
		})
	}
}
