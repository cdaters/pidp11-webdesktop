// Disposable loopback TLS fixture. Never installs certificates or changes trust stores.
package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net"
	"os"
	"time"
)

func main() {
	pub, key, e := ed25519.GenerateKey(rand.Reader)
	if e != nil {
		panic(e)
	}
	serial, _ := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	t := &x509.Certificate{SerialNumber: serial, Subject: pkix.Name{CommonName: "Disposable PiDP11 isolated lab"}, NotBefore: time.Now().Add(-time.Minute), NotAfter: time.Now().Add(2 * time.Hour), KeyUsage: x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, IsCA: true, BasicConstraintsValid: true, IPAddresses: []net.IP{net.ParseIP("127.0.0.1")}}
	der, e := x509.CreateCertificate(rand.Reader, t, t, pub, key)
	if e != nil {
		panic(e)
	}
	priv, e := x509.MarshalPKCS8PrivateKey(key)
	if e != nil {
		panic(e)
	}
	if e = os.WriteFile("/tmp/observe-cert.pem", pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0600); e != nil {
		panic(e)
	}
	if e = os.WriteFile("/tmp/observe-key.pem", pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: priv}), 0600); e != nil {
		panic(e)
	}
}
