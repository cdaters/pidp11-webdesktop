package web

import (
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func TestStyleNonceIsPerDocument(t *testing.T) {
	h := ServeAssets(fstest.MapFS{"index.html": {Data: []byte(`<meta content="__STYLE_NONCE__">`)}})
	var previous string
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", "http://127.0.0.1:8080/", nil))
		p := w.Header().Get("Content-Security-Policy")
		if p == previous || strings.Contains(p, "unsafe-inline") || strings.Contains(p, "unsafe-eval") || strings.Contains(w.Body.String(), "__STYLE_NONCE__") {
			t.Fatal("invalid policy")
		}
		nonce := strings.Split(strings.Split(p, "'nonce-")[1], "'")[0]
		if !strings.Contains(w.Body.String(), nonce) {
			t.Fatal("nonce mismatch")
		}
		previous = p
	}
}
