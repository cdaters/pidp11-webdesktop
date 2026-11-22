package replicant

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

// WithSharing adds a separately authenticated publication/revocation boundary.
// The writer credential must never be given to the model or readback consumer.
// Current attachment identity remains the adapter owner's independent input.
func WithSharing(adapter *Adapter, writer string) (http.Handler, error) {
	if adapter == nil || len(writer) < 32 || len(writer) > 128 || strings.TrimSpace(writer) != writer || writer == adapter.token {
		return nil, errors.New("distinct private sharing credential required")
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/pidp11/selection" {
			adapter.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		if r.Header.Get("Origin") != "" || subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+writer)) != 1 {
			http.Error(w, "Sharing authorization required", 403)
			return
		}
		if r.URL.RawQuery != "" {
			http.Error(w, "Query refused", 400)
			return
		}
		if r.Method == "DELETE" {
			adapter.Revoke()
			w.WriteHeader(204)
			return
		}
		if r.Method != "POST" {
			http.Error(w, "Unsupported selection operation", 405)
			return
		}
		var request struct {
			Selection        Selection `json:"selection"`
			Consent          bool      `json:"consent"`
			PublicationEpoch string    `json:"publication_epoch"`
		}
		dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 6144))
		dec.DisallowUnknownFields()
		var extra any
		if dec.Decode(&request) != nil || dec.Decode(&extra) != io.EOF {
			http.Error(w, "Invalid bounded selection", 400)
			return
		}
		receipt, err := adapter.PublishAt(request.Selection, request.Consent, request.PublicationEpoch)
		if err != nil {
			http.Error(w, "Selection identity, consent or size invalid", 409)
			return
		}
		w.Header().Set("X-Selection-ID", receipt)
		w.WriteHeader(204)
	}), nil
}
