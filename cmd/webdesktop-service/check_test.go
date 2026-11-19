package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCheckConfigurationWithoutGuestOrControlSocket(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "private")
	if err := provision([]string{"-directory", dir, "-listen", "127.0.0.1:8445", "-origin", "https://127.0.0.1:8445"}); err != nil {
		t.Fatal(err)
	}
	var out bytes.Buffer
	if err := checkConfig(filepath.Join(dir, "config.json"), &out); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "all start detached") {
		t.Fatal(out.String())
	}
	token, _ := os.ReadFile(filepath.Join(dir, "writer.token"))
	if strings.Contains(out.String(), strings.TrimSpace(string(token))) {
		t.Fatal("credential leaked")
	}
	if err := os.Chmod(filepath.Join(dir, "key.pem"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := checkConfig(filepath.Join(dir, "config.json"), &out); err == nil {
		t.Fatal("public private key accepted")
	}
}
func TestProvisionRejectsInvalidPortBeforeWriting(t *testing.T) {
	for _, port := range []string{"443", "65536", "text"} {
		dir := filepath.Join(t.TempDir(), "private")
		err := provision([]string{"-directory", dir, "-listen", "127.0.0.1:" + port, "-origin", "https://127.0.0.1:" + port})
		if err == nil {
			t.Fatal("invalid port accepted")
		}
		if _, err := os.Stat(dir); !os.IsNotExist(err) {
			t.Fatal("invalid provision wrote files")
		}
	}
}
