package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"pidp11.local/webdesktop/internal/server"
	"pidp11.local/webdesktop/internal/web"
	"syscall"
	"time"
)

func main() {
	address := flag.String("listen", "127.0.0.1:8080", "loopback IP and port (simulation only)")
	flag.Parse()
	if !server.ValidateListen(*address) {
		log.Fatal("Only literal loopback IP listeners are allowed")
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	app := server.New(web.Assets())
	go app.Run(ctx)
	srv := &http.Server{Addr: *address, Handler: app.Handler(), ReadHeaderTimeout: 3 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 8192}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		srv.Shutdown(shutdown)
	}()
	log.Printf("Mock-only PiDP-11 desktop: http://%s/?backend=mock (no RPC/GPIO/emulator integration)", *address)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
