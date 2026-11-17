// Package broker implements an experimental, poll-fenced laboratory arbiter.
// It cannot revoke an RPC response already in flight or halt a CPU after its own crash.
package broker

import (
	"fmt"
	"maps"
	"pidp11.local/webdesktop/internal/labrpc"
	"sync"
	"time"
)

const Lease = 3 * time.Second
const Fresh = 350 * time.Millisecond

var momentaries = []string{"LOAD_ADRS", "EXAM", "DEPOSIT", "CONT", "START", "LAMPTEST"}

type Frame struct {
	Seq    uint64            `json:"seq"`
	Phase  string            `json:"phase"`
	Epoch  uint64            `json:"epoch"`
	Inputs map[string]uint64 `json:"inputs"`
}
type State struct {
	LampRevision   uint64            `json:"lampRevision"`
	RunTransitions uint64            `json:"runTransitions"`
	Owner          string            `json:"owner"`
	Phase          string            `json:"phase"`
	Reason         string            `json:"reason"`
	Epoch          uint64            `json:"epoch"`
	Revision       uint64            `json:"revision"`
	Polls          uint64            `json:"polls"`
	Physical       map[string]uint64 `json:"physical"`
	Effective      map[string]uint64 `json:"effective"`
	Outputs        map[string]uint64 `json:"outputs"`
	Trace          []Frame           `json:"trace"`
}

// Fence is optional. The original M4 broker retains its known unsafe behavior
// without it, so the counterexample remains a permanent regression oracle.
type Fence interface {
	Ready() bool
	Arm() error
	Revoke() error
	Heartbeat() error
}
type Broker struct {
	authority                        Fence
	heartbeat                        time.Time
	fenceError                       bool
	lampsSeen                        bool
	neutralSamples                   int
	mu                               sync.Mutex
	s                                State
	lastPhysical, lastPoll, deadline time.Time
	fence                            int
	pulse                            string
	pulsePolls                       int
	clients                          map[string]bool
}

