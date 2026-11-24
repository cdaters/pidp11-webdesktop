// Package main is an isolated M5.25 laboratory reader, never an ordinary service.
package main

import (
	"encoding/binary"
	"encoding/hex"
	"errors"
	"math"
	"sync"
	"time"
)

type Event struct {
	Instance   string  `json:"instance"`
	Generation uint32  `json:"generation"`
	Sequence   uint32  `json:"sequence"`
	Ticks      float64 `json:"simulated_ticks"`
	Monotonic  uint64  `json:"monotonic_ns"`
	Requested  uint32  `json:"requested"`
	Completed  uint32  `json:"completed"`
	Status     uint16  `json:"status"`
	Command    uint16  `json:"command"`
	Interrupt  bool    `json:"interrupt"`
	Lost       uint32  `json:"lost"`
}
type Summary struct {
	EventAgeMS  float64 `json:"event_age_ms"`
	MaxQueue    uint32  `json:"max_queue_at_drain"`
	Pending     uint32  `json:"pending_at_drain"`
	Mode        string  `json:"mode"`
	Reason      string  `json:"reason"`
	Instance    string  `json:"instance"`
	Generation  uint32  `json:"generation"`
	Guest       string  `json:"guest"`
	Sequence    uint32  `json:"sequence"`
	Lost        uint32  `json:"lost"`
	Events      uint64  `json:"events"`
	Bytes       uint64  `json:"bytes"`
	Filemarks   uint64  `json:"filemarks"`
	Activity    string  `json:"activity"`
	LastDelayMS float64 `json:"last_event_to_reader_ms"`
	MaxDelayMS  float64 `json:"max_event_to_reader_ms"`
}

// State owns one TM0 stream and at most 256 retained evidence events. Every field
// is guarded by mu. Get copies state before any network writer can block.
type State struct {
	lastMono  uint64
	mu        sync.Mutex
	summary   Summary
	heartbeat time.Time
	last      time.Time
	seen      bool
	retired   bool
	approved  bool
	next      uint32
	history   []Event
	omitted   uint64
	now       func() time.Time
	mono      func() uint64
}

func NewState(mono func() uint64) *State {
	return &State{summary: Summary{Mode: "unapproved", Activity: "unknown"}, history: make([]Event, 0, 256), now: time.Now, mono: mono}
}
func decode(raw []byte, header bool) (Event, error) {
	if len(raw) != 64 || binary.LittleEndian.Uint32(raw) != 0x3532354d || raw[4] != 1 || raw[5] != 0 || binary.LittleEndian.Uint64(raw[56:]) != 0 {
		return Event{}, errors.New("invalid event shape")
	}
	if (header && (raw[6] != 0 || raw[7]&^byte(2) != 0)) || (!header && (raw[6] != 1 || raw[7]&^byte(1) != 0)) {
		return Event{}, errors.New("invalid event kind")
	}
	e := Event{Instance: hex.EncodeToString(raw[8:16]), Generation: binary.LittleEndian.Uint32(raw[16:]), Sequence: binary.LittleEndian.Uint32(raw[20:]), Ticks: math.Float64frombits(binary.LittleEndian.Uint64(raw[24:])), Monotonic: binary.LittleEndian.Uint64(raw[32:]), Requested: binary.LittleEndian.Uint32(raw[40:]), Completed: binary.LittleEndian.Uint32(raw[44:]), Status: binary.LittleEndian.Uint16(raw[48:]), Command: binary.LittleEndian.Uint16(raw[50:]), Interrupt: raw[7]&1 != 0, Lost: binary.LittleEndian.Uint32(raw[52:])}
	if e.Instance == "0000000000000000" || e.Monotonic == 0 || math.IsNaN(e.Ticks) || math.IsInf(e.Ticks, 0) || e.Ticks < 0 {
		return Event{}, errors.New("invalid source/time")
	}
	if !header && (e.Generation == 0 || e.Sequence == 0 || e.Requested == 0 || e.Requested > 65536 || e.Completed > e.Requested || e.Command&0o200 == 0) {
		return Event{}, errors.New("invalid completion")
	}
	return e, nil
}
func (s *State) retire(reason string) {
	s.retired = true
	s.approved = false
	s.summary.Mode = "retired"
	s.summary.Reason = reason
	s.summary.Activity = "unknown"
}

