package peripheral

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"pidp11.local/webdesktop/internal/access"
)

// Register adds read-only bounded polling. No per-browser goroutine, subscription
// queue or emulator backpressure exists; slow viewers receive explicit offset loss.
func (f *Followers) Register(mux *http.ServeMux, gate *access.Gate) {
	mux.Handle("GET /api/v1/device-media", gate.Require(access.DeviceObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(f.Media()) })))
	mux.Handle("GET /api/v1/device-streams", gate.Require(access.DeviceObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(f.List()) })))
	mux.Handle("GET /api/v1/device-streams/{id}/{generation}", gate.Require(access.DeviceObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		after, err := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
		if err != nil {
			http.Error(w, "explicit byte offset required", 400)
			return
		}
		view, ok := f.Read(r.PathValue("id"), r.PathValue("generation"), after)
		if !ok {
			http.Error(w, "retired observation or invalid offset", 404)
			return
		}
		json.NewEncoder(w).Encode(view)
	})))
	mux.Handle("GET /api/v1/device-streams/{id}/{generation}/reader", gate.Require(access.DeviceObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()

		e := f.entries[r.PathValue("id")]
		if e == nil || e.view.Generation != r.PathValue("generation") || e.view.ReaderSHA256 == "" {
			f.mu.Unlock()
			http.Error(w, "reader observation unavailable", 404)
			return
		}
		snapshot := Snapshot{ID: e.config.ID, Kind: "pc11-reader", Generation: e.view.Generation, Simulator: e.view.Simulator, Guest: e.view.Guest, State: "read-only", SHA256: e.view.ReaderSHA256, Bytes: len(e.reader), Data: append([]byte{}, e.reader...)}
		f.mu.Unlock()
		json.NewEncoder(w).Encode(snapshot)
	})))
}
func (f *Followers) ControlHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /streams/views", func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(f.List()) })
	mux.HandleFunc("GET /streams/status", func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(f.Status()) })
	for _, op := range []string{"follow", "renew", "progress", "complete", "detach", "guest-returned", "drained", "closed"} {
		mux.HandleFunc("POST /streams/"+op, func(w http.ResponseWriter, r *http.Request) {
			decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2048))
			decoder.DisallowUnknownFields()
			var a FollowApproval
			var extra any
			if decoder.Decode(&a) != nil || decoder.Decode(&extra) != io.EOF {
				http.Error(w, "invalid peripheral approval", 400)
				return
			}
			if err := f.Apply(op, a); err != nil {
				http.Error(w, err.Error(), 409)
				return
			}
			json.NewEncoder(w).Encode(f.Status())
		})
	}
	return mux
}
