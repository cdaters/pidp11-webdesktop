package replicant

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestReadOnlyHTTPSelectionLifecycle(t *testing.T) {
	token := strings.Repeat("t", 32)
	attachment := Attachment{Endpoint: "guest-line", Generation: "generation-a", Simulator: "simulator-a"}
	adapter, err := NewAdapter(token, func() (Attachment, bool) { return attachment, true })
	if err != nil {
		t.Fatal(err)
	}
	request := func(method, path, auth, origin string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, nil)
		r.Header.Set("Authorization", auth)
		r.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		adapter.ServeHTTP(w, r)
		return w
	}
	auth := "Bearer " + token
	for _, c := range []struct {
		method, path, auth, origin string
		code                       int
	}{
		{"GET", "/api/pidp11/screen", "", "", 401},
		{"GET", "/api/pidp11/screen", auth, "https://example.test", 403},
		{"GET", "/api/pidp11/screen", auth, "", 409},
		{"POST", "/api/pidp11/keys", auth, "", 403},
		{"POST", "/api/pidp11/screen", auth, "", 405},
		{"GET", "/api/pidp11/screen?refresh=1", auth, "", 400},
	} {
		if w := request(c.method, c.path, c.auth, c.origin); w.Code != c.code {
			t.Fatal(c, w.Code)
		}
	}
	selection := Selection{Endpoint: attachment.Endpoint, Generation: attachment.Generation, Text: "$ pwd\n/synthetic", Simulator: attachment.Simulator}
	if adapter.Publish(selection, false) == nil {
		t.Fatal("missing consent")
	}
	if err := adapter.Publish(selection, true); err != nil {
		t.Fatal(err)
	}
	w := request("GET", "/api/pidp11/screen", auth, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), "generation-a") || !strings.Contains(w.Body.String(), "not operator console") {
		t.Fatal(w)
	}
	status := request("GET", "/api/pidp11/status", auth, "")
	if !strings.Contains(status.Body.String(), `"running":null`) {
		t.Fatal("invented CPU/Screen state")
	}
	attachment.Generation = "generation-b"
	if request("GET", "/api/pidp11/screen", auth, "").Code != 409 {
		t.Fatal("stale generation")
	}
	attachment.Generation = "generation-a"
	if request("GET", "/api/pidp11/screen", auth, "").Code != 409 {
		t.Fatal("old selection revived")
	}
	if err := adapter.Publish(selection, true); err != nil {
		t.Fatal(err)
	}
	adapter.mu.Lock()
	adapter.expires = time.Now().Add(-time.Second)
	adapter.mu.Unlock()
	if request("GET", "/api/pidp11/screen", auth, "").Code != 409 {
		t.Fatal("expired selection")
	}
	if err := adapter.Publish(selection, true); err != nil {
		t.Fatal(err)
	}
	adapter.Revoke()
	if request("GET", "/api/pidp11/screen", auth, "").Code != 409 {
		t.Fatal("revoked selection")
	}
}
