package peripheral

import (
	"encoding/json"
	"io"
	"net/http"
	"pidp11.local/webdesktop/internal/access"
)

// Register exposes only authenticated immutable snapshots. Browser requests have
// no file paths, publication authority, monitor commands or media operations.
func (s *Store) Register(mux *http.ServeMux, gate *access.Gate) {
	mux.Handle("GET /api/v1/devices", gate.Require(access.DeviceObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(s.List()) })))
	mux.Handle("GET /api/v1/devices/{id}/{generation}", gate.Require(access.DeviceObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		snapshot, ok := s.Get(r.PathValue("id"), r.PathValue("generation"))
		if !ok {
			http.Error(w, "retired device observation", 404)
			return
		}
		json.NewEncoder(w).Encode(snapshot)
	})))
}

// ControlHandler belongs only on the existing private Unix control listener.
func (s *Store) ControlHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /devices/status", func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(s.Status()) })
	for _, op := range []string{"publish", "retract"} {
		mux.HandleFunc("POST /devices/"+op, func(w http.ResponseWriter, r *http.Request) {
			decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2048))
			decoder.DisallowUnknownFields()
			var a Approval
			var extra any
			if decoder.Decode(&a) != nil || decoder.Decode(&extra) != io.EOF {
				http.Error(w, "invalid approval", 400)
				return
			}
			if err := s.Apply(a, op == "publish"); err != nil {
				http.Error(w, err.Error(), 409)
				return
			}
			json.NewEncoder(w).Encode(s.Status())
		})
	}
	return mux
}
