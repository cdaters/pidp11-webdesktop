// Terminal-pilot serves one explicitly configured guest line on loopback HTTPS.
// It is a manually supervised Linux pilot, not an emulator or service installer.
package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"syscall"
	"time"

	"pidp11.local/webdesktop/internal/access"
	"pidp11.local/webdesktop/internal/terminalbridge"
	"pidp11.local/webdesktop/internal/web"
)

const listenAddress = "127.0.0.1:8445"
const browserOrigin = "https://" + listenAddress
const guestAddress = "127.0.0.1:40100"

type options struct{ config, writer, observer, certificate, key string }

// readPrivate rejects symlinks and special files before reading. Reading TLS
// material here also avoids reopening a checked path during server startup.
func readPrivate(path string) ([]byte, error) {
	fd, err := syscall.Open(path, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return nil, err
	}
	file := os.NewFile(uintptr(fd), path)
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return nil, err
	}
	owner, ok := info.Sys().(*syscall.Stat_t)
	if !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 || !ok || int(owner.Uid) != os.Geteuid() {
		return nil, errors.New("owner-only regular file required")
	}
	data, err := io.ReadAll(io.LimitReader(file, 8193))
	if err != nil {
		return nil, err
	}
	if len(data) > 8192 {
		return nil, errors.New("private file exceeds 8192 bytes")
	}
	return data, nil
}

func endpoint(data []byte) ([]terminalbridge.Config, error) {
	configs, err := terminalbridge.DecodeConfig(strings.NewReader(string(data)))
	if err != nil {
		return nil, err
	}
	if len(configs) != 1 || configs[0].ID != "unix7-dc0" || configs[0].Address != guestAddress {
		return nil, errors.New("pilot requires only unix7-dc0 at 127.0.0.1:40100")
	}
	return configs, nil
}

func credentials(writer, observer []byte) ([]access.Credential, error) {
	w, r := strings.TrimSpace(string(writer)), strings.TrimSpace(string(observer))
	if !access.ValidToken(w) || !access.ValidToken(r) || w == r {
		return nil, errors.New("distinct valid writer and observer credentials required")
	}
	return []access.Credential{
		{Token: w, Capabilities: []access.Capability{access.TerminalObserve, access.TerminalInput}},
		{Token: r, Capabilities: []access.Capability{access.TerminalObserve}},
	}, nil
}

func certificate(certPEM, keyPEM []byte, now time.Time) (tls.Certificate, error) {
	cert, err := tls.X509KeyPair(certPEM, keyPEM)
	if err != nil {
		return cert, err
	}
	leaf, err := x509.ParseCertificate(cert.Certificate[0])
	if err != nil {
		return cert, err
	}
	if err = leaf.VerifyHostname("127.0.0.1"); err != nil {
		return cert, err
	}
	if now.Before(leaf.NotBefore) || !now.Before(leaf.NotAfter) {
		return cert, errors.New("certificate is not currently valid")
	}
	return cert, nil
}

// run owns the listener and bridge, but never a simulator, disk or console.
// All provisioning is checked before dialing the single guest endpoint. Shutdown
// closes connections without sending guest bytes or attempting an automatic retry.
func run(ctx context.Context, o options) error {
	if runtime.GOOS != "linux" {
		return errors.New("Linux pilot host required")
	}
	paths := []string{o.config, o.writer, o.observer, o.certificate, o.key}
	data := make([][]byte, len(paths))
	for i, path := range paths {
		var err error
		data[i], err = readPrivate(path)
		if err != nil {
			return fmt.Errorf("private input %d: %w", i+1, err)
		}
	}
	configs, err := endpoint(data[0])
	if err != nil {
		return err
	}
	keys, err := credentials(data[1], data[2])
	if err != nil {
		return err
	}
	cert, err := certificate(data[3], data[4], time.Now())
	if err != nil {
		return err
	}
	gate, err := access.NewSecure(browserOrigin, keys)
	if err != nil {
		return err
	}
	bridge, err := terminalbridge.New(configs)
	if err != nil {
		return err
	}
	listener, err := net.Listen("tcp4", listenAddress)
	if err != nil {
		return err
	}
	defer listener.Close()
	if err = bridge.Connect(ctx); err != nil {
		return err
	}
	defer bridge.Close()
	lifetime, cancel := context.WithCancel(ctx)
	defer cancel()
	go bridge.Run(lifetime)
	server := &http.Server{
		Handler:           (&terminalbridge.Server{Bridge: bridge, Auth: gate}).Handler(web.Assets()),
		TLSConfig:         &tls.Config{MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{cert}},
		ReadHeaderTimeout: time.Second, ReadTimeout: 3 * time.Second,
		IdleTimeout: 30 * time.Second, MaxHeaderBytes: 8192,
	}
	go func() { <-lifetime.Done(); server.Close() }()
	log.Print("Terminal-only pilot ready on loopback TLS; one configured guest line; no lifecycle or panel routes")
	err = server.ServeTLS(listener, "", "")
	if errors.Is(err, http.ErrServerClosed) && ctx.Err() != nil {
		return nil
	}
	return err
}

func main() {
	var o options
	flag.StringVar(&o.config, "config", "", "private single-endpoint JSON file")
	flag.StringVar(&o.writer, "token-file", "", "private writer credential file")
	flag.StringVar(&o.observer, "observer-token-file", "", "private observer credential file")
	flag.StringVar(&o.certificate, "tls-cert", "", "private loopback certificate file")
	flag.StringVar(&o.key, "tls-key", "", "private certificate key file")
	flag.Parse()
	if flag.NArg() != 0 {
		log.Fatal("positional arguments are not accepted")
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, o); err != nil {
		log.Fatal(err)
	}
}
