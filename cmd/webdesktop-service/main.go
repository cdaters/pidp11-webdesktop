// webdesktop-service serves the optional desktop detached from all guests.
// Local control commands can approve only configured raw guest lines.
package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"pidp11.local/webdesktop/internal/access"
	"pidp11.local/webdesktop/internal/companion"
	"pidp11.local/webdesktop/internal/memoryguard"
	"pidp11.local/webdesktop/internal/peripheral"
	"pidp11.local/webdesktop/internal/terminalbridge"
	"pidp11.local/webdesktop/internal/terminalservice"
	"pidp11.local/webdesktop/internal/web"
)

func serve(ctx context.Context, path string) error {
	config, gate, cert, err := terminalservice.Load(path)
	if err != nil {
		return err
	}
	manager, err := terminalservice.New(config.Endpoints)
	if err != nil {
		return err
	}
	defer manager.Close()
	devices, err := peripheral.New(config.Devices)
	if err != nil {
		return err
	}
	followers, err := peripheral.NewFollowers(config.Followers)
	if err != nil {
		return err
	}
	followers.Start(ctx)
	defer followers.Close()
	var chat *companion.Service
	if config.Companion != nil {
		chat, err = companion.NewService(*config.Companion, terminalservice.ReadPrivate)
		if err != nil {
			return err
		}
	}
	control, err := terminalservice.ControlListener(config.Control)
	if err != nil {
		return err
	}
	defer control.Close()
	listener, err := net.Listen("tcp", config.Listen)
	if err != nil {
		return err
	}
	defer listener.Close()
	admin := terminalservice.ControlServer(manager)
	defer admin.Close()
	controlMux := http.NewServeMux()
	controlMux.Handle("/devices/", devices.ControlHandler())
	controlMux.Handle("/streams/", followers.ControlHandler())
	controlMux.Handle("/", admin.Handler)
	admin.Handler = controlMux
	server := &http.Server{Handler: (&terminalbridge.Server{Bridge: manager, Auth: gate, AllowProposals: config.AllowProposals, Register: func(mux *http.ServeMux) {
		mux.Handle("GET /api/v1/features", gate.Require(access.TerminalObserve, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode(map[string]bool{"readonly_command_proposals": config.AllowProposals})
		})))
		devices.Register(mux, gate)
		followers.Register(mux, gate)
		chat.Register(mux, gate)
	}}).Handler(web.Assets()), TLSConfig: &tls.Config{MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{cert}}, ReadHeaderTimeout: time.Second, ReadTimeout: 3 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 8192}
	defer server.Close()
	lifetime, cancel := context.WithCancel(ctx)
	defer cancel()
	go manager.Run(lifetime)
	errorsOut := make(chan error, 2)
	go func() { errorsOut <- admin.Serve(terminalservice.LimitListener(control, 8)) }()
	go func() { errorsOut <- server.ServeTLS(terminalservice.LimitListener(listener, 64), "", "") }()
	log.Print("Optional desktop ready; all guest lines detached; local approval required")
	select {
	case <-ctx.Done():
		return nil
	case err := <-errorsOut:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}

func control(ctx context.Context, op, socket, instance, id string, revision uint64, confirmed bool) error {
	if op != "status" && op != "attach" && op != "detach" {
		return errors.New("choose serve, status, attach or detach")
	}
	transport := &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", socket)
	}}
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Timeout: 4 * time.Second}
	var body io.Reader
	method := "GET"
	if op != "status" {
		method = "POST"
		data, _ := json.Marshal(terminalservice.Approval{Instance: instance, ID: id, Revision: revision, Confirmed: confirmed})
		body = bytes.NewReader(data)
	}
	request, err := http.NewRequestWithContext(ctx, method, "http://local/"+op, body)
	if err != nil {
		return err
	}
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	data, err := io.ReadAll(io.LimitReader(response.Body, 8193))
	if err != nil {
		return err
	}
	if len(data) > 8192 {
		return errors.New("control response too large")
	}
	if response.StatusCode != 200 {
		return fmt.Errorf("local action rejected: %s", data)
	}
	_, err = os.Stdout.Write(data)
	return err
}
func run(ctx context.Context) error {
	if len(os.Args) < 2 {
		return errors.New("usage: webdesktop-service provision|check|serve|status|attach|detach [options]")
	}
	op := os.Args[1]
	if op == "provision" {
		return provision(os.Args[2:])
	}
	flags := flag.NewFlagSet(op, flag.ContinueOnError)
	requireMemory := flags.Bool("require-memory-limit", false, "refuse startup without kernel 96 MiB memory and zero-swap containment")
	config := flags.String("config", "/etc/pidp11-webdesktop/config.json", "private service configuration")
	socket := flags.String("socket", "/run/pidp11-webdesktop/control.sock", "local control socket")
	instance := flags.String("instance", "", "fresh service instance from status")
	id := flags.String("id", "", "approved terminal ID")
	revision := flags.Uint64("revision", 0, "current line revision from status")
	confirmed := flags.Bool("guest-and-line-verified", false, "operator independently verified current guest and reserved guest-only line")
	if err := flags.Parse(os.Args[2:]); err != nil {
		return err
	}
	if flags.NArg() != 0 {
		return errors.New("unexpected arguments")
	}
	if *requireMemory && op != "serve" {
		return errors.New("require-memory-limit is only valid for serve")
	}
	if op == "check" {
		return checkConfig(*config, os.Stdout)
	}
	if op == "serve" {
		if *requireMemory {
			if err := memoryguard.Check(); err != nil {
				return fmt.Errorf("optional desktop refused before opening listeners: memory containment unavailable: %w", err)
			}
		}
		return serve(ctx, *config)
	}
	return control(ctx, op, *socket, *instance, *id, *revision, *confirmed)
}
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx); err != nil {
		log.Fatal(err)
	}
}

// checkConfig validates credentials/certificate/configuration without creating a
// socket, binding a port or dialing a guest. Run under the service identity to
// check the same file access that startup will use.
func checkConfig(path string, output io.Writer) error {
	config, _, cert, err := terminalservice.Load(path)
	if err != nil {
		return fmt.Errorf("configuration check: %w", err)
	}
	_, err = fmt.Fprintf(output, "Configuration valid. Browser: %s\nCertificate expires: %s\nConfigured guest lines: %d; all start detached. No listener or guest connection opened.\n", config.Origin, cert.Leaf.NotAfter.UTC().Format(time.RFC3339), len(config.Endpoints))
	return err
}
