package terminalservice

import (
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"syscall"
	"time"
)

// ControlListener requires a service-owned private directory, never unlinks an
// existing socket, and has no TCP listener. A crash may require removal of this
// companion socket only, after verifying the service is stopped.
func ControlListener(path string) (net.Listener, error) {
	info, err := os.Lstat(filepath.Dir(path))
	if err != nil {
		return nil, err
	}
	owner, ok := info.Sys().(*syscall.Stat_t)
	if !info.IsDir() || info.Mode().Perm()&0077 != 0 || !ok || int(owner.Uid) != os.Geteuid() {
		return nil, errors.New("control directory must be private (0700) and owned by the service account")
	}
	listener, err := net.Listen("unix", path)
	if err != nil {
		return nil, err
	}
	if err = os.Chmod(path, 0600); err != nil {
		listener.Close()
		return nil, err
	}
	return listener, nil
}

// ControlHandler must be served only on the private local control socket.
func (m *Manager) ControlHandler() http.Handler {
	mux := http.NewServeMux()
	// Private, bounded runtime counters only: no profiles, addresses or secrets.
	mux.HandleFunc("GET /metrics", func(w http.ResponseWriter, r *http.Request) {
		var stats runtime.MemStats
		runtime.ReadMemStats(&stats)
		json.NewEncoder(w).Encode(map[string]uint64{"goroutines": uint64(runtime.NumGoroutine()), "heap_bytes": stats.HeapAlloc, "total_allocated_bytes": stats.TotalAlloc, "gc_cycles": uint64(stats.NumGC)})
	})
	mux.HandleFunc("GET /status", func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(m.Status()) })
	for _, op := range []string{"attach", "detach"} {
		mux.HandleFunc("POST /"+op, func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, 1024)
			d := json.NewDecoder(r.Body)
			d.DisallowUnknownFields()
			var a Approval
			var extra any
			if d.Decode(&a) != nil || d.Decode(&extra) != io.EOF {
				http.Error(w, "invalid local approval", 400)
				return
			}
			var err error
			if op == "attach" {
				err = m.Attach(r.Context(), a)
			} else {
				err = m.Detach(a)
			}
			if err != nil {
				http.Error(w, err.Error(), 409)
				return
			}
			json.NewEncoder(w).Encode(m.Status())
		})
	}
	mux.HandleFunc("POST /renew", func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 1024)
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		var renewal Renewal
		var extra any
		if decoder.Decode(&renewal) != nil || decoder.Decode(&extra) != io.EOF {
			http.Error(w, "invalid renewal", 400)
			return
		}
		if err := m.Renew(renewal); err != nil {
			http.Error(w, err.Error(), 409)
			return
		}
		json.NewEncoder(w).Encode(m.Status())
	})
	return mux
}

// ControlServer sets bounded local request and response lifetimes.
func ControlServer(m *Manager) *http.Server {
	return &http.Server{Handler: m.ControlHandler(), ReadHeaderTimeout: time.Second, ReadTimeout: 2 * time.Second, WriteTimeout: 3 * time.Second, IdleTimeout: 5 * time.Second, MaxHeaderBytes: 2048}
}
