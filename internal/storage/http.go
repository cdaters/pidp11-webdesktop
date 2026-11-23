package storage

import (
	"encoding/json"
	"io"
	"net/http"
	"pidp11.local/webdesktop/internal/access"
)

// Register exposes captured metadata only; no public mutation or path input.
func (s *Store) Register(mux *http.ServeMux, gate *access.Gate) {
	mux.Handle("GET /api/v1/storage", gate.Require(access.DeviceObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(s.List()) })))
	mux.Handle("GET /api/v1/storage/{id}/{generation}", gate.Require(access.DeviceObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		v, ok := s.Get(r.PathValue("id"), r.PathValue("generation"))
		if !ok {
			http.Error(w, "retired storage snapshot", 404)
			return
		}
		json.NewEncoder(w).Encode(v)
	})))
}

// ControlHandler belongs only on the existing reserved local Unix socket.
func (s *Store) ControlHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /storage/status", func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(s.Status()) })
	for _, op := range []string{"publish", "revoke"} {
		mux.HandleFunc("POST /storage/"+op, func(w http.ResponseWriter, r *http.Request) {
			var a Approval
			var extra any
			d := json.NewDecoder(http.MaxBytesReader(w, r.Body, MaxRecord))
			d.DisallowUnknownFields()
			if d.Decode(&a) != nil || d.Decode(&extra) != io.EOF {
				http.Error(w, "invalid bounded snapshot", 400)
				return
			}
			var err error
			if op == "publish" {
				err = s.Publish(a)
			} else {
				err = s.Revoke(a)
			}
			if err != nil {
				http.Error(w, err.Error(), 409)
				return
			}
			json.NewEncoder(w).Encode(s.List())
		})
	}
	return mux
}
