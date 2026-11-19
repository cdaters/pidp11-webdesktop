package access

import (
	"crypto/tls"
	"net/http/httptest"
	"testing"
)

func BenchmarkTrustedRequest(b *testing.B) {
	g, _ := NewSecure("https://desktop.example:8445", nil)
	r := httptest.NewRequest("GET", "https://desktop.example:8445/api/v1/session", nil)
	r.TLS = &tls.ConnectionState{}
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		if !g.TrustedRequest(r) {
			b.Fatal("trust")
		}
	}
}
