package main

import (
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"pidp11.local/webdesktop/internal/terminalservice"
)

func TestProvisionAndPrivateValidation(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "new")
	args := []string{"-directory", dir, "-listen", "127.0.0.1:8445", "-origin", "https://127.0.0.1:8445"}
	if err := provision(args); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "config.json")
	data, _ := os.ReadFile(path)
	var c terminalservice.Config
	json.Unmarshal(data, &c)
	c.Control = "/tmp/m551.sock"
	data, _ = json.Marshal(c)
	os.WriteFile(path, data, 0600)
	if _, _, _, err := terminalservice.Load(path); err != nil {
		t.Fatal(err)
	}
	if err := provision(args); err == nil {
		t.Fatal("configuration overwritten")
	}
	for _, mutate := range []func(*terminalservice.Config){
		func(c *terminalservice.Config) { c.Origin = "http://127.0.0.1:8445" },
		func(c *terminalservice.Config) { c.Origin = "https://wrong.example:8445" },
		func(c *terminalservice.Config) { c.Listen = "127.0.0.1:443" },
		func(c *terminalservice.Config) { c.Control = "relative.sock" },
		func(c *terminalservice.Config) { c.Endpoints[0].Address = "192.0.2.1:40100" },
	} {
		var bad terminalservice.Config
		json.Unmarshal(data, &bad)
		mutate(&bad)
		b, _ := json.Marshal(bad)
		os.WriteFile(path, b, 0600)
		if _, _, _, err := terminalservice.Load(path); err == nil {
			t.Fatal("invalid configuration accepted")
		}
	}
	os.WriteFile(path, append(data, []byte(" {}")...), 0600)
	if _, _, _, err := terminalservice.Load(path); err == nil {
		t.Fatal("trailing JSON accepted")
	}
	secret, err := os.ReadFile(c.Writer)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), strings.TrimSpace(string(secret))) {
		t.Fatal("token content in config")
	}
	// Re-sign only the disposable test certificate outside its validity window.
	keyData, err := os.ReadFile(c.Key)
	if err != nil {
		t.Fatal(err)
	}
	keyBlock, _ := pem.Decode(keyData)
	private, err := x509.ParsePKCS8PrivateKey(keyBlock.Bytes)
	if err != nil {
		t.Fatal(err)
	}
	certData, err := os.ReadFile(c.Certificate)
	if err != nil {
		t.Fatal(err)
	}
	certBlock, _ := pem.Decode(certData)
	leaf, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil {
		t.Fatal(err)
	}
	leaf.NotBefore = time.Now().Add(-2 * time.Hour)
	leaf.NotAfter = time.Now().Add(-time.Hour)
	key := private.(*ecdsa.PrivateKey)
	der, err := x509.CreateCertificate(rand.Reader, leaf, leaf, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	os.WriteFile(c.Certificate, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0600)
	os.WriteFile(path, data, 0600)
	if _, _, _, err := terminalservice.Load(path); err == nil || !strings.Contains(err.Error(), "validity") {
		t.Fatal("expired certificate accepted", err)
	}
}
