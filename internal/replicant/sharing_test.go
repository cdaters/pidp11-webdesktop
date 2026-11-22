package replicant

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSharingCredentialAndSimulatorFence(t *testing.T) {
	read, write := strings.Repeat("r", 32), strings.Repeat("w", 32)
	current := Attachment{Endpoint: "tty0", Generation: "attach-a", Simulator: "sim-a"}
	adapter, _ := NewAdapter(read, func() (Attachment, bool) { return current, true })
	handler, err := WithSharing(adapter, write)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = WithSharing(adapter, read); err == nil {
		t.Fatal("shared credentials")
	}
	body := `{"consent":true,"selection":{"endpoint":"tty0","generation":"attach-a","simulator_generation":"sim-a","text":"synthetic"}}`
	call := func(method, path, token, body string) int {
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w.Code
	}
	if call("POST", "/api/pidp11/selection", read, body) != 403 {
		t.Fatal("reader published")
	}
	if call("POST", "/api/pidp11/selection", write, body) != 204 {
		t.Fatal("publish failed")
	}
	if call("GET", "/api/pidp11/screen", read, "") != 200 {
		t.Fatal("read failed")
	}
	current.Simulator = "sim-b"
	if call("GET", "/api/pidp11/screen", read, "") != 409 {
		t.Fatal("simulator replacement bypass")
	}
	current.Simulator = "sim-a"
	if call("GET", "/api/pidp11/screen", read, "") != 409 {
		t.Fatal("revived selection")
	}
	if call("POST", "/api/pidp11/selection", write, strings.Replace(body, `true`, `false`, 1)) != 409 {
		t.Fatal("consent missing")
	}
	if call("POST", "/api/pidp11/selection", write, body) != 204 {
		t.Fatal("fresh approval")
	}
	if call("DELETE", "/api/pidp11/selection", write, "") != 204 || call("GET", "/api/pidp11/screen", read, "") != 409 {
		t.Fatal("revocation failed")
	}
}

func TestSharingMalformedRequestsCannotReplaceSelection(t *testing.T) {
	read, write := strings.Repeat("r", 32), strings.Repeat("w", 32)
	identity := Attachment{Endpoint: "tty0", Generation: "a", Simulator: "s"}
	adapter, err := NewAdapter(read, func() (Attachment, bool) { return identity, true })
	if err != nil {
		t.Fatal(err)
	}
	handler, err := WithSharing(adapter, write)
	if err != nil {
		t.Fatal(err)
	}
	for _, body := range []string{`{`, `{"extra":1}`, `{} {}`, strings.Repeat("x", 7000)} {
		request := httptest.NewRequest("POST", "/api/pidp11/selection", strings.NewReader(body))
		request.Header.Set("Authorization", "Bearer "+write)
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != 400 {
			t.Fatalf("malformed request returned %d", response.Code)
		}
		if adapter.selection.Text != "" {
			t.Fatal("malformed request published text")
		}
	}
	request := httptest.NewRequest("DELETE", "/api/pidp11/selection", nil)
	request.Header.Set("Authorization", "Bearer "+write)
	request.Header.Set("Origin", "https://browser.invalid")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != 403 {
		t.Fatal("browser writer access")
	}
}