func New() *Broker {
	return &Broker{s: State{Phase: "halting", Reason: "startup baseline", Physical: map[string]uint64{}, Effective: map[string]uint64{"POWER": 1, "HALT": 1, "ADDR_SELECT": 4, "DATA_SELECT": 2}, Outputs: map[string]uint64{}}, clients: map[string]bool{}}
}
func NewFenced(f Fence) *Broker   { b := New(); b.authority = f; return b }
func (b *Broker) Snapshot() State { return b.snapshot(true) }
func (b *Broker) View() State     { return b.snapshot(false) }
func (b *Broker) OutputSnapshot() map[string]uint64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	return labrpc.Clone(b.s.Outputs)
}
func (b *Broker) snapshot(trace bool) State {
	b.mu.Lock()
	defer b.mu.Unlock()
	s := b.s
	s.Physical = labrpc.Clone(s.Physical)
	s.Effective = labrpc.Clone(s.Effective)
	s.Outputs = labrpc.Clone(s.Outputs)
	s.Trace = nil
	if trace {
		s.Trace = make([]Frame, len(b.s.Trace))
		for i, f := range b.s.Trace {
			f.Inputs = labrpc.Clone(f.Inputs)
			s.Trace[i] = f
		}
	}
	return s
}
func (b *Broker) quiesce(reason string) {
	if b.authority != nil {
		b.fenceError = b.authority.Revoke() != nil
	}

	b.s.Owner = ""
	b.s.Epoch++
	b.s.Revision++
	b.s.Phase = "halting"
	if b.fenceError {
		b.s.Phase = "fault"
		reason += "; consumer fence unavailable"
	}
	b.s.Reason = reason
	b.fence = 0
	b.pulse = ""
	b.pulsePolls = 0
	b.deadline = time.Time{}
	// Preserve START until HALT has been served to, then followed by a fresh GET
	// from, the exclusive synchronous REALCONS consumer. Clear other action levels.
	for _, k := range momentaries {
		if k != "START" {
			b.s.Effective[k] = 0
		}
	}
	b.s.Effective["HALT"] = 1
	b.s.Effective["POWER"] = 1
	b.s.Effective["PANEL_LOCK"] = 0
}
func (b *Broker) Revoke(reason string) { b.mu.Lock(); defer b.mu.Unlock(); b.quiesce(reason) }
func (b *Broker) Physical(values map[string]uint64, now time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()
	changed := false
	for k, v := range values {
		if old, ok := b.s.Physical[k]; ok && old != v {
			changed = true
		}
	}
	if b.s.Owner != "" && b.s.Owner != "physical" && changed {
		b.quiesce("physical movement during virtual ownership")
	}
	if values["POWER"] != 1 || values["PANEL_LOCK"] != 0 {
		if b.s.Phase == "active" {
			b.quiesce("physical power/lock interlock")
		}
	}
	if changed {
		b.s.Revision++
	}
	if b.s.Owner == "physical" && b.s.Phase == "active" {
		for k, v := range values {
			if v != b.s.Physical[k] {
				b.s.Effective[k] = v
			}
		}
	}
	neutral := values["POWER"] == 1 && values["PANEL_LOCK"] == 0
	for _, k := range momentaries {
		if values[k] != 0 {
			neutral = false
		}
	}
	if neutral {
		b.neutralSamples++
	} else {
		b.neutralSamples = 0
	}
	b.s.Physical = labrpc.Clone(values)
	b.lastPhysical = now
}
func (b *Broker) Fault(reason string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.s.Phase != "fault" {
		b.quiesce(reason)
		b.s.Phase = "fault"
	}
}
func (b *Broker) Tick(now time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.authority != nil && b.s.Phase == "active" && now.Sub(b.heartbeat) >= 100*time.Millisecond {
		b.heartbeat = now
		if b.authority.Heartbeat() != nil {
			b.quiesce("consumer watchdog/connection lost")
			b.s.Phase = "fault"
		}
	}
	if b.s.Owner != "" && b.s.Owner != "physical" && !now.Before(b.deadline) {
		b.quiesce("virtual lease expired")
	}
	if b.s.Phase == "active" && (now.Sub(b.lastPhysical) > Fresh || now.Sub(b.lastPoll) > Fresh) {
		b.quiesce("stale physical or REALCONS polling")
		b.s.Phase = "fault"
	}
}

