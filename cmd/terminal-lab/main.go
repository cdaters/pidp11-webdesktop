// Explicit network-none laboratory entry point. Never enabled by the mock executable.
package main

import (
	"context"
	"crypto/tls"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"pidp11.local/webdesktop/internal/access"
	"pidp11.local/webdesktop/internal/terminalbridge"
	"pidp11.local/webdesktop/internal/web"
	"runtime"
	"strings"
	"syscall"
	"time"
)

func private(path string) ([]byte, error) {
	fd, err := syscall.Open(path, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return nil, err
	}
	f := os.NewFile(uintptr(fd), path)
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		return nil, err
	}
	owner, ok := st.Sys().(*syscall.Stat_t)
	if !st.Mode().IsRegular() || st.Mode().Perm()&0077 != 0 || !ok || int(owner.Uid) != os.Geteuid() {
		return nil, fmt.Errorf("private owner-only regular file required")
	}
	b, err := io.ReadAll(io.LimitReader(f, 8193))
	if len(b) > 8192 {
		return nil, fmt.Errorf("file too large")
	}
	return b, err
}
func main() {
	cfg := flag.String("config", "/tmp/terminals.json", "private endpoint configuration")
	token := flag.String("token-file", "/tmp/terminal.token", "private local terminal credential")
	observer := flag.String("observer-token-file", "/tmp/observer.token", "private observe-only credential")
	cert := flag.String("tls-cert", "/tmp/terminal-cert.pem", "lab certificate")
	key := flag.String("tls-key", "/tmp/terminal-key.pem", "lab TLS key")
	flag.Parse()
	if runtime.GOOS != "linux" || os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		log.Fatal("isolated Linux laboratory required")
	}
	interfaces, err := net.Interfaces()
	if err != nil {
		log.Fatal(err)
	}
	for _, i := range interfaces {
		if i.Flags&net.FlagLoopback == 0 {
			log.Fatal("network-none lab required")
		}
	}
	configBytes, err := private(*cfg)
	if err != nil {
		log.Fatal(err)
	}
	configs, err := terminalbridge.DecodeConfig(strings.NewReader(string(configBytes)))
	if err != nil {
		log.Fatal(err)
	}
	readKeys := func() ([]access.Credential, error) {
		a, e := private(*token)
		if e != nil {
			return nil, e
		}
		b, e := private(*observer)
		if e != nil {
			return nil, e
		}
		writer, reader := strings.TrimSpace(string(a)), strings.TrimSpace(string(b))
		if !access.ValidToken(writer) || !access.ValidToken(reader) || writer == reader {
			return nil, fmt.Errorf("distinct valid credentials required")
		}
		return []access.Credential{{Token: writer, Capabilities: []access.Capability{access.TerminalObserve, access.TerminalInput}}, {Token: reader, Capabilities: []access.Capability{access.TerminalObserve}}}, nil
	}
	keys, err := readKeys()
	if err != nil {
		log.Fatal(err)
	}
	auth, err := access.NewSecure("https://127.0.0.1:8445", keys)
	if err != nil {
		log.Fatal(err)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	bridge, err := terminalbridge.New(configs)
	if err != nil {
		log.Fatal(err)
	}
	if err = bridge.Connect(ctx); err != nil {
		log.Fatal(err)
	}
	defer bridge.Close()
	go bridge.Run(ctx)
	reload := make(chan os.Signal, 1)
	signal.Notify(reload, syscall.SIGHUP)
	defer signal.Stop(reload)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-reload:
				k, e := readKeys()
				if e != nil {
					auth.ReplaceCredentials(nil)
				} else {
					auth.ReplaceCredentials(k)
				}
			}
		}
	}()
	srv := &http.Server{Addr: "127.0.0.1:8445", TLSConfig: &tls.Config{MinVersion: tls.VersionTLS13}, Handler: (&terminalbridge.Server{Bridge: bridge, Auth: auth}).Handler(web.Assets()), ReadHeaderTimeout: time.Second, ReadTimeout: 3 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 8192}
	go func() { <-ctx.Done(); srv.Close() }()
	log.Print("Isolated guest terminal service on loopback TLS; no panel or media routes")
	if err = srv.ListenAndServeTLS(*cert, *key); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
