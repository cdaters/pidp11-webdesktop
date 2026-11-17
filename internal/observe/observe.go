// Package observe consumes copies of existing REALCONS state. It has no RPC client,
// control broker, switch writer, terminal input or routing capability.
package observe

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"maps"
	"net"
	"os"
	"sync"
	"time"
)

const MaxDatagram = 4096
const Fresh = 350 * time.Millisecond

type Frame struct {
	Version  int               `json:"version"`
	Boot     string            `json:"boot"`
	Seq      uint64            `json:"seq"`
	Captured int64             `json:"capturedUnixMs"`
	Inputs   map[string]uint64 `json:"inputs"`
	Outputs  map[string]uint64 `json:"outputs"`
	Dropped  uint64            `json:"publisherDropped"`
}
type Snapshot struct {
	Source    string `json:"source"`
	Available bool   `json:"available"`
	Fresh     bool   `json:"fresh"`
	Age       int64  `json:"ageMs"`
	Rejected  uint64 `json:"rejected"`
	Frame     *Frame `json:"frame"`
}
type Store struct {
	mu       sync.Mutex
	frame    *Frame
	received time.Time
	retired  map[string]bool
	rejected uint64
}

func New() *Store { return &Store{retired: map[string]bool{}} }

var inputs = map[string]uint64{"SR": 0x3fffff, "LAMPTEST": 1, "LOAD_ADRS": 1, "EXAM": 1, "DEPOSIT": 1, "CONT": 1, "HALT": 1, "S_BUS_CYCLE": 1, "START": 1, "POWER": 1, "PANEL_LOCK": 1, "ADDR_SELECT": 7, "DATA_SELECT": 3}
var outputs = map[string]uint64{"ADDRESS": 0x3fffff, "DATA": 0xffff, "PARITY_HIGH": 1, "PARITY_LOW": 1, "PAR_ERR": 1, "ADRS_ERR": 1, "RUN": 1, "PAUSE": 1, "MASTER": 1, "MMR0_MODE": 7, "DATA_SPACE": 1, "ADDRESSING_16": 1, "ADDRESSING_18": 1, "ADDRESSING_22": 1, "ADDR_SELECT_FEEDBACK": 255, "DATA_SELECT_FEEDBACK": 15}

func bank(values, limits map[string]uint64) bool {
	if len(values) != len(limits) {
		return false
	}
	for k, max := range limits {
		v, ok := values[k]
		if !ok || v > max {
			return false
		}
	}
	return true
}
func (s *Store) Accept(b []byte, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	reject := func() error { s.rejected++; return fmt.Errorf("invalid, stale or reordered observation") }
	if len(b) > MaxDatagram {
		return reject()
	}
	var f Frame
	d := json.NewDecoder(bytes.NewReader(b))
	d.DisallowUnknownFields()
	if d.Decode(&f) != nil {
		return reject()
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return reject()
	}
	if f.Version != 1 || len(f.Boot) != 16 || f.Seq == 0 || !bank(f.Inputs, inputs) || !bank(f.Outputs, outputs) {
		return reject()
	}
	for _, c := range f.Boot {
		if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
			return reject()
		}
	}
	age := now.UnixMilli() - f.Captured
	if age < -1000 || age > 2000 {
		return reject()
	}
	if s.frame != nil {
		if s.retired[f.Boot] || f.Boot == s.frame.Boot && f.Seq <= s.frame.Seq {
			return reject()
		}
		if f.Boot != s.frame.Boot {
			if len(s.retired) >= 16 {
				return reject()
			}
			s.retired[s.frame.Boot] = true
		}
	}
	s.frame = &f
	s.received = now
	return nil
}
func (s *Store) Snapshot(now time.Time) Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := Snapshot{Source: "realcons-observation-lab", Rejected: s.rejected}
	if s.frame == nil {
		return result
	}
	f := *s.frame
	f.Inputs = maps.Clone(f.Inputs)
	f.Outputs = maps.Clone(f.Outputs)
	result.Frame = &f
	result.Available = true
	age := now.UnixMilli() - f.Captured
	if age < 0 {
		age = 0
	}
	result.Age = age
	result.Fresh = now.Sub(s.received) <= Fresh && age <= Fresh.Milliseconds()
	return result
}
func (s *Store) Listen(ctx context.Context, path string) error {
	addr := &net.UnixAddr{Name: path, Net: "unixgram"}
	c, e := net.ListenUnixgram("unixgram", addr)
	if e != nil {
		return e
	}
	defer c.Close()
	defer os.Remove(path)
	if e = os.Chmod(path, 0600); e != nil {
		return e
	}
	go func() { <-ctx.Done(); c.Close() }()
	b := make([]byte, MaxDatagram+1)
	for {
		n, _, e := c.ReadFromUnix(b)
		if e != nil {
			if ctx.Err() != nil {
				return nil
			}
			return e
		}
		_ = s.Accept(b[:n], time.Now())
	}
}
