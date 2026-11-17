// realcons-lab is an experimental fixture, never a production deployment entry point.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"pidp11.local/webdesktop/internal/labrpc"
	"runtime"
	"syscall"
	"time"
)

func isolated() error {
	if runtime.GOOS != "linux" || os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		return fmt.Errorf("requires disposable Linux lab")
	}
	interfaces, e := net.Interfaces()
	if e != nil {
		return e
	}
	for _, i := range interfaces {
		if i.Flags&net.FlagLoopback == 0 {
			return fmt.Errorf("non-loopback interface %s: refuse execution", i.Name)
		}
	}
	return nil
}
func main() {
	flag.Parse()
	if e := isolated(); e != nil {
		log.Fatal(e)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	p := labrpc.NewPanel()
	s, e := labrpc.Listen("127.0.0.1:39099", p)
	if e != nil {
		log.Fatal(e)
	}
	go s.Serve(ctx)
	if e = labrpc.Register(39099); e != nil {
		log.Fatal(e)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /state", func(w http.ResponseWriter, r *http.Request) {
		i, o, g, st := p.Snapshot()
		json.NewEncoder(w).Encode(map[string]any{"inputs": i, "outputs": o, "gets": g, "sets": st})
	})
	mux.HandleFunc("POST /set", func(w http.ResponseWriter, r *http.Request) {
		var v map[string]uint64
		if e := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2048)).Decode(&v); e != nil {
			http.Error(w, e.Error(), 400)
			return
		}
		if e := p.Set(v); e != nil {
			http.Error(w, e.Error(), 400)
			return
		}
		w.Write([]byte("{}"))
	})
	httpServer := &http.Server{Addr: "127.0.0.1:8081", Handler: mux, ReadHeaderTimeout: time.Second}
	go func() { <-ctx.Done(); httpServer.Close() }()
	log.Print("isolated REALCONS lab ready")
	if e = httpServer.ListenAndServe(); e != nil && e != http.ErrServerClosed {
		log.Fatal(e)
	}
}
