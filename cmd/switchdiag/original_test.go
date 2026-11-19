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
