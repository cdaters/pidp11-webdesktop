package peripheral

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"pidp11.local/webdesktop/internal/access"
	"strings"
	"testing"
	"time"
)

func TestFollowHTTPAuthorityAndRetirement(t *testing.T) {
	f, path, approval := setupFollower(t)
	appendSpool(t, path, []byte("ACTUAL HTTP BYTES\r\n"))
	f.poll()
	generation := f.List()[0].Generation
	token := strings.Repeat("f", 32)
	gate := access.New([]access.Credential{{Token: token, Capabilities: []access.Capability{access.DeviceObserve}}})
	mux := http.NewServeMux()
	mux.HandleFunc("POST /login", gate.Login)
	f.Register(mux, gate)
	server := httptest.NewServer(mux)
	defer server.Close()
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar, Timeout: time.Second}
	call := func(method, path, body string) (int, []byte) {
		t.Helper()
		request, _ := http.NewRequest(method, server.URL+path, strings.NewReader(body))
		request.Header.Set("Origin", server.URL)
		response, err := client.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		data, err := io.ReadAll(response.Body)
		if err != nil {
			t.Fatal(err)
		}
		return response.StatusCode, data
	}
	for _, path := range []string{"/api/v1/device-streams", "/api/v1/device-media", "/api/v1/equipment-history", "/api/v1/equipment-history/missing"} {
		if code, _ := call("GET", path, ""); code != 403 {
			t.Fatal(path, code)
		}
	}
	if code, _ := call("POST", "/login", `{"token":"`+token+`"}`); code != 200 {
		t.Fatal(code)
	}
	route := "/api/v1/device-streams/lp/" + generation
	if code, data := call("GET", route+"?after=0", ""); code != 200 || !strings.Contains(string(data), generation) {
		t.Fatal(code, string(data))
	}
	for _, suffix := range []string{"", "?after=-1", "?after=9999999", "?after=broken"} {
		if code, _ := call("GET", route+suffix, ""); code == 200 {
			t.Fatal("invalid offset accepted", suffix)
		}
	}
	for _, path := range []string{"/streams/status", "/streams/follow", "/streams/recover"} {
		if code, _ := call("POST", path, "{}"); code != 404 {
			t.Fatal("private authority exposed", code)
		}
	}
	// Local control decoding rejects unknown/trailing/oversized bodies without
	// consuming authority; the exact revision succeeds once, then cannot replay.
	control := f.ControlHandler()
	for _, body := range []string{`{"unexpected":true}`, `{} {}`, strings.Repeat("x", 2049)} {
		response := httptest.NewRecorder()
		control.ServeHTTP(response, httptest.NewRequest("POST", "/streams/renew", strings.NewReader(body)))
		if response.Code != 400 {
			t.Fatal(response.Code)
		}
	}
	approval = nextApproval(f, approval)
	data, _ := json.Marshal(approval)
	for _, expected := range []int{200, 409} {
		response := httptest.NewRecorder()
		control.ServeHTTP(response, httptest.NewRequest("POST", "/streams/detach", strings.NewReader(string(data))))
		if response.Code != expected {
			t.Fatal(response.Code, response.Body.String())
		}
	}
	if code, data := call("GET", route+"?after=0", ""); code != 200 || !strings.Contains(string(data), `"state":"disconnected"`) {
		t.Fatal(code, string(data))
	}
	// A new observer service has no remembered authority or old spool replay.
	fresh, err := NewFollowers([]FollowConfig{{ID: "lp", Kind: "lp11", Path: path}})
	if err != nil {
		t.Fatal(err)
	}
	defer fresh.Close()
	if _, ok := fresh.Read("lp", generation, 0); ok {
		t.Fatal("replayed old observation")
	}
}
