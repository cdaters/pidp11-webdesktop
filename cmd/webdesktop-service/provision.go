package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"flag"
	"fmt"
	"math/big"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"pidp11.local/webdesktop/internal/access"
	"pidp11.local/webdesktop/internal/terminalbridge"
	"pidp11.local/webdesktop/internal/terminalservice"
)

// provision creates new, private material only. A self-signed certificate needs
// explicit trust of this certificate by the owner, never global TLS bypass.
func provision(args []string) error {
	f := flag.NewFlagSet("provision", flag.ContinueOnError)
	directory := f.String("directory", "", "new private configuration directory")
	origin := f.String("origin", "", "exact browser HTTPS origin, including port")
	listen := f.String("listen", "", "explicit bind IP and port")
	endpoint := f.String("endpoint", "127.0.0.1:40100", "reserved raw guest line; no dial during provisioning")
	if err := f.Parse(args); err != nil {
		return err
	}
	if f.NArg() != 0 {
		return errors.New("unexpected arguments")
	}
	u, err := url.Parse(*origin)
	if err != nil {
		return err
	}
	if _, err = access.NewSecure(*origin, nil); err != nil {
		return err
	}
	host, port, err := net.SplitHostPort(*listen)
	portNumber, portErr := strconv.Atoi(port)
	if err != nil || portErr != nil || portNumber < 1024 || portNumber > 65535 || net.ParseIP(host) == nil || u.Port() != port || *directory == "" || !filepath.IsAbs(*directory) {
		return errors.New("absolute new directory and explicit matching listen/origin ports required")
	}
	endpoints := []terminalbridge.Config{{ID: "guest-dc0", Label: "Operator-configured DC11 guest line", Address: *endpoint, Kind: "raw-guest-line"}}
	if err = terminalbridge.Validate(endpoints); err != nil {
		return err
	}
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return err
	}
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return err
	}
	now := time.Now()
	template := &x509.Certificate{SerialNumber: serial, Subject: pkix.Name{CommonName: u.Hostname()}, NotBefore: now.Add(-time.Minute), NotAfter: now.Add(365 * 24 * time.Hour), KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, BasicConstraintsValid: true}
	if ip := net.ParseIP(u.Hostname()); ip != nil {
		template.IPAddresses = []net.IP{ip}
	} else {
		template.DNSNames = []string{u.Hostname()}
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		return err
	}
	keyBytes, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		return err
	}
	files := map[string][]byte{"certificate.pem": pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), "key.pem": pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyBytes})}
	for _, name := range []string{"writer.token", "observer.token"} {
		var nonce [32]byte
		if _, err = rand.Read(nonce[:]); err != nil {
			return err
		}
		files[name] = []byte(hex.EncodeToString(nonce[:]) + "\n")
	}
	c := terminalservice.Config{Listen: *listen, Origin: *origin, Control: "/run/pidp11-webdesktop/control.sock", Certificate: filepath.Join(*directory, "certificate.pem"), Key: filepath.Join(*directory, "key.pem"), Writer: filepath.Join(*directory, "writer.token"), Observer: filepath.Join(*directory, "observer.token"), Endpoints: endpoints}
	files["config.json"], err = json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	if err = os.Mkdir(*directory, 0700); err != nil {
		return err
	}
	for name, data := range files {
		out, e := os.OpenFile(filepath.Join(*directory, name), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if e != nil {
			return e
		}
		_, e = out.Write(data)
		closeErr := out.Close()
		if e != nil {
			return e
		}
		if closeErr != nil {
			return closeErr
		}
	}
	fmt.Printf("Created private configuration. No guest contacted. Certificate SHA-256: %x\n", sha256.Sum256(der))
	return nil
}
