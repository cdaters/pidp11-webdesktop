// Command replicant-adapter serves optional expiring, explicitly published text.
// It never discovers or reads a terminal. The owner maintains a private identity
// manifest; a missing/invalid manifest makes all selection access unavailable.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"pidp11.local/webdesktop/internal/replicant"
)

func private(path string, limit int64) []byte {
	info, err := os.Lstat(path)
	if err != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 || info.Size() > limit {
		return nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	return data
}
func main() {
	listen := flag.String("listen", "127.0.0.1:19002", "literal loopback HTTPS address")
	cert := flag.String("cert", "", "certificate")
	key := flag.String("key", "", "private key")
	read := flag.String("read-token-file", "", "private read credential")
	write := flag.String("share-token-file", "", "separate private sharing credential")
	identity := flag.String("identity-file", "", "private owner-maintained attachment manifest")
	flag.Parse()
	host, _, err := net.SplitHostPort(*listen)
	ip := net.ParseIP(host)
	if err != nil || ip == nil || !ip.IsLoopback() || *cert == "" || len(private(*key, 16384)) == 0 {
		log.Fatal("loopback TLS and private key required")
	}
	current := func() (replicant.Attachment, bool) {
		var manifest struct {
			replicant.Attachment
			Expires int64 `json:"expires_unix_ms"`
		}
		var a replicant.Attachment
		data := private(*identity, 1024)
		if json.Unmarshal(data, &manifest) != nil {
			return a, false
		}
		a = manifest.Attachment
		remaining := time.Until(time.UnixMilli(manifest.Expires))
		if remaining <= 0 || remaining > 30*time.Second || a.Endpoint == "" || a.Generation == "" || a.Simulator == "" || len(a.Endpoint) > 128 || len(a.Generation) > 128 || len(a.Simulator) > 128 {
			return a, false
		}
		return a, true
	}
	a, err := replicant.NewAdapter(strings.TrimSpace(string(private(*read, 129))), current)
	if err != nil {
		log.Fatal(err)
	}
	handler, err := replicant.WithSharing(a, strings.TrimSpace(string(private(*write, 129))))
	if err != nil {
		log.Fatal(err)
	}
	server := &http.Server{Addr: *listen, Handler: handler, ReadHeaderTimeout: 3 * time.Second, ReadTimeout: 5 * time.Second, WriteTimeout: 5 * time.Second, IdleTimeout: 15 * time.Second, MaxHeaderBytes: 4096}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		a.Revoke()
		shutdown, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		server.Shutdown(shutdown)
	}()
	if err = server.ListenAndServeTLS(*cert, *key); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
