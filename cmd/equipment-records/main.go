// equipment-records saves or explicitly recovers bounded retained data. It never
// probes or controls a simulator. The private config allowlists one archive root.
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
	"time"

	"pidp11.local/webdesktop/internal/peripheral"
	"pidp11.local/webdesktop/internal/terminalservice"
)

type config struct {
	Socket    string `json:"socket"`
	Directory string `json:"archive_directory"`
}

func run() error {
	path := flag.String("config", "", "private operator configuration with socket and archive_directory")
	action := flag.String("action", "list", "list, save or recover (retained data only)")
	id := flag.String("id", "", "exact retained artifact ID")
	confirm := flag.Bool("confirm-retained-data", false, "explicitly recover data without any session authority")
	flag.Parse()
	data, err := terminalservice.ReadPrivate(*path)
	if err != nil {
		return err
	}
	var c config
	var extra any
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&c) != nil || decoder.Decode(&extra) != io.EOF || c.Socket == "" || c.Directory == "" {
		return errors.New("invalid private records configuration")
	}
	transport := &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", c.Socket)
	}}
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Timeout: 3 * time.Second}
	call := func(method, path string, body any) ([]byte, error) {
		var encoded []byte
		if body != nil {
			var err error
			encoded, err = json.Marshal(body)
			if err != nil {
				return nil, err
			}
		}
		request, err := http.NewRequest(method, "http://local"+path, bytes.NewReader(encoded))
		if err != nil {
			return nil, err
		}
		response, err := client.Do(request)
		if err != nil {
			return nil, err
		}
		defer response.Body.Close()
		data, err := io.ReadAll(io.LimitReader(response.Body, peripheral.MaxRecordFile+1))
		if err != nil || len(data) > peripheral.MaxRecordFile {
			return nil, errors.New("bounded response required")
		}
		if response.StatusCode != 200 {
			return nil, fmt.Errorf("operation rejected (%d); inspect without replay", response.StatusCode)
		}
		return data, nil
	}
	switch *action {
	case "list":
		data, err := call("GET", "/streams/history", nil)
		if err != nil {
			return err
		}
		fmt.Println(string(data))
	case "save":
		if len(*id) != 64 {
			return errors.New("exact artifact ID required")
		}
		data, err := call("GET", "/streams/history/"+*id, nil)
		if err != nil {
			return err
		}
		var r peripheral.Record
		if json.Unmarshal(data, &r) != nil || r.ID != *id {
			return errors.New("record identity mismatch")
		}
		if err := peripheral.SaveRecord(c.Directory, r); err != nil {
			return err
		}
		if _, err := peripheral.LoadRecord(c.Directory, *id); err != nil {
			return err
		}
		fmt.Println("Retained record saved and independently reread; no authority saved.")
	case "recover":
		if !*confirm {
			return errors.New("explicit -confirm-retained-data required; recovery never restores authority")
		}
		r, err := peripheral.LoadRecord(c.Directory, *id)
		if err != nil {
			return err
		}
		if _, err := call("POST", "/streams/recover", r); err != nil {
			return err
		}
		fmt.Println("Retained data recovered; live equipment remains detached until independently approved.")
	default:
		return errors.New("unsupported records action")
	}
	return nil
}
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
