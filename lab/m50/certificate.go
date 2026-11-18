// Disposable browser-compatible TLS certificate. No trust-store installation.
package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
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
	key, e := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if e != nil {
		panic(e)
	}
	serial, e := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if e != nil {
		panic(e)
	}
	t := &x509.Certificate{SerialNumber: serial, Subject: pkix.Name{CommonName: "Disposable M5 guest terminal laboratory"}, NotBefore: time.Now().Add(-time.Minute), NotAfter: time.Now().Add(8 * time.Hour), KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, IPAddresses: []net.IP{net.ParseIP("127.0.0.1")}}
	der, e := x509.CreateCertificate(rand.Reader, t, t, &key.PublicKey, key)
	if e != nil {
		panic(e)
	}
	priv, e := x509.MarshalPKCS8PrivateKey(key)
	if e != nil {
		panic(e)
	}
	for path, b := range map[string][]byte{"/tmp/observe-cert.pem": pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), "/tmp/observe-key.pem": pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: priv})} {
		if e = os.WriteFile(path, b, 0600); e != nil {
			panic(e)
		}
	}
}
