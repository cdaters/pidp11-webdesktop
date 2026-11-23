// Package equipmentsession renews narrowly scoped observation approvals for an
// independently operated simulator. It never opens media, signals a simulator,
// starts guests or sends monitor instructions. Operator evidence remains required.
package equipmentsession

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	"pidp11.local/webdesktop/internal/peripheral"
)

// Config is private local configuration. Jobs names configured follower/export
// slots, never filesystem paths supplied by a browser. At most four are allowed.
type Config struct {
	Socket           string   `json:"socket"`
	PID              int      `json:"pid"`
	Start            string   `json:"start"`
	ExecutableSHA256 string   `json:"executable_sha256"`
	Simulator        string   `json:"simulator"`
	Guest            string   `json:"guest"`
	Attested         bool     `json:"guest_and_devices_verified"`
	Jobs             []string `json:"jobs"`
}

// Command is one ordered local operator request. Evidence refers to independent
// guest/device inspection; a prompt alone cannot certify drain or flush.
type Command struct {
	Sequence      uint64 `json:"sequence"`
	ID            string `json:"id"`
	Operation     string `json:"operation"`
	Job           string `json:"job,omitempty"`
	Evidence      string `json:"evidence,omitempty"`
	SHA256        string `json:"sha256,omitempty"`
	ReaderSHA256  string `json:"reader_sha256,omitempty"`
	ReaderBytes   int    `json:"reader_bytes,omitempty"`
	ReaderEOF     bool   `json:"reader_eof,omitempty"`
	ProducedBytes int64  `json:"produced_bytes,omitempty"`
}

type owned struct {
	generation, job string
	active          bool
}

// Supervisor is confined to Run's event loop. It owns the HTTP transport and
// input reader. Failed/uncertain requests are never retried; approvals expire
// within five seconds of the last accepted renewal. SIMH is never terminated.
type Supervisor struct {
	config    Config
	client    *http.Client
	transport *http.Transport
	owner     string
	slots     map[string]owned
	instance  string
	probe     func() error
}

// New creates an independent owner without contacting the producer or observer.
// The caller supplies a read-only identity probe; Run owns all subsequent calls.
func New(c Config, probe func() error) (*Supervisor, error) {
	if !c.Attested || c.Socket == "" || c.Simulator == "" || c.Guest == "" || len(c.Jobs) == 0 || len(c.Jobs) > 4 || probe == nil {
		return nil, errors.New("explicit bounded operator configuration required")
	}
	var nonce [16]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return nil, err
	}
	transport := &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", c.Socket)
	}}
	s := &Supervisor{config: c, transport: transport, client: &http.Client{Transport: transport, Timeout: 2 * time.Second}, owner: hex.EncodeToString(nonce[:]), slots: map[string]owned{}, probe: probe}
	for _, id := range c.Jobs {
		if id == "" {
			return nil, errors.New("empty job slot")
		}
		if _, ok := s.slots[id]; ok {
			return nil, errors.New("duplicate job slot")
		}
		s.slots[id] = owned{}
	}
	return s, nil
}
func (s *Supervisor) call(ctx context.Context, method, path string, body, out any) error {
	var data []byte
	if body != nil {
		var err error
		data, err = json.Marshal(body)
		if err != nil {
			return err
		}
	}
	request, err := http.NewRequestWithContext(ctx, method, "http://local"+path, bytes.NewReader(data))
	if err != nil {
		return err
	}
	response, err := s.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	data, err = io.ReadAll(io.LimitReader(response.Body, 16385))
	if err != nil {
		return err
	}
	if len(data) > 16384 {
		return errors.New("oversized local control response")
	}
	if response.StatusCode != 200 {
		return fmt.Errorf("local operation rejected (HTTP %d); inspect without replay", response.StatusCode)
	}
	if out != nil {
		return json.Unmarshal(data, out)
	}
	return nil
}
func (s *Supervisor) apply(ctx context.Context, c Command) error {
	slot, ok := s.slots[c.ID]
	if !ok {
		return errors.New("unapproved equipment slot")
	}
	var status peripheral.Status
	if err := s.call(ctx, "GET", "/streams/status", nil, &status); err != nil {
		return err
	}
	if s.instance == "" {
		s.instance = status.Instance
	} else if s.instance != status.Instance {
		return errors.New("observer restarted; explicit new supervision required")
	}
	var revision uint64
	found := false
	for _, row := range status.Devices {
		if row.ID == c.ID {
			revision = row.Revision
			found = true
		}
	}
	if !found {
		return errors.New("configured equipment unavailable")
	}
	op := c.Operation
	if op == "begin" {
		if slot.active {
			return errors.New("job already active")
		}
		// An explicit begin may replace an expired/completed slot, but never an active
		// owner. Fetching status does not grant authority over a different generation.
		var views []peripheral.FollowView
		if err := s.call(ctx, "GET", "/streams/views", nil, &views); err != nil {
			return err
		}
		for _, v := range views {
			if v.ID == c.ID {
				if v.State == "observing" {
					return errors.New("existing owner must retire before replacement")
				}
				slot.generation = v.Generation
			}
		}
		slot.job = c.Job
		op = "follow"
	} else if !slot.active {
		return errors.New("no active owned session")
	}
	switch op {
	case "follow", "renew", "progress", "guest-returned", "drained", "closed", "complete", "detach":
	default:
		return errors.New("unsupported equipment operation")
	}
	a := peripheral.FollowApproval{Instance: s.instance, ID: c.ID, Revision: revision, Simulator: s.config.Simulator, Guest: s.config.Guest, Verified: true, Generation: slot.generation, Owner: s.owner, Job: slot.job, Evidence: c.Evidence, ProducedBytes: c.ProducedBytes, SHA256: c.SHA256, ReaderSHA256: c.ReaderSHA256, ReaderBytes: c.ReaderBytes, ReaderEOF: c.ReaderEOF}
	if err := s.call(ctx, "POST", "/streams/"+op, a, nil); err != nil {
		return err
	}
	if op == "follow" {
		var views []peripheral.FollowView
		if err := s.call(ctx, "GET", "/streams/views", nil, &views); err != nil {
			return err
		}
		found = false
		for _, v := range views {
			if v.ID == c.ID && v.Owner == s.owner && v.Job == slot.job && v.Phase == "observing" {
				slot.generation = v.Generation
				found = true
			}
		}
		if !found {
			return errors.New("new session identity not confirmed")
		}
		slot.active = true
	}
	if op == "complete" {
		// Preserve an immutable, bounded export independently of the live observer.
		// Failure here is reported; never manufacture an export after uncertain close.
		var exports peripheral.Status
		if err := s.call(ctx, "GET", "/devices/status", nil, &exports); err != nil {
			return err
		}
		found = false
		for _, row := range exports.Devices {
			if row.ID == c.ID {
				found = true
				approval := peripheral.Approval{Instance: exports.Instance, ID: c.ID, Revision: row.Revision, Simulator: s.config.Simulator, Guest: s.config.Guest, SHA256: c.SHA256, Completed: true}
				if err := s.call(ctx, "POST", "/devices/publish", approval, nil); err != nil {
					return err
				}
			}
		}
		if !found {
			return errors.New("completed export slot unavailable")
		}
		slot.active = false
	}
	if op == "detach" {
		slot.active = false
	}
	s.slots[c.ID] = slot
	return nil
}

