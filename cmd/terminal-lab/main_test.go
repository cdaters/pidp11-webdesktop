package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPrivateConfigurationFiles(t *testing.T) {
	dir := t.TempDir()
	good := filepath.Join(dir, "private")
	if err := os.WriteFile(good, []byte("fixture"), 0600); err != nil {
		t.Fatal(err)
	}
	if b, err := private(good); err != nil || string(b) != "fixture" {
		t.Fatal("private file rejected", err)
	}
	link := filepath.Join(dir, "link")
	if err := os.Symlink(good, link); err != nil {
		t.Fatal(err)
	}
	if _, err := private(link); err == nil {
		t.Fatal("symlink accepted")
	}
	if _, err := private(dir); err == nil {
		t.Fatal("directory accepted")
	}
	if err := os.Chmod(good, 0644); err != nil {
		t.Fatal(err)
	}
	if _, err := private(good); err == nil {
		t.Fatal("public file accepted")
	}
	if err := os.Chmod(good, 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(good, make([]byte, 8193), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := private(good); err == nil {
		t.Fatal("oversize file accepted")
	}
}
