package storage

import (
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"pidp11.local/webdesktop/internal/access"
)

func TestPublicStorageIsAuthenticatedReadOnlyAndGenerationBounded(t *testing.T) {
	s, v := fixture(t)
	if err := publish(s, v); err != nil {
		t.Fatal(err)
	}
	token := strings.Repeat("f", 32)
	gate := access.New([]access.Credential{{Token: token, Capabilities: []access.Capability{access.DeviceObserve}}})
	mux := http.NewServeMux()
	mux.HandleFunc("POST /login", gate.Login)
	s.Register(mux, gate)
	server := httptest.NewServer(mux)
	defer server.Close()
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar, Timeout: time.Second}
	call := func(method, path, body string) int {
		t.Helper()
		r, _ := http.NewRequest(method, server.URL+path, strings.NewReader(body))
		r.Header.Set("Origin", server.URL)
		response, err := client.Do(r)
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		data, _ := io.ReadAll(io.LimitReader(response.Body, MaxDevices*MaxRecord+1))
		if len(data) > MaxDevices*MaxRecord {
			t.Fatal("unbounded response")
		}
		return response.StatusCode
	}
	for _, path := range []string{"/api/v1/storage", "/api/v1/storage/disk/missing"} {
		if call("GET", path, "") != 403 {
			t.Fatal("unauthenticated storage")
		}
	}
	if call("POST", "/login", `{"token":"`+token+`"}`) != 200 {
		t.Fatal("login")
	}
	if call("GET", "/api/v1/storage", "") != 200 {
		t.Fatal("read access")
	}
	// A blocked browser writer must not retain the store lock or prevent revocation.
	slow := &blockedWriter{header: http.Header{}, entered: make(chan struct{}), release: make(chan struct{})}
	request, _ := http.NewRequest("GET", server.URL+"/api/v1/storage", nil)
	for _, cookie := range jar.Cookies(request.URL) {
		request.AddCookie(cookie)
	}
	finished := make(chan struct{})
	go func() { mux.ServeHTTP(slow, request); close(finished) }()
	select {
	case <-slow.entered:
	case <-time.After(time.Second):
		t.Fatal("reader did not reach response")
	}
	status := s.Status()
	generation := s.List()[0].Generation
	revoked := make(chan error, 1)
	go func() {
		revoked <- s.Revoke(Approval{Instance: status.Instance, Revision: status.Revision, Verified: true, ID: v.ID, Generation: generation})
	}()
	select {
	case err := <-revoked:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("slow reader blocked revocation")
	}
	close(slow.release)
	<-finished
	row := s.List()[0]
	if call("GET", "/api/v1/storage/disk/"+row.Generation, "") != 200 {
		t.Fatal("exact capture unavailable")
	}
	if call("GET", "/api/v1/storage/disk/wrong", "") != 404 {
		t.Fatal("stale generation accepted")
	}
	for _, path := range []string{"/storage/publish", "/storage/revoke", "/api/v1/storage"} {
		if code := call("POST", path, "{}"); code != 404 && code != 405 {
			t.Fatal("mutation exposed", path, code)
		}
	}
}

// blockedWriter models backpressure after authorization without buffering data.
type blockedWriter struct {
	header  http.Header
	entered chan struct{}
	release chan struct{}
}

func (w *blockedWriter) Header() http.Header { return w.header }
func (w *blockedWriter) WriteHeader(int)     {}
func (w *blockedWriter) Write(data []byte) (int, error) {
	close(w.entered)
	<-w.release
	return len(data), nil
}
