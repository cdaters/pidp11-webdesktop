package localmodem

import (
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"pidp11.local/webdesktop/internal/access"
)

func TestObservationBoundsFreshnessAndNoAuthority(t *testing.T) {
	now := time.Now()
	original := Snapshot{Version: 1, Generation: "abcdef123456abcdef123456abcdef12-1", Profile: testConfig().Serial, Mode: "command", GuestConnected: true, SampleUnixMS: now.UnixMilli()}
	encode := func(s Snapshot) []byte { b, _ := json.Marshal(s); return b }
	if _, err := DecodeSnapshot(encode(original), now); err != nil {
		t.Fatal(err)
	}
	for _, change := range []func(*Snapshot){
		func(s *Snapshot) { s.SampleUnixMS -= 3001 }, func(s *Snapshot) { s.SampleUnixMS += 1001 }, func(s *Snapshot) { s.PeerWritten = 65537 }, func(s *Snapshot) { s.Generation = "arbitrary" }, func(s *Snapshot) { s.Profile.Line = 2 }, func(s *Snapshot) { s.Mode = "data" }, func(s *Snapshot) { s.Result = "BUSY" }, func(s *Snapshot) { s.Reason = "bad\ntext" },
	} {
		s := original
		change(&s)
		if _, err := DecodeSnapshot(encode(s), now); err == nil {
			t.Fatal("invalid observation accepted", s)
		}
	}
	mux := http.NewServeMux()
	reads := 0
	RegisterObservation(mux, access.New(nil), "private", func(string) ([]byte, error) { reads++; return encode(original), nil })
	response := httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequest("GET", "/api/v1/modem", nil))
	if response.Code == 200 || reads != 0 {
		t.Fatal("unauthorized read")
	}
	response = httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequest("POST", "/api/v1/modem", nil))
	if response.Code != http.StatusMethodNotAllowed || reads != 0 {
		t.Fatal("unexpected mutation endpoint")
	}
}

func TestAuthenticatedObservationUsesOnlyConfiguredFile(t *testing.T) {
	token := strings.Repeat("r", 32)
	gate := access.New([]access.Credential{{Token: token, Capabilities: []access.Capability{access.TerminalObserve}}})
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/login", gate.Login)
	sample := Snapshot{Version: 1, Generation: "abcdef123456abcdef123456abcdef12-1", Profile: testConfig().Serial, Mode: "command", GuestConnected: true, SampleUnixMS: time.Now().UnixMilli()}
	body, _ := json.Marshal(sample)
	RegisterObservation(mux, gate, "/private/status.json", func(path string) ([]byte, error) {
		if path != "/private/status.json" {
			t.Fatal(path)
		}
		return body, nil
	})
	server := httptest.NewServer(mux)
	defer server.Close()
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar}
	request, _ := http.NewRequest("POST", server.URL+"/api/v1/login", strings.NewReader(`{"token":"`+token+`"}`))
	request.Header.Set("Origin", server.URL)
	response, err := client.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != 200 {
		t.Fatal(response.StatusCode)
	}
	response, err = client.Get(server.URL + "/api/v1/modem?path=/etc/passwd")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != 200 || response.Header.Get("Cache-Control") != "no-store" {
		t.Fatal(response.StatusCode)
	}
	var actual Snapshot
	if json.NewDecoder(response.Body).Decode(&actual) != nil || actual.Generation != sample.Generation {
		t.Fatal(actual)
	}
}
