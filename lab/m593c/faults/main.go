// Command faults is a labeled slow runner fixture for gateway failure tests.
// It never generates model answers. Counters measure cancellation propagation.
package main

import (
	"encoding/json"
	"io"
	"net/http"
	"sync/atomic"
	"time"
)

func main() {
	var entered, cancelled atomic.Int32
	mux := http.NewServeMux()
	mux.HandleFunc("/api/chat", func(w http.ResponseWriter, r *http.Request) {
		if _, err := io.Copy(io.Discard, http.MaxBytesReader(w, r.Body, 24576)); err != nil {
			http.Error(w, "fixture input bound", 400)
			return
		}
		entered.Add(1)
		select {
		case <-r.Context().Done():
			cancelled.Add(1)
		case <-time.After(30 * time.Second):
			http.Error(w, "DELIBERATE TIMEOUT FIXTURE", 503)
		}
	})
	mux.HandleFunc("/state", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]int32{"entered": entered.Load(), "cancelled": cancelled.Load()})
	})
	server := http.Server{Addr: "127.0.0.1:19191", Handler: mux, ReadHeaderTimeout: 3 * time.Second, IdleTimeout: 10 * time.Second}
	if err := server.ListenAndServe(); err != nil {
		panic(err)
	}
}
