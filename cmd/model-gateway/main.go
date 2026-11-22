// Command model-gateway manually serves a narrow model API on loopback TLS.
// A separately administered SSH forward can reach it; it never starts a runner.
package main

import (
	"context"
	"flag"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"pidp11.local/webdesktop/internal/companion"
	"pidp11.local/webdesktop/internal/modelhost"
)

func main() {
	listen := flag.String("listen", "127.0.0.1:11436", "loopback TLS listen address")
	cert := flag.String("cert", "", "TLS certificate")
	key := flag.String("key", "", "TLS private key")
	tokenFile := flag.String("token-file", "", "private gateway token file")
	model := flag.String("model", "", "installed allowlisted Ollama model")
	runner := flag.String("runner", "http://127.0.0.1:11434/api/chat", "fixed loopback Ollama endpoint")
	flag.Parse()
	host, _, err := net.SplitHostPort(*listen)
	if err != nil || net.ParseIP(host) == nil || !net.ParseIP(host).IsLoopback() {
		log.Fatal("literal loopback listener required")
	}
	if *cert == "" || *key == "" || *model == "" {
		log.Fatal("certificate, key and model required")
	}
	info, err := os.Lstat(*tokenFile)
	if err != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 {
		log.Fatal("private regular token file required (0600)")
	}
	data, err := os.ReadFile(*tokenFile)
	if err != nil || len(data) > 129 {
		log.Fatal("invalid token file")
	}
	token := strings.TrimSpace(string(data))
	if len(token) < 32 || len(token) > 128 {
		log.Fatal("token must contain 32–128 characters")
	}
	// Provider validates endpoint scheme and redirect behavior. This gateway also
	// limits the runner to this host so it cannot become a general forward proxy.
	if !strings.HasPrefix(*runner, "http://127.0.0.1:") || !strings.HasSuffix(*runner, "/api/chat") {
		log.Fatal("fixed local runner endpoint required")
	}
	think := false
	p, err := companion.NewHTTP("ollama", *runner, *model, "", &think)
	if err != nil {
		log.Fatal(err)
	}
	server := &http.Server{Addr: *listen, Handler: modelhost.New(token, *model, p), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 25 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 4096}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	done := make(chan struct{})
	go func() {
		defer close(done)
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		server.Shutdown(shutdown)
	}()
	err = server.ListenAndServeTLS(*cert, *key)
	stop()
	<-done
	if err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
