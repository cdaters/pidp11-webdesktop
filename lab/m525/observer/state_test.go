package main

import (
	"encoding/binary"
	"encoding/json"
	"math"
	"sync"
	"testing"
	"time"
)

func packet(seq uint32, events ...uint32) []byte {
	raw := make([]byte, 64*(1+len(events)))
	for i := 0; i < len(raw)/64; i++ {
		r := raw[i*64:]
		binary.LittleEndian.PutUint32(r, 0x3532354d)
		r[4] = 1
		r[8] = 42
		binary.LittleEndian.PutUint32(r[16:], 1)
		binary.LittleEndian.PutUint64(r[32:], 1000000000)
		if i > 0 {
			r[6] = 1
			binary.LittleEndian.PutUint32(r[20:], events[i-1])
			binary.LittleEndian.PutUint32(r[40:], 512)
			binary.LittleEndian.PutUint32(r[44:], 512)
			binary.LittleEndian.PutUint16(r[50:], 0o200)
		} else {
			binary.LittleEndian.PutUint32(r[20:], seq)
		}
	}
	return raw
}
func approved(t *testing.T) *State {
	t.Helper()
	s := NewState(func() uint64 { return 1000000000 })
	s.Feed(packet(0))
	if err := s.Approve(s.Get().Instance, 1, "rt11-attested"); err != nil {
		t.Fatal(err)
	}
	return s
}
func TestCompletionExpiryAndRestart(t *testing.T) {
	s := approved(t)
	s.Feed(packet(1, 1))
	if s.Get().Bytes != 512 || s.Get().Activity == "unknown" {
		t.Fatal(s.Get())
	}
	s.now = func() time.Time { return time.Now().Add(time.Second) }
	if s.Get().Mode != "retired" {
		t.Fatal("expired source adopted")
	}
	s.Feed(packet(2, 2))
	if s.Get().Events != 1 {
		t.Fatal("retired stream resumed")
	}
	fresh := NewState(func() uint64 { return 1000000000 })
	fresh.Feed(packet(1, 1))
	if fresh.Get().Events != 0 || fresh.Get().Mode != "unapproved" {
		t.Fatal("restart inherited authority")
	}
}
func TestFailureMatrix(t *testing.T) {
	for name, change := range map[string]func([]byte) []byte{
		"short": func(b []byte) []byte { return b[:12] }, "oversized": func(b []byte) []byte { return make([]byte, 2113) }, "source": func(b []byte) []byte { b[8]++; return b }, "generation": func(b []byte) []byte { b[16]++; return b }, "loss": func(b []byte) []byte { b[52]++; return b }, "reserved": func(b []byte) []byte { b[56]++; return b }, "wrong-controller": func(b []byte) []byte { b[4]++; return b }, "unit": func(b []byte) []byte { b[5]++; return b }, "duplicate": func(b []byte) []byte { binary.LittleEndian.PutUint32(b[84:], 0); return b }, "out-of-order": func(b []byte) []byte { binary.LittleEndian.PutUint32(b[84:], 2); return b }, "counts": func(b []byte) []byte { binary.LittleEndian.PutUint32(b[108:], 513); return b }, "NaN": func(b []byte) []byte { binary.LittleEndian.PutUint64(b[88:], math.Float64bits(math.NaN())); return b }, "fault": func(b []byte) []byte { b[7] = 2; return b }, "delayed": func(b []byte) []byte { binary.LittleEndian.PutUint64(b[32:], 1); return b },
	} {
		t.Run(name, func(t *testing.T) {
			s := approved(t)
			s.Feed(change(packet(1, 1)))
			if s.Get().Mode != "retired" || s.Get().Activity != "unknown" {
				t.Fatal(s.Get())
			}
		})
	}
}
func TestBoundedHistoryConcurrentReaders(t *testing.T) {
	s := approved(t)
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for n := 0; n < 1000; n++ {
				b, _ := json.Marshal(s.Get())
				if len(b) > 4096 {
					t.Error("unbounded response")
				}
			}
		}()
	}
	for i := uint32(1); i <= 1000; i++ {
		s.Feed(packet(i, i))
	}
	wg.Wait()
	if len(s.history) != 256 || s.omitted != 744 {
		t.Fatal("history grew")
	}
}
func TestApprovalCannotCrossGuestOrRetiredIdentity(t *testing.T) {
	s := approved(t)
	if s.Approve(s.Get().Instance, 1, "new-guest") == nil {
		t.Fatal("guest transition without retirement")
	}
	s.Feed(packet(1, 1))
	r := packet(2, 2)
	r[80] = 2
	s.Feed(r)
	if s.Get().Mode != "retired" {
		t.Fatal("changed attachment accepted")
	}
}
