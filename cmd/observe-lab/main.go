// Isolated observation fixture only. It cannot connect to RPC or control an emulator.
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
	"pidp11.local/webdesktop/internal/observe"
	"pidp11.local/webdesktop/internal/web"
	"runtime"
	"strings"
	"syscall"
	"time"
)

func main() {
	socket := flag.String("socket", "/tmp/observe.sock", "private snapshot socket")
	tokenFile := flag.String("token-file", "/tmp/observe.token", "owner-only token file")
	cert := flag.String("tls-cert", "", "isolated TLS certificate file")
	key := flag.String("tls-key", "", "isolated TLS private key file")
	publisherPID := flag.Int("publisher-pid", 0, "pin publisher PID/start/executable; 0 keeps M4.2 fixture")
	publisherUID := flag.Uint("publisher-uid", 0, "expected publisher UID")
	publisherGroup := flag.Int("publisher-group", -1, "optional socket group; parent directory must remain receiver-owned")
	flag.Parse()
	if runtime.GOOS != "linux" || os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		log.Fatal("isolated Linux lab required")
	}
	ifs, e := net.Interfaces()
	if e != nil {
		log.Fatal(e)
	}
	for _, i := range ifs {
		if i.Flags&net.FlagLoopback == 0 {
			log.Fatal("non-loopback interface")
		}
	}
	token, e := readToken(*tokenFile)
	if e != nil {
		log.Fatal(e)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	store := observe.New()
	go func() {
		var e error
		if *publisherPID > 0 {
			p, err := observe.PinPublisher(uint32(*publisherUID), *publisherPID)
			if err != nil {
				log.Fatal(err)
			}
			e = store.ListenVerified(ctx, *socket, p, *publisherGroup)
		} else {
			e = store.Listen(ctx, *socket)
		}
		if e != nil {
			log.Fatal(e)
		}
	}()
	auth := access.New([]access.Credential{{Token: token, Capabilities: []access.Capability{access.Observe}}})
	addr := "127.0.0.1:8083"
	if *cert != "" || *key != "" {
		if *cert == "" || *key == "" {
			log.Fatal("both TLS files required")
		}
		auth, e = access.NewSecure("https://127.0.0.1:8443", []access.Credential{{Token: token, Capabilities: []access.Capability{access.Observe}}})
		if e != nil {
			log.Fatal(e)
		}
		addr = "127.0.0.1:8443"
	}
	reload := make(chan os.Signal, 1)
	signal.Notify(reload, syscall.SIGHUP)
	defer signal.Stop(reload)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-reload:
				token, e := readToken(*tokenFile)
				if e != nil {
					auth.ReplaceCredentials(nil)
					continue
				}
				auth.ReplaceCredentials([]access.Credential{{Token: token, Capabilities: []access.Capability{access.Observe}}})
			}
		}
	}()
	srv := &http.Server{Addr: addr, TLSConfig: &tls.Config{MinVersion: tls.VersionTLS13}, Handler: observe.NewServer(store, auth).Handler(web.Assets()), ReadHeaderTimeout: time.Second, ReadTimeout: 3 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 8192}
	go func() { <-ctx.Done(); srv.Close() }()
	log.Printf("isolated passive observation on %s; no RPC/control capability", addr)
	if *cert != "" {
		e = srv.ListenAndServeTLS(*cert, *key)
	} else {
		e = srv.ListenAndServe()
	}
	if e != nil && e != http.ErrServerClosed {
		log.Fatal(e)
	}
}

// Local operator file, not browser input. O_NOFOLLOW and fstat avoid a symlink
// replacement race; the containing provisioning directory must also be private.
func readToken(path string) (string, error) {
	fd, e := syscall.Open(path, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if e != nil {
		return "", e
	}
	f := os.NewFile(uintptr(fd), path)
	defer f.Close()
	info, e := f.Stat()
	if e != nil {
		return "", e
	}
	st, ok := info.Sys().(*syscall.Stat_t)
	if !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 || !ok || int(st.Uid) != os.Geteuid() {
		return "", fmt.Errorf("receiver-owned private regular token file required")
	}
	b, e := io.ReadAll(io.LimitReader(f, 258))
	token := strings.TrimSpace(string(b))
	if e != nil || len(b) > 257 || !access.ValidToken(token) {
		return "", fmt.Errorf("invalid bounded token file")
	}
	return token, nil
}
