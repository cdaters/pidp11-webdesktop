package replicant

import (
	"context"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// This opt-in test exercises the independent JS client through actual trusted
// TLS and the Go handler. Fault controls exist only in this test server, never
// in the application. It is conformance evidence, not an independent audit.
// Run with -count=1: Go's result cache does not track Node's transitive imports.
func TestIndependentClientRealTLS(t *testing.T) {
	if os.Getenv("PIDP11_CONTRACT_TLS_TEST") != "1" {
		t.Skip("opt-in Node/TLS conformance")
	}
	if _, err := exec.LookPath("node"); err != nil {
		t.Fatal(err)
	}
	read, write := strings.Repeat("r", 32), strings.Repeat("w", 32)
	identity := Attachment{Endpoint: "line", Generation: "attachment", Simulator: "sim", ViewerRevision: 1}
	var mu sync.Mutex
	attached := true
	current := func() (Attachment, bool) { mu.Lock(); defer mu.Unlock(); return identity, attached }
	adapter, err := NewAdapter(read, current)
	if err != nil {
		t.Fatal(err)
	}
	handler, err := WithSharing(adapter, write)
	if err != nil {
		t.Fatal(err)
	}
	var handlerMu sync.RWMutex
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/test/") {
			// The whole server is a local fixture. Production has no such routes.
			handlerMu.Lock()
			defer handlerMu.Unlock()
			switch r.URL.Path {
			case "/test/disconnect":
				mu.Lock()
				attached = false
				mu.Unlock()
				adapter.Revoke()
			case "/test/reconnect":
				mu.Lock()
				attached = true
				identity.ViewerRevision++
				mu.Unlock()
			case "/test/restart":
				adapter, err = NewAdapter(read, current)
				if err != nil {
					panic(err)
				}
				handler, err = WithSharing(adapter, write)
				if err != nil {
					panic(err)
				}
			case "/test/expire":
				adapter.mu.Lock()
				adapter.expires = time.Now().Add(-time.Second)
				adapter.mu.Unlock()
			default:
				http.NotFound(w, r)
				return
			}
			w.WriteHeader(204)
			return
		}
		handlerMu.RLock()
		defer handlerMu.RUnlock()
		handler.ServeHTTP(w, r)
	}))
	defer server.Close()
	cert := filepath.Join(t.TempDir(), "ca.pem")
	if err = os.WriteFile(cert, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: server.Certificate().Raw}), 0600); err != nil {
		t.Fatal(err)
	}
	config, _ := json.Marshal(map[string]string{"origin": server.URL, "readToken": read, "publicationToken": write})
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	command := exec.CommandContext(ctx, "node", "../../integrations/selection-contract/tls-probe.mjs")
	command.Env = append(os.Environ(), "NODE_EXTRA_CA_CERTS="+cert)
	command.Stdin = strings.NewReader(string(config))
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("independent TLS client: %v\n%s", err, output)
	}
	t.Log(string(output))
}
