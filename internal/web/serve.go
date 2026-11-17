package web

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"io/fs"
	"net/http"
)

// ServeAssets grants only the pinned terminal's generated styles a per-document
// nonce. Scripts remain same-origin, without eval or inline-script permission.
func ServeAssets(assets fs.FS) http.Handler {
	files := http.FileServer(http.FS(assets))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" && r.URL.Path != "/index.html" {
			files.ServeHTTP(w, r)
			return
		}
		b, e := fs.ReadFile(assets, "index.html")
		if e != nil {
			http.NotFound(w, r)
			return
		}
		var random [24]byte
		if _, e = rand.Read(random[:]); e != nil {
			http.Error(w, "entropy unavailable", 503)
			return
		}
		nonce := base64.StdEncoding.EncodeToString(random[:])
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'self' 'sha256-bW1Ujdf9K6BIHmNaTmlDwwEQxTma5apzZ90Y45GaMmU=' 'nonce-"+nonce+"'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		if r.Method != "HEAD" {
			w.Write(bytes.ReplaceAll(b, []byte("__STYLE_NONCE__"), []byte(nonce)))
		}
	})
}
