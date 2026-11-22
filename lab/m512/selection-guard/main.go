// Command selection-guard is a disposable Linux laboratory observer. It binds
// one approved excerpt source to an original SIMH process and one browser-view
// lifetime. It neither starts nor signals that process and reads no guest bytes.
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"pidp11.local/webdesktop/internal/replicant"
	"pidp11.local/webdesktop/internal/terminalservice"
)

type binding struct {
	Observation    terminalservice.Supervision `json:"observation"`
	PID            int                         `json:"pid"`
	Process        string                      `json:"process"`
	Instance       string                      `json:"instance"`
	Endpoint       string                      `json:"endpoint"`
	Revision       uint64                      `json:"revision"`
	ViewerRevision uint64                      `json:"viewer_revision"`
}

// processIdentity rejects exited/zombie processes and PID reuse. Namespace and
// kernel-boot identities prevent a new disposable environment reusing a binding.
func processIdentity(pid int) (string, error) {
	if pid <= 1 {
		return "", fmt.Errorf("owned simulator PID required")
	}
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/stat", pid))
	if err != nil {
		return "", err
	}
	end := strings.LastIndex(string(data), ")")
	if end < 0 {
		return "", fmt.Errorf("invalid process stat")
	}
	fields := strings.Fields(string(data)[end+1:])
	if len(fields) < 20 || fields[0] == "Z" || fields[0] == "X" {
		return "", fmt.Errorf("simulator not live")
	}
	boot, err := os.ReadFile("/proc/sys/kernel/random/boot_id")
	if err != nil {
		return "", err
	}
	namespace, err := os.Readlink(fmt.Sprintf("/proc/%d/ns/pid", pid))
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256([]byte(string(boot) + namespace + strconv.Itoa(pid) + ":" + fields[19]))
	return hex.EncodeToString(digest[:]), nil
}
func private(path string, limit int64) []byte {
	f, err := os.OpenFile(path, os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		log.Fatal("private input unavailable")
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 || info.Size() > limit {
		log.Fatal("bounded private regular input required")
	}
	data, err := io.ReadAll(io.LimitReader(f, limit+1))
	if err != nil || int64(len(data)) > limit {
		log.Fatal("private input size")
	}
	return data
}
func main() {
	socket := flag.String("socket", "", "owned service private control socket")
	bindingFile := flag.String("binding", "", "private explicit process/attachment/view binding")
	pid := flag.Int("fingerprint-pid", 0, "print owned process identity then exit")
	read := flag.String("read-token-file", "", "private adapter read credential")
	share := flag.String("share-token-file", "", "private adapter publication credential")
	cert := flag.String("cert", "", "lab TLS certificate")
	key := flag.String("key", "", "private TLS key")
	flag.Parse()
	if os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		log.Fatal("explicit isolated lab required")
	}
	if *pid != 0 {
		value, err := processIdentity(*pid)
		if err != nil {
			log.Fatal(err)
		}
		fmt.Println(value)
		return
	}
	var expected binding
	if json.Unmarshal(private(*bindingFile, 2048), &expected) != nil || expected.ViewerRevision == 0 || expected.Observation.Process == "" || expected.Observation.OperatorEpoch == "" {
		log.Fatal("verified single-view binding required")
	}
	transport := &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", *socket)
	}}
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Timeout: 500 * time.Millisecond}
	current := func() (replicant.Attachment, bool) {
		var empty replicant.Attachment
		fingerprint, err := processIdentity(expected.PID)
		if err != nil || fingerprint != expected.Process {
			return empty, false
		}
		response, err := client.Get("http://local/status")
		if err != nil {
			return empty, false
		}
		defer response.Body.Close()
		var status terminalservice.Status
		if response.StatusCode != 200 || json.NewDecoder(io.LimitReader(response.Body, 8192)).Decode(&status) != nil || status.Instance != expected.Instance {
			return empty, false
		}
		for _, line := range status.Lines {
			if line.ID == expected.Endpoint && line.State == "attached" && line.Supervision != nil && *line.Supervision == expected.Observation && line.Revision == expected.Revision && line.Viewers == 1 && line.ViewerRevision == expected.ViewerRevision {
				return replicant.Attachment{Endpoint: line.ID, Generation: fmt.Sprintf("%s-%d", status.Instance, line.Revision), Simulator: fingerprint, ViewerRevision: line.ViewerRevision}, true
			}
		}
		return empty, false
	}
	adapter, err := replicant.NewAdapter(strings.TrimSpace(string(private(*read, 129))), current)
	if err != nil {
		log.Fatal(err)
	}
	handler, err := replicant.WithSharing(adapter, strings.TrimSpace(string(private(*share, 129))))
	if err != nil {
		log.Fatal(err)
	}
	server := &http.Server{Addr: "127.0.0.1:19002", Handler: handler, ReadHeaderTimeout: time.Second, ReadTimeout: 3 * time.Second, WriteTimeout: 3 * time.Second, IdleTimeout: 5 * time.Second, MaxHeaderBytes: 4096}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		adapter.Revoke()
		shutdown, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		server.Shutdown(shutdown)
	}()
	if err = server.ListenAndServeTLS(*cert, *key); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
