package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestBoundedScannerDiagnostics(t *testing.T) {
	var b boundedCapture
	if n, err := b.Write(make([]byte, 256)); n != 256 || err != nil {
		t.Fatal(n, err)
	}
	if _, err := b.Write([]byte{1}); err == nil {
		t.Fatal("unbounded scanner output")
	}
	path := filepath.Join(t.TempDir(), "input")
	os.WriteFile(path, []byte("12345"), 0600)
	if _, err := boundedRead(path, 4); err == nil {
		t.Fatal("truncated ownership accepted")
	}
	if data, err := boundedRead(path, 5); err != nil || string(data) != "12345" {
		t.Fatal("exact bound", err)
	}
}

func TestConflictingInterpretedLaunchers(t *testing.T) {
	for _, command := range []string{"sh\x00/opt/pidp11/bin/pidp11.sh\x00", "python3\x00/opt/pidp11/bin/test.py\x00", "sh\x00/opt/pidp11/bin/pdp11control.sh\x00start\x00", "/opt/pidp11/bin/pdp11_realcons\x00"} {
		if conflictingProcess("sh", []byte(command)) == "" {
			t.Fatal("missed interpreted launcher")
		}
	}
	if conflictingProcess("pdp11_realcons", nil) == "" {
		t.Fatal("missed comm name")
	}
	if conflictingProcess("python3", []byte("python3\x00offline-fixture.py\x00")) != "" {
		t.Fatal("unrelated interpreter refused")
	}
}