// Inputs is called only for a new, accepted GET by the exclusive consumer. A
// subsequent GET is a protocol-level consumption fence, not a CPU completion ack.
func (b *Broker) Inputs() map[string]uint64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.lastPoll = time.Now()
	b.s.Polls++
	if b.s.Phase == "halting" || b.s.Phase == "neutralizing" {
		if b.fence == 1 {
			for _, k := range momentaries {
				b.s.Effective[k] = 0
			}
			b.s.Phase = "neutralizing"
		}
		if b.fence >= 2 && b.lampsSeen && b.s.Outputs["RUN"] == 0 && (b.authority == nil || b.authority.Ready()) {
			b.s.Phase = "ready"
			b.s.Reason = "halted neutral baseline; explicit grant required"
		}
		b.fence++
	}
	if b.s.Phase == "active" && b.pulse != "" {
		if b.pulsePolls >= 2 {
			b.s.Effective[b.pulse] = 0
			b.pulse = ""
			b.s.Revision++
		} else {
			b.pulsePolls++
		}
	}
	v := labrpc.Clone(b.s.Effective)
	b.s.Trace = append(b.s.Trace, Frame{b.s.Polls, b.s.Phase, b.s.Epoch, v})
	if len(b.s.Trace) > 128 {
		b.s.Trace = b.s.Trace[len(b.s.Trace)-128:]
	}
	return v
}
func (b *Broker) Lamps(values map[string]uint64) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.s.Outputs["RUN"] == 0 && values["RUN"] != 0 {
		b.s.RunTransitions++
	}
	if !maps.Equal(b.s.Outputs, values) {
		b.s.LampRevision++
	}
	b.lampsSeen = true
	b.s.Outputs = labrpc.Clone(values)
}
func (b *Broker) Connect(id string) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if id == "" || b.clients[id] || len(b.clients) >= 8 {
		return false
	}
	b.clients[id] = true
	return true
}
func (b *Broker) Disconnect(id string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	delete(b.clients, id)
	if b.s.Owner == id {
		b.quiesce("browser disconnected")
	}
}
func (b *Broker) Grant(id string, now time.Time) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	if id != "physical" && !b.clients[id] {
		return fmt.Errorf("unknown browser")
	}
	if !b.lampsSeen || b.neutralSamples < 2 || b.s.Phase != "ready" || b.s.Owner != "" || b.s.Outputs["RUN"] != 0 || now.Sub(b.lastPhysical) > Fresh || now.Sub(b.lastPoll) > Fresh {
		return fmt.Errorf("fresh halted baseline required")
	}
	if b.s.Physical["HALT"] != 0 || b.s.Physical["PANEL_LOCK"] != 0 || b.s.Physical["POWER"] != 1 {
		return fmt.Errorf("physical HALT/power/lock inhibits grant")
	}
	for _, k := range momentaries {
		if b.s.Physical[k] != 0 {
			return fmt.Errorf("physical momentary held")
		}
	}
	if b.authority != nil {
		if err := b.authority.Arm(); err != nil {
			return err
		}
		b.heartbeat = now
	}
	b.s.Owner = id
	b.s.Phase = "active"
	b.s.Epoch++
	b.s.Revision++
	b.s.Reason = "explicit control grant"
	b.deadline = now.Add(Lease)
	b.s.Effective = labrpc.Clone(b.s.Physical)
	b.s.Effective["HALT"] = 1
	return nil
}
func (b *Broker) Renew(id string, epoch uint64, now time.Time) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.s.Owner != id || b.s.Epoch != epoch || b.s.Phase != "active" {
		return fmt.Errorf("stale owner")
	}
	if !now.Before(b.deadline) {
		b.quiesce("lease expired before renewal")
		return fmt.Errorf("lease expired")
	}
	b.deadline = now.Add(Lease)
	return nil
}
func (b *Broker) Control(id string, epoch, revision uint64, name string, value uint64, pulse bool) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.s.Owner != "" && b.s.Owner != "physical" && !time.Now().Before(b.deadline) {
		b.quiesce("virtual lease expired before request")
	}
	if id == "physical" || id == "" || id != b.s.Owner || epoch != b.s.Epoch || b.s.Phase != "active" {
		return fmt.Errorf("virtual lease required")
	}
	if name == "HALT" && value == 1 && !pulse {
		b.quiesce("virtual HALT asserted")
		return nil
	}
	if revision != b.s.Revision || b.pulse != "" {
		return fmt.Errorf("revision conflict or momentary pending")
	}
	if pulse {
		valid := false
		for _, k := range momentaries {
			if k == name {
				valid = true
			}
		}
		if !valid || value != 0 {
			return fmt.Errorf("invalid pulse")
		}
		if name == "START" && b.s.Outputs["RUN"] != 0 {
			return fmt.Errorf("START while running")
		}
		b.s.Effective[name] = 1
		b.pulse = name
		b.pulsePolls = 0
	} else {
		limits := map[string]uint64{"SR": 0x3fffff, "HALT": 1, "S_BUS_CYCLE": 1, "ADDR_SELECT": 7, "DATA_SELECT": 3}
		max, ok := limits[name]
		if !ok || value > max {
			return fmt.Errorf("invalid latch")
		}
		b.s.Effective[name] = value
	}
	b.s.Revision++
	return nil
}