// Feed accepts one peer-authenticated datagram. Corruption retires, never retries.
func (s *State) Feed(raw []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.retired {
		return
	}
	if len(raw) < 64 || len(raw) > 2112 || len(raw)%64 != 0 {
		s.retire("malformed packet")
		return
	}
	h, err := decode(raw[:64], true)
	if err != nil {
		s.retire(err.Error())
		return
	}
	if raw[7]&2 != 0 {
		s.retire("producer counter/fault retirement")
		return
	}
	if s.approved && s.now().Sub(s.heartbeat) > 300*time.Millisecond {
		s.retire("source heartbeat expired")
		return
	}
	if s.seen && (h.Instance != s.summary.Instance || h.Generation != s.summary.Generation) {
		s.retire("source or attachment changed")
		return
	}
	if s.seen && h.Lost != s.summary.Lost {
		s.retire("observation gap")
		return
	}
	if h.Monotonic > s.mono() || s.mono()-h.Monotonic > 300000000 {
		s.retire("invalid or delayed source clock")
		return
	}
	s.seen = true
	s.heartbeat = s.now()
	s.summary.Instance = h.Instance
	s.summary.Generation = h.Generation
	s.summary.Lost = h.Lost
	if !s.approved {
		s.summary.Sequence = h.Sequence
		return
	}
	// Header sequence may include queued entries not yet drained; validate each event.
	for offset := 64; offset < len(raw); offset += 64 {
		e, err := decode(raw[offset:offset+64], false)
		if err != nil {
			s.retire(err.Error())
			return
		}
		if e.Instance != h.Instance || e.Generation != h.Generation || e.Lost != h.Lost || e.Sequence != s.next {
			s.retire("event identity or sequence gap")
			return
		}
		now := s.mono()
		if e.Monotonic > now || now-e.Monotonic > 500000000 {
			s.retire("delayed event")
			return
		}
		s.summary.Sequence = e.Sequence
		s.next++
		if s.next == 0 {
			s.retire("sequence exhausted")
			return
		}
		s.summary.Events++
		s.summary.Bytes += uint64(e.Completed)
		if e.Status&0o40000 != 0 {
			s.summary.Filemarks++
		}
		delay := float64(now-e.Monotonic) / 1e6
		s.summary.LastDelayMS = delay
		if delay > s.summary.MaxDelayMS {
			s.summary.MaxDelayMS = delay
		}
		s.last = s.now()
		s.lastMono = e.Monotonic
		if len(s.history) < 256 {
			s.history = append(s.history, e)
		} else {
			s.omitted++
		}
	}
	if h.Sequence < s.summary.Sequence {
		s.retire("header sequence regressed")
		return
	}
	s.summary.Pending = h.Sequence - s.summary.Sequence
	queue := s.summary.Pending + uint32(len(raw)/64-1)
	if queue > 256 {
		s.retire("invalid queue bound")
		return
	}
	if queue > s.summary.MaxQueue {
		s.summary.MaxQueue = queue
	}
}

// Approve is a local operator action; no HTTP route calls it. Restart has no approval.
func (s *State) Approve(instance string, generation uint32, guest string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.retired || s.approved || !s.seen || s.now().Sub(s.heartbeat) > 300*time.Millisecond || instance != s.summary.Instance || generation == 0 || generation != s.summary.Generation || len(guest) < 1 || len(guest) > 80 || s.summary.Sequence == math.MaxUint32 {
		return errors.New("approval does not match fresh independently verified source")
	}
	s.approved = true
	s.next = s.summary.Sequence + 1
	s.summary.Guest = guest
	s.summary.Mode = "approved-lab"
	return nil
}
func (s *State) Get() Summary {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.approved && s.now().Sub(s.heartbeat) > 300*time.Millisecond {
		s.retire("source heartbeat expired")
	}
	result := s.summary
	result.Activity = "unknown"
	result.EventAgeMS = -1
	if s.lastMono > 0 && s.mono() >= s.lastMono {
		result.EventAgeMS = float64(s.mono()-s.lastMono) / 1e6
	}
	if s.approved && !s.last.IsZero() && s.now().Sub(s.last) <= 250*time.Millisecond && result.EventAgeMS <= 250 {
		result.Activity = "recent verified read completion"
	}
	return result
}
