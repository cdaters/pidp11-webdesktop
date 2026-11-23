package equipmentsession

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"pidp11.local/webdesktop/internal/peripheral"
)

func TestSupervisorOrderedStagesExportsAndProducerFailure(t *testing.T) {
	dir, err := os.MkdirTemp("/tmp", "equipment-")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(dir)
	spool := filepath.Join(dir, "spool")
	if err := os.WriteFile(spool, nil, 0600); err != nil {
		t.Fatal(err)
	}
	followers, err := peripheral.NewFollowers([]peripheral.FollowConfig{{ID: "lp", Kind: "lp11", Path: spool, Session: &peripheral.SessionConfig{Device: "LP0", Label: "Test guest printer"}}})
	if err != nil {
		t.Fatal(err)
	}
	defer followers.Close()
	exports, err := peripheral.New([]peripheral.Config{{ID: "lp", Kind: "lp11", Path: spool}})
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	mux.Handle("/streams/", followers.ControlHandler())
	mux.Handle("/devices/", exports.ControlHandler())
	listener, err := net.Listen("unix", filepath.Join(dir, "control"))
	if err != nil {
		t.Fatal(err)
	}
	server := &http.Server{Handler: mux}
	defer server.Close()
	go server.Serve(listener)
	var producerLost atomic.Bool
	probe := func() error {
		if producerLost.Load() {
			return errors.New("producer disappeared")
		}
		return nil
	}
	supervisor, err := New(Config{Socket: listener.Addr().String(), Simulator: "sim", Guest: "guest", Attested: true, Jobs: []string{"lp"}}, probe)
	if err != nil {
		t.Fatal(err)
	}
	input, write := io.Pipe()
	read, output := io.Pipe()
	defer read.Close()
	defer write.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	followers.Start(ctx)
	done := make(chan error, 1)
	go func() { done <- supervisor.Run(ctx, input, output); output.Close() }()
	sequence := uint64(0)
	send := func(c Command) {
		t.Helper()
		sequence++
		c.Sequence = sequence
		c.ID = "lp"
		if err := json.NewEncoder(write).Encode(c); err != nil {
			t.Fatal(err)
		}
		var response map[string]any
		if err := json.NewDecoder(read).Decode(&response); err != nil {
			t.Fatal(err)
		}
		if response["accepted"] != true {
			t.Fatal(response)
		}
	}
	send(Command{Operation: "begin", Job: "one"})
	data := []byte("FIRST\n")
	if err := os.WriteFile(spool, data, 0600); err != nil {
		t.Fatal(err)
	}
	for _, op := range []string{"guest-returned", "drained", "closed"} {
		send(Command{Operation: op, Evidence: "independent test inspection", ProducedBytes: int64(len(data))})
	}
	sum := sha256.Sum256(data)
	send(Command{Operation: "complete", SHA256: hex.EncodeToString(sum[:])})
	snapshots := exports.List()
	if len(snapshots) != 1 || snapshots[0].State != "completed" {
		t.Fatal(snapshots)
	}
	if err := os.WriteFile(spool, nil, 0600); err != nil {
		t.Fatal(err)
	}
	send(Command{Operation: "begin", Job: "two"})
	second := followers.List()[0].Generation
	producerLost.Store(true)
	select {
	case err := <-done:
		if err == nil {
			t.Fatal("lost producer accepted")
		}
	case <-time.After(3 * time.Second):
		t.Fatal("supervisor did not stop")
	}
	// The consumer owns expiry independently; stopping this process does not
	// cancel the unrelated producer or extend authority through browser traffic.
	time.Sleep(peripheral.ProducerLease + 250*time.Millisecond)
	view, ok := followers.Read("lp", second, 0)
	if !ok || view.State != "disconnected" {
		t.Fatal(view)
	}
	if err := os.WriteFile(spool, []byte("independent writer"), 0600); err != nil {
		t.Fatal(err)
	}
	saved, ok := exports.Get("lp", snapshots[0].Generation)
	if !ok || string(saved.Data) != string(data) {
		t.Fatal("completed artifact lost on supervisor failure")
	}
}

func TestSupervisorRefusesMalformedRepeatedAndUnapprovedInput(t *testing.T) {
	for _, data := range []string{`{"sequence":2,"id":"lp","operation":"begin"}`, `{"sequence":1,"id":"lp","operation":"begin","path":"/tmp/arbitrary"}`, `{"sequence":1,"id":"unknown","operation":"begin"}`} {
		s, err := New(Config{Socket: "/unavailable", Simulator: "sim", Guest: "guest", Attested: true, Jobs: []string{"lp"}}, func() error { return nil })
		if err != nil {
			t.Fatal(err)
		}
		input, write := io.Pipe()
		go func() { defer write.Close(); io.WriteString(write, data+"\n") }()
		if s.Run(context.Background(), input, io.Discard) == nil {
			t.Fatal("unsafe input accepted")
		}
	}
}

func TestObserverRestartCannotAcquireReplacementGeneration(t *testing.T) {
	dir, err := os.MkdirTemp("/tmp", "equipment-restart-")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(dir)
	listener, err := net.Listen("unix", filepath.Join(dir, "control"))
	if err != nil {
		t.Fatal(err)
	}
	var mutations atomic.Int32
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			mutations.Add(1)
		}
		json.NewEncoder(w).Encode(peripheral.Status{Instance: "replacement"})
	})}
	defer server.Close()
	go server.Serve(listener)
	s, err := New(Config{Socket: listener.Addr().String(), Simulator: "sim", Guest: "guest", Attested: true, Jobs: []string{"lp"}}, func() error { return nil })
	if err != nil {
		t.Fatal(err)
	}
	defer s.transport.CloseIdleConnections()
	s.instance = "original"
	s.slots["lp"] = owned{generation: "old-generation", job: "one", active: true}
	if err := s.apply(context.Background(), Command{ID: "lp", Operation: "renew"}); err == nil {
		t.Fatal("replacement observer accepted")
	}
	if mutations.Load() != 0 || s.slots["lp"].generation != "old-generation" {
		t.Fatal("restart changed authority")
	}
}
