package peripheral

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"pidp11.local/webdesktop/internal/access"
)

func TestEmptyExportAndObserverIsolation(t *testing.T) {
	path := filepath.Join(t.TempDir(), "empty.out")
	if err := os.WriteFile(path, []byte{}, 0600); err != nil {
		t.Fatal(err)
	}
	store, _ := New([]Config{{ID: "lp", Kind: "lp11", Path: path}})
	digest := sha256.Sum256(nil)
	if err := store.Apply(Approval{Instance: store.Status().Instance, ID: "lp", Simulator: "sim", Guest: "guest", SHA256: hex.EncodeToString(digest[:]), Completed: true}, true); err != nil {
		t.Fatal(err)
	}
	snapshot, ok := store.Get("lp", store.List()[0].Generation)
	if !ok {
		t.Fatal("missing empty export")
	}
	encoded, err := json.Marshal(snapshot)
	if err != nil || !strings.Contains(string(encoded), `"data":""`) {
		t.Fatal("empty export must remain downloadable", string(encoded), err)
	}
	gate, err := access.NewSecure("https://localhost:8445", []access.Credential{{Token: strings.Repeat("a", 64), Capabilities: []access.Capability{access.DeviceObserve}}})
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	store.Register(mux, gate)
	for _, path := range []string{"/api/v1/devices", "/api/v1/devices/lp/" + snapshot.Generation} {
		response := httptest.NewRecorder()
		mux.ServeHTTP(response, httptest.NewRequest("GET", path, nil))
		if response.Code == 200 {
			t.Fatal("unauthenticated device access")
		}
	}
	// Public mux cannot publish; privileged routes exist only on the Unix listener.
	response := httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequest("POST", "/devices/publish", strings.NewReader("{}")))
	if response.Code != 404 {
		t.Fatal(response.Code)
	}
}