// Run consumes bounded JSON lines from a private operator pipe, never a browser.
// Sequence numbers are strict and reset only with a new supervisor process/owner.
// The caller owns output (normally a private local pipe). EOF, signals, producer
// change and any rejected operation stop renewal without controlling the guest.
func (s *Supervisor) Run(ctx context.Context, input io.ReadCloser, output io.Writer) error {
	defer s.transport.CloseIdleConnections()
	defer input.Close()
	if err := s.probe(); err != nil {
		return err
	}
	type line struct {
		data []byte
		err  error
	}
	lines := make(chan line, 1)
	done := make(chan struct{})
	defer close(done)
	go func() {
		scanner := bufio.NewScanner(input)
		scanner.Buffer(make([]byte, 2048), 2048)
		for scanner.Scan() {
			data := append([]byte{}, scanner.Bytes()...)
			select {
			case lines <- line{data: data}:
			case <-done:
				return
			}
		}
		select {
		case lines <- line{err: scanner.Err()}:
		case <-done:
		}
	}()
	tick := time.NewTicker(time.Second)
	defer tick.Stop()
	expected := uint64(1)
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-tick.C:
			if err := s.probe(); err != nil {
				return err
			}
			for id, slot := range s.slots {
				if slot.active {
					if err := s.apply(ctx, Command{ID: id, Operation: "renew"}); err != nil {
						return err
					}
				}
			}
		case entry := <-lines:
			if entry.data == nil {
				return entry.err
			}
			var c Command
			decoder := json.NewDecoder(bytes.NewReader(entry.data))
			decoder.DisallowUnknownFields()
			var extra any
			if decoder.Decode(&c) != nil || decoder.Decode(&extra) != io.EOF || c.Sequence != expected {
				return errors.New("invalid or repeated operator request; do not replay")
			}
			expected++
			if err := s.probe(); err != nil {
				return err
			}
			if err := s.apply(ctx, c); err != nil {
				return err
			}
			slot := s.slots[c.ID]
			if err := json.NewEncoder(output).Encode(map[string]any{"sequence": c.Sequence, "id": c.ID, "generation": slot.generation, "operation": c.Operation, "accepted": true}); err != nil {
				return err
			}
		}
	}
}
