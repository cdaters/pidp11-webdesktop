package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPrivateCredentialFile(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "token")
	token := strings.Repeat("a", 64)
	if e := os.WriteFile(p, []byte(token), 0600); e != nil {
		t.Fatal(e)
	}
	if got, e := readToken(p); e != nil || got != token {
		t.Fatal(got, e)
	}
	os.Chmod(p, 0644)
	if _, e := readToken(p); e == nil {
		t.Fatal("public token accepted")
	}
	os.Chmod(p, 0600)
	link := filepath.Join(d, "link")
	os.Symlink(p, link)
	if _, e := readToken(link); e == nil {
		t.Fatal("symlink accepted")
	}
	if _, e := readToken(d); e == nil {
		t.Fatal("directory accepted")
	}
	os.WriteFile(p, []byte(strings.Repeat("a", 4096)), 0600)
	if _, e := readToken(p); e == nil {
		t.Fatal("oversize accepted")
	}
}
