// storage-snapshot publishes independently captured facts through a local Unix
// socket. It verifies only an allowlisted image, never opens a simulator interface.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"pidp11.local/webdesktop/internal/storage"
	"pidp11.local/webdesktop/internal/terminalservice"
	"time"
)

type config struct {
	Socket    string           `json:"socket"`
	MediaPath string           `json:"media_path"`
	Snapshot  storage.Snapshot `json:"snapshot"`
}

func run() error {
	path := flag.String("config", "", "private approved snapshot and media path")
	verified := flag.Bool("independent-capture-verified", false, "original console capture, attached identity and quiescent media independently verified")
	flag.Parse()
	if !*verified {
		return errors.New("explicit independent capture verification required")
	}
	data, err := terminalservice.ReadPrivate(*path)
	if err != nil {
		return err
	}
	var c config
	var extra any
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&c) != nil || decoder.Decode(&extra) != io.EOF || c.Socket == "" {
		return errors.New("invalid private snapshot configuration")
	}
	if err := storage.VerifyMedia(c.MediaPath, c.Snapshot); err != nil {
		return err
	}
	transport := &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", c.Socket)
	}}
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Timeout: 3 * time.Second}
	call := func(method, path string, body []byte) ([]byte, error) {
		request, err := http.NewRequest(method, "http://local"+path, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		response, err := client.Do(request)
		if err != nil {
			return nil, err
		}
		defer response.Body.Close()
		data, err := io.ReadAll(io.LimitReader(response.Body, 4*storage.MaxRecord+1))
		if err != nil || len(data) > 4*storage.MaxRecord {
			return nil, errors.New("oversized snapshot response")
		}
		if response.StatusCode != 200 {
			return nil, fmt.Errorf("snapshot rejected (%d); inspect without replay", response.StatusCode)
		}
		return data, nil
	}
	statusData, err := call("GET", "/storage/status", nil)
	if err != nil {
		return err
	}
	var status storage.Status
	if json.Unmarshal(statusData, &status) != nil {
		return errors.New("invalid local status")
	}
	approval := storage.Approval{Instance: status.Instance, Revision: status.Revision, Verified: true, Snapshot: c.Snapshot}
	body, err := json.Marshal(approval)
	if err != nil {
		return err
	}
	if _, err = call("POST", "/storage/publish", body); err != nil {
		return err
	}
	fmt.Println("Verified captured metadata published; no live activity or guest authority established.")
	return nil
}
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
