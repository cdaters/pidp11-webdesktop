// realcons-lab is an experimental fixture, never a production deployment entry point.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"maps"
	"net"
	"net/http"
	"os"
	"os/signal"
	"pidp11.local/webdesktop/internal/broker"
	"pidp11.local/webdesktop/internal/consumer"
	"pidp11.local/webdesktop/internal/labrpc"
	"pidp11.local/webdesktop/internal/server"
	"pidp11.local/webdesktop/internal/web"
	"runtime"
	"sync/atomic"
	"syscall"
	"time"
)

// Heartbeat suppression is a lab-only failure injector, never a service feature.
type labFence struct {
	*consumer.Client
	paused atomic.Bool
}

func (f *labFence) Heartbeat() error {
	if f.paused.Load() {
		return nil
	}
	return f.Client.Heartbeat()
}
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
	role := flag.String("role", "direct", "direct, physical or broker (isolated lab only)")
	fencePath := flag.String("consumer-fence", "", "optional isolated consumer Unix socket")
	registerProbe := flag.Uint("register-probe", 0, "lab registration collision test only")
	replayCapacity := flag.Int("udp-replay-capacity", 4096, "bounded UDP replay entries; 65536 for the isolated 1 ms profile fixture")
	flag.Parse()
	if e := isolated(); e != nil {
		log.Fatal(e)
	}
	if *registerProbe != 0 {
		if e := labrpc.Register(uint32(*registerProbe)); e != nil {
			log.Fatal(e)
		}
		return
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	p := labrpc.NewPanel()
	rpcAddress, httpAddress := "127.0.0.1:39099", "127.0.0.1:8081"
	if *role == "physical" {
		rpcAddress, httpAddress = "127.0.0.1:39100", "127.0.0.1:8082"
	} else if *role != "direct" && *role != "broker" {
		log.Fatal("unknown role")
	}
	mux := http.NewServeMux()
	var arbiter *broker.Broker
	if *role == "broker" {
		arbiter = broker.New()
		if *fencePath != "" {
			f := &labFence{Client: &consumer.Client{Path: *fencePath}}
			arbiter = broker.NewFenced(f)
			mux.HandleFunc("POST /pause-heartbeat", func(w http.ResponseWriter, r *http.Request) { f.paused.Store(true); w.Write([]byte("{}")) })
			mux.HandleFunc("POST /resume-heartbeat", func(w http.ResponseWriter, r *http.Request) { f.paused.Store(false); w.Write([]byte("{}")) })
		}
		p.ReadInputs = arbiter.Inputs
		p.WriteOutputs = arbiter.Lamps
		browser := server.NewWithHub(web.Assets(), broker.NewAdapter(arbiter))
		go browser.Run(ctx)
		mux.Handle("/", browser.Handler())
		go func() {
			var client *labrpc.Client
			var lastOutputs map[string]uint64
			defer func() {
				if client != nil {
					client.Close()
				}
			}()
			timer := time.NewTicker(20 * time.Millisecond)
			defer timer.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-timer.C:
					if client == nil {
						lastOutputs = nil
						var err error
						client, err = labrpc.Dial("udp", "127.0.0.1:39100")
						if err == nil {
							err = client.Discover()
							if err == nil {
								err = client.ValidatePDP1170()
							}
						}
						if err != nil {
							if client != nil {
								client.Close()
								client = nil
							}
							arbiter.Fault("physical discovery unavailable")
							continue
						}
					}
					inputs, err := client.Read()
					if err == nil {
						arbiter.Physical(inputs, time.Now())
						outputs := arbiter.OutputSnapshot()
						if !maps.Equal(outputs, lastOutputs) {
							err = client.Write(outputs)
							if err == nil {
								lastOutputs = outputs
							}
						}
					}
					if err != nil {
						client.Close()
						client = nil
						arbiter.Fault("physical RPC lost or timed out")
					}
				}
			}
		}()
		mux.HandleFunc("POST /revoke", func(w http.ResponseWriter, r *http.Request) {
			arbiter.Revoke("explicit laboratory handoff/rearm")
			w.Write([]byte("{}"))
		})
		mux.HandleFunc("POST /grant-physical", func(w http.ResponseWriter, r *http.Request) {
			if e := arbiter.Grant("physical", time.Now()); e != nil {
				http.Error(w, e.Error(), 409)
				return
			}
			w.Write([]byte("{}"))
		})
	}
	s, e := labrpc.ListenWithReplayCapacity(rpcAddress, p, *replayCapacity)
	if e != nil {
		log.Fatal(e)
	}
	s.Exclusive.Store(*role == "broker")
	go s.Serve(ctx)
	if *role != "physical" {
		if e = labrpc.Register(39099); e != nil {
			log.Fatal(e)
		}
	}
	mux.HandleFunc("GET /state", func(w http.ResponseWriter, r *http.Request) {
		i, o, g, st := p.Snapshot()
		data := map[string]any{"inputs": i, "outputs": o, "gets": g, "sets": st, "heldReply": s.Held.Load()}
		if arbiter != nil {
			data["broker"] = arbiter.Snapshot()
		}
		json.NewEncoder(w).Encode(data)
	})
	mux.HandleFunc("POST /hold-load", func(w http.ResponseWriter, r *http.Request) { s.HoldLoad.Store(true); w.Write([]byte("{}")) })
	mux.HandleFunc("POST /hold-start-release", func(w http.ResponseWriter, r *http.Request) { s.HoldStartRelease.Store(true); w.Write([]byte("{}")) })
	mux.HandleFunc("POST /delay-replies", func(w http.ResponseWriter, r *http.Request) {
		s.ReplyDelayNanos.Store(int64(75 * time.Millisecond))
		w.Write([]byte("{}"))
	})
	mux.HandleFunc("POST /resume-replies", func(w http.ResponseWriter, r *http.Request) { s.ReplyDelayNanos.Store(0); w.Write([]byte("{}")) })
	mux.HandleFunc("GET /held-reply", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]bool{"held": s.Held.Load()})
	})
	mux.HandleFunc("POST /hold-parameter-reply", func(w http.ResponseWriter, r *http.Request) { s.HoldProcedure.Store(101); w.Write([]byte("{}")) })
	mux.HandleFunc("POST /hold-next-reply", func(w http.ResponseWriter, r *http.Request) { s.HoldNext.Store(true); w.Write([]byte("{}")) })
	mux.HandleFunc("POST /release-reply", func(w http.ResponseWriter, r *http.Request) { s.ReleaseHeld(); w.Write([]byte("{}")) })
	if arbiter == nil {
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
	}
	httpServer := &http.Server{Addr: httpAddress, Handler: mux, ReadHeaderTimeout: time.Second}
	go func() { <-ctx.Done(); httpServer.Close() }()
	log.Printf("isolated REALCONS lab ready: %s", *role)
	if e = httpServer.ListenAndServe(); e != nil && e != http.ErrServerClosed {
		log.Fatal(e)
	}
}
