package terminalservice

import (
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
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
	if !info.IsDir() || info.Mode().Perm()&0077 != 0 {
		return nil, errors.New("control directory must be private (0700)")
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
	return mux
}

// ControlServer sets bounded local request and response lifetimes.
func ControlServer(m *Manager) *http.Server {
	return &http.Server{Handler: m.ControlHandler(), ReadHeaderTimeout: time.Second, ReadTimeout: 2 * time.Second, WriteTimeout: 3 * time.Second, IdleTimeout: 5 * time.Second, MaxHeaderBytes: 2048}
}
