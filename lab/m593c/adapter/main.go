// Command adapter serves a labeled synthetic selection in the disposable lab.
// It reads no terminal and contains no guest/console/process control API.
package main

import (
	"log"
	"net/http"
	"os"
	"pidp11.local/webdesktop/internal/replicant"
	"strings"
	"time"
)

func main() {
	token, err := os.ReadFile("/root/m593c/token")
	if err != nil {
		log.Fatal(err)
	}
	a, err := replicant.NewAdapter(strings.TrimSpace(string(token)), func() (replicant.Attachment, bool) {
		return replicant.Attachment{Simulator: "fixture-simulator-1", Endpoint: "synthetic-guest-line", Generation: "fixture-generation-1"}, true
	})
	if err != nil {
		log.Fatal(err)
	}
	if err = a.Publish(replicant.Selection{Simulator: "fixture-simulator-1", Endpoint: "synthetic-guest-line", Generation: "fixture-generation-1", Text: "SYNTHETIC SELECTION; NO GUEST ATTACHED\n$ pwd\n/usr/dmr"}, true); err != nil {
		log.Fatal(err)
	}
	server := http.Server{Addr: "127.0.0.1:19002", Handler: a, ReadHeaderTimeout: 3 * time.Second, ReadTimeout: 5 * time.Second, WriteTimeout: 5 * time.Second, IdleTimeout: 10 * time.Second, MaxHeaderBytes: 4096}
	log.Fatal(server.ListenAndServe())
}
