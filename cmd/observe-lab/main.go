// Isolated observation fixture only. It cannot connect to RPC or control an emulator.
package main

import (
	"context"
	"flag"
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
	info, e := os.Stat(*tokenFile)
	if e != nil || info.Mode().Perm()&0077 != 0 {
		log.Fatal("owner-only token file required")
	}
	b, e := os.ReadFile(*tokenFile)
	if e != nil {
		log.Fatal(e)
	}
	token := strings.TrimSpace(string(b))
	if !access.ValidToken(token) {
		log.Fatal("invalid token")
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	store := observe.New()
	go func() {
		if e := store.Listen(ctx, *socket); e != nil {
			log.Fatal(e)
		}
	}()
	auth := access.New([]access.Credential{{Token: token, Capabilities: []access.Capability{access.Observe}}})
	srv := &http.Server{Addr: "127.0.0.1:8083", Handler: observe.NewServer(store, auth).Handler(web.Assets()), ReadHeaderTimeout: time.Second, ReadTimeout: 3 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 8192}
	go func() { <-ctx.Done(); srv.Close() }()
	log.Print("isolated passive observation on loopback:8083; no RPC/control capability")
	if e := srv.ListenAndServe(); e != nil && e != http.ErrServerClosed {
		log.Fatal(e)
	}
}
