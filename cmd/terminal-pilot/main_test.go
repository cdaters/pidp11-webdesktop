package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"

	"pidp11.local/webdesktop/internal/access"
)

const validEndpoint = `[{"id":"unix7-dc0","label":"UNIX V7 pilot · DC11 tty00","address":"127.0.0.1:40100","kind":"raw-guest-line"}]`

func TestFixedEndpoint(t *testing.T) {
	if _, err := endpoint([]byte(validEndpoint)); err != nil {
		t.Fatal(err)
	}
	for _, bad := range []string{
		"[]", validEndpoint + "{}",
		strings.Replace(validEndpoint, "unix7-dc0", "another", 1),
		strings.Replace(validEndpoint, "40100", "40101", 1),
		strings.Replace(validEndpoint, "127.0.0.1", "0.0.0.0", 1),
		strings.Replace(validEndpoint, "127.0.0.1", "localhost", 1),
		strings.Replace(validEndpoint, "raw-guest-line", "monitor", 1),
		strings.Replace(validEndpoint, "\"kind\"", "\"extra\":1,\"kind\"", 1),
		validEndpoint[:len(validEndpoint)-1] + "," + validEndpoint[1:],
	} {
		if _, err := endpoint([]byte(bad)); err == nil {
			t.Fatalf("accepted invalid config %q", bad)
		}
	}
}

func TestPrivateInputs(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "input")
	if err := os.WriteFile(path, []byte("fixture"), 0600); err != nil {
		t.Fatal(err)
	}
	if b, err := readPrivate(path); err != nil || string(b) != "fixture" {
		t.Fatal(err)
	}
	link := filepath.Join(dir, "link")
	if err := os.Symlink(path, link); err != nil {
		t.Fatal(err)
	}
	fifo := filepath.Join(dir, "fifo")
	if err := syscall.Mkfifo(fifo, 0600); err != nil {
		t.Fatal(err)
	}
	for _, p := range []string{dir, link, fifo, filepath.Join(dir, "missing")} {
		if _, err := readPrivate(p); err == nil {
			t.Errorf("accepted non-private input %s", p)
		}
	}
	if err := os.Chmod(path, 0644); err != nil {
		t.Fatal(err)
	}
	if _, err := readPrivate(path); err == nil {
		t.Fatal("public file accepted")
	}
	if err := os.Chmod(path, 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, make([]byte, 8193), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := readPrivate(path); err == nil {
		t.Fatal("oversize file accepted")
	}
}

func TestSeparateCapabilities(t *testing.T) {
	writer, reader := []byte(strings.Repeat("a", 64)), []byte(strings.Repeat("b", 64))
	keys, err := credentials(writer, reader)
	if err != nil {
		t.Fatal(err)
	}
	if len(keys) != 2 || len(keys[0].Capabilities) != 2 || len(keys[1].Capabilities) != 1 || keys[1].Capabilities[0] != access.TerminalObserve {
		t.Fatal("capability separation changed")
	}
	for _, pair := range [][2][]byte{{writer, writer}, {[]byte("short"), reader}, {writer, nil}} {
		if _, err := credentials(pair[0], pair[1]); err == nil {
			t.Fatal("invalid credential pair accepted")
		}
	}
}

func TestCertificateIdentityAndLifetime(t *testing.T) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	private, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: private})
	now := time.Now()
	template := &x509.Certificate{SerialNumber: big.NewInt(1), NotBefore: now.Add(-time.Minute), NotAfter: now.Add(time.Hour), IPAddresses: []net.IP{net.ParseIP("127.0.0.1")}, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}}
	makeCert := func() []byte {
		der, e := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
		if e != nil {
			t.Fatal(e)
		}
		return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	}
	cert := makeCert()
	if _, err := certificate(cert, keyPEM, now); err != nil {
		t.Fatal(err)
	}
	for _, at := range []time.Time{now.Add(-time.Hour), now.Add(2 * time.Hour)} {
		if _, err := certificate(cert, keyPEM, at); err == nil {
			t.Fatal("invalid certificate time accepted")
		}
	}
	template.IPAddresses = []net.IP{net.ParseIP("127.0.0.2")}
	if _, err := certificate(makeCert(), keyPEM, now); err == nil {
		t.Fatal("wrong identity accepted")
	}
	if _, err := certificate(cert, []byte("invalid"), now); err == nil {
		t.Fatal("invalid key accepted")
	}
}
