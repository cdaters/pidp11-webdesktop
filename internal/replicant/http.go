package replicant

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Attachment identifies a guest-line lifetime, never an inferred operating
// system or CPU state. Current must return false on detached/uncertain state.
type Attachment struct {
	ViewerRevision uint64 `json:"viewer_revision,omitempty"`
	Endpoint       string `json:"endpoint"`
	Generation     string `json:"generation"`
	Simulator      string `json:"simulator_generation"`
}

// Adapter serves one explicitly published excerpt. The embedding caller owns
// TLS, authentication-token delivery, listener shutdown and attachment tracking.
// mu protects the selection and expiration. Current runs outside mu and must be
// concurrency-safe. No endpoint reads a terminal, invokes a tool or writes keys.
type Adapter struct {
	token       string
	current     func() (Attachment, bool)
	mu          sync.Mutex
	selection   Selection
	expires     time.Time
	revision    uint64 // Fences publications whose identity callback overlaps revocation.
	selectionID string
	instance    string
}

// NewAdapter requires a private independent token and authoritative identity
// callback. The caller must not derive attachment identity from model output.
func NewAdapter(token string, current func() (Attachment, bool)) (*Adapter, error) {
	if len(token) < 32 || len(token) > 128 || strings.TrimSpace(token) != token || current == nil {
		return nil, errors.New("private token and attachment callback required")
	}
	var nonce [16]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return nil, err
	}
	return &Adapter{token: token, current: current, instance: hex.EncodeToString(nonce[:])}, nil
}

// Publish is a local application operation, not an HTTP endpoint. Consent is
// required for each selection. The snapshot expires after 30 seconds and is not
// refreshed by reads. A later read rechecks identity; a mismatch erases it.
func (a *Adapter) Publish(selection Selection, consent bool) error {
	_, err := a.PublishWithReceipt(selection, consent)
	return err
}

// PublishWithReceipt returns an unpredictable receipt for this exact publication.
// Consumers must bind a later read to that receipt, not merely to a guest line:
// another authorized page may publish different text on the same attachment.
func (a *Adapter) PublishWithReceipt(selection Selection, consent bool) (string, error) {
	return a.PublishAt(selection, consent, a.PublicationEpoch())
}

// PublicationEpoch fences the complete status-to-publication exchange, including
// requests delayed before reaching this process. It is not an authorization token.
func (a *Adapter) PublicationEpoch() string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.instance + ":" + strconv.FormatUint(a.revision, 16)
}

// PublishAt requires the exact epoch observed before preparing the publication.
// Revocation, replacement and service restart invalidate old preparation.
func (a *Adapter) PublishAt(selection Selection, consent bool, epoch string) (string, error) {
	a.mu.Lock()
	revision := a.revision
	if epoch != a.instance+":"+strconv.FormatUint(revision, 16) {
		a.mu.Unlock()
		return "", errors.New("publication preparation retired")
	}
	a.mu.Unlock()
	current, ok := a.current()
	if !ok || current.Simulator == "" || len(current.Simulator) > 128 || selection.Simulator != current.Simulator || selection.ViewerRevision != current.ViewerRevision {
		return "", errors.New("no confirmed guest attachment")
	}
	if _, err := Readback(selection, current.Endpoint, current.Generation, consent); err != nil {
		return "", err
	}
	var receipt [16]byte
	if _, err := rand.Read(receipt[:]); err != nil {
		return "", err
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.revision != revision {
		return "", errors.New("selection changed or revoked during publication")
	}
	a.revision++
	a.selectionID = hex.EncodeToString(receipt[:])
	a.selection = selection
	a.expires = time.Now().Add(30 * time.Second)
	return a.selectionID, nil
}

// Revoke forgets a selection on disconnect, explicit unsharing or shutdown.
func (a *Adapter) Revoke() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.revision++
	a.selectionID = ""
	a.selection = Selection{}
	a.expires = time.Time{}
}

func (a *Adapter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if r.Header.Get("Origin") != "" {
		http.Error(w, "Browser access refused", 403)
		return
	}
	if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+a.token)) != 1 {
		http.Error(w, "Authentication required", 401)
		return
	}
	if r.URL.RawQuery != "" {
		http.Error(w, "Query refused", 400)
		return
	}
	if r.URL.Path == "/api/pidp11/keys" {
		http.Error(w, "Automatic keyboard input is disabled", 403)
		return
	}
	if r.Method != "GET" {
		http.Error(w, "Read-only adapter", 405)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	switch r.URL.Path {
	case "/api/pidp11/status":
		// Upstream's Boolean means Screen existence, which this adapter cannot
		// observe. Null must never be replaced with a guessed false or CPU state.
		epoch := a.PublicationEpoch()
		current, attached := a.current()
		json.NewEncoder(w).Encode(map[string]any{"publication_epoch": epoch, "attachment": current, "attachment_confirmed": attached, "os": nil, "running": nil, "cpu_running": "unknown", "semantics": "guest selection only; GNU Screen and OS unobserved"})
	case "/api/pidp11/screen":
		current, ok := a.current()
		a.mu.Lock()
		defer a.mu.Unlock()
		snapshot, err := Readback(a.selection, current.Endpoint, current.Generation, true)
		if !ok || current.Simulator == "" || a.selection.Simulator != current.Simulator || a.selection.ViewerRevision != current.ViewerRevision || err != nil || !time.Now().Before(a.expires) {
			a.revision++
			a.selectionID = ""
			a.selection = Selection{}
			a.expires = time.Time{}
			http.Error(w, "Fresh explicit selection required", 409)
			return
		}
		if r.Context().Err() != nil {
			return
		}
		snapshot.SelectionID = a.selectionID
		json.NewEncoder(w).Encode(snapshot)
	default:
		http.Error(w, "Unsupported route", 404)
	}
}
