// local-modem is an opt-in, network-none laboratory process, separate from the
// desktop. It cannot start/stop SIMH and has no arbitrary dialing or shell API.
package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"pidp11.local/webdesktop/internal/localmodem"
	"pidp11.local/webdesktop/internal/memoryguard"
	"pidp11.local/webdesktop/internal/terminalbridge"
	"pidp11.local/webdesktop/internal/terminalservice"
)

func publish(directory string, snapshot localmodem.Snapshot) error {
	file, err := os.CreateTemp(directory, ".status-")
	if err != nil {
		return err
	}
	path := file.Name()
	defer os.Remove(path)
	if err := json.NewEncoder(file).Encode(snapshot); err != nil {
		file.Close()
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	return os.Rename(path, filepath.Join(directory, "status.json"))
}
func run() error {
	directory := flag.String("directory", "", "private laboratory configuration directory")
	capture := flag.Bool("trace", false, "bounded private test-byte capture; off by default")
	flag.Parse()
	interfaces, err := net.Interfaces()
	if err != nil || len(interfaces) != 1 || interfaces[0].Name != "lo" || os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		return errors.New("network-none laboratory required")
	}
	if err := memoryguard.Check(); err != nil {
		return fmt.Errorf("96 MiB zero-swap containment required: %w", err)
	}
	if !filepath.IsAbs(*directory) {
		return errors.New("explicit private directory required")
	}
	// The shared listener checks private directory ownership and refuses stale sockets.
	listener, err := terminalservice.ControlListener(filepath.Join(*directory, "control.sock"))
	if err != nil {
		return err
	}
	defer listener.Close()
	data, err := terminalservice.ReadPrivate(filepath.Join(*directory, "config.json"))
	if err != nil {
		return err
	}
	var config terminalbridge.Config
	decoder := json.NewDecoder(strings.NewReader(string(data)))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&config) != nil {
		return errors.New("invalid fixed serial configuration")
	}
	var extra any
	if decoder.Decode(&extra) != io.EOF {
		return errors.New("trailing configuration")
	}
	runner, err := localmodem.NewRunner(config)
	if err != nil {
		return err
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	if *capture {
		trace, err := os.OpenFile(filepath.Join(*directory, "trace.jsonl"), os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
		if err != nil {
			return err
		}
		defer trace.Close()
		total := 0
		runner.Trace = func(kind string, data []byte) {
			record, _ := json.Marshal(map[string]any{"kind": kind, "hex": hex.EncodeToString(data), "unix_ns": time.Now().UnixNano()})
			total += len(record) + 1
			if total > 2*1024*1024 {
				cancel()
				return
			}
			if _, err := trace.Write(append(record, '\n')); err != nil {
				cancel()
			}
		}
	}
	server := &http.Server{Handler: runner.Manager.ControlHandler(), ReadHeaderTimeout: time.Second, IdleTimeout: time.Second, MaxHeaderBytes: 4096}
	failure := make(chan error, 1)
	go func() { failure <- server.Serve(listener) }()
	done := make(chan struct{})
	go func() { defer close(done); runner.Run(ctx) }()
	defer func() { cancel(); server.Close(); <-done }()
	timer := time.NewTicker(100 * time.Millisecond)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			<-done
			return publish(*directory, runner.Observe())
		case err := <-failure:
			return err
		case <-timer.C:
			if err := publish(*directory, runner.Observe()); err != nil {
				return err
			}
		}
	}
}
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
