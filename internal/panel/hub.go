// Package panel contains only a deterministic demonstration model and ownership arbiter.
// It has no network, emulator, filesystem or GPIO access.
package panel

import (
	"fmt"
	"sync"
	"time"
)

const AddressMask = 0x3fffff
const LeaseDuration = 5 * time.Second
const MaxClients = 8

type State struct {
	Indicators      map[string]uint64 `json:"indicators,omitempty"`
	Blocked         bool              `json:"blocked"`
	Source          string            `json:"source"`
	Revision        uint64            `json:"revision"`
	ControlRevision uint64            `json:"controlRevision"`
	Epoch           uint64            `json:"epoch"`
	Owner           string            `json:"owner"`
	Address         uint32            `json:"address"`
	Data            uint32            `json:"data"`
	SwitchRegister  uint32            `json:"switchRegister"`
	Halted          bool              `json:"halted"`
	Running         bool              `json:"running"`
	LampTest        bool              `json:"lampTest"`
	BusCycle        bool              `json:"busCycle"`
	AddressSelect   uint32            `json:"addressSelect"`
	DataSelect      uint32            `json:"dataSelect"`
	Cycles          uint64            `json:"cycles"`
	StoredWords     int               `json:"storedWords"`
	Momentary       string            `json:"momentary"`
	Reason          string            `json:"reason"`
}
type Request struct {
	ID       uint64 `json:"id"`
	Type     string `json:"type"`
	Epoch    uint64 `json:"epoch"`
	Expected uint64 `json:"expected"`
	Control  string `json:"control,omitempty"`
	Value    uint32 `json:"value,omitempty"`
}
type Result struct {
	Type     string `json:"type"`
	ID       uint64 `json:"id"`
	Accepted bool   `json:"accepted"`
	Message  string `json:"message"`
	State    State  `json:"state"`
}
type client struct {
	lastID uint64
	last   Request
	result Result
}
type Hub struct {
	mu            sync.Mutex
	state         State
	clients       map[string]*client
	memory        map[uint32]uint32
	deadline      time.Time
	pulsePolls    int
	lastMemory    string
	loadedAddress uint32
}

func New() *Hub {
	return &Hub{state: State{Source: "simulation", Address: 0o1000, Data: 0o12700, SwitchRegister: 0o1000, Halted: true, AddressSelect: 4, DataSelect: 2, Reason: "Mock backend ready; acquire control to operate."}, loadedAddress: 0o1000, clients: make(map[string]*client), memory: make(map[uint32]uint32)}
}
func (h *Hub) Connect(id string) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	if id == "" || h.clients[id] != nil || len(h.clients) >= MaxClients {
		return false
	}
	h.clients[id] = &client{}
	return true
}
func (h *Hub) Snapshot() State { h.mu.Lock(); defer h.mu.Unlock(); return h.state }
func (h *Hub) changed(control bool) {
	h.state.Revision++
	if control {
		h.state.ControlRevision++
	}
}
func (h *Hub) revoke(reason string) {
	// Cancellation is NOT a synthetic START release: first halt, then discard pending edges.
	h.state.Running = false
	h.state.Halted = true
	h.state.Momentary = ""
	h.state.LampTest = false
	h.state.Owner = ""
	h.state.Epoch++
	h.pulsePolls = 0
	h.lastMemory = ""
	h.deadline = time.Time{}
	h.state.Reason = reason
	h.changed(true)
}
func (h *Hub) Disconnect(id string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, id)
	if h.state.Owner == id {
		h.revoke("Owner disconnected; halted and disarmed.")
	}
}
func (h *Hub) expire(now time.Time) {
	if h.state.Owner != "" && !now.Before(h.deadline) {
		h.revoke("Lease expired; halted and disarmed.")
	}
}

// Interlock is a testable domain input, not a physical-panel integration or HTTP endpoint.
func (h *Hub) Interlock(reason string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.state.Blocked = true
	h.revoke(reason)
}

// ReArm clears a fixture interlock without resuming. No remote endpoint exposes it.
func (h *Hub) ReArm() { h.mu.Lock(); defer h.mu.Unlock(); h.state.Blocked = false; h.changed(true) }
func (h *Hub) word(addr uint32) uint32 {
	if v, ok := h.memory[addr]; ok {
		return v
	}
	return (((addr >> 1) * 109) ^ 0o12700) & 0xffff
}
func (h *Hub) advance() {
	h.state.Address = (h.state.Address + 2) & AddressMask
	h.state.Data = h.word(h.state.Address)
	h.state.Cycles++
}

// Poll is a simulated REALCONS polling opportunity. Momentary edges span two polls.
func (h *Hub) Poll(now time.Time) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.expire(now)
	if h.pulsePolls > 0 {
		h.pulsePolls--
		if h.pulsePolls == 0 {
			if h.state.Momentary == "start" && !h.state.Halted {
				h.state.Running = true
			}
			h.state.Momentary = ""
			h.state.LampTest = false
			h.changed(true)
		}
	}
	if h.state.Running && !h.state.Halted {
		h.advance()
		h.changed(false)
	}
}
func (h *Hub) Apply(id string, r Request, now time.Time) Result {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.expire(now)
	c, ok := h.clients[id]
	if !ok {
		return Result{Type: "ack", ID: r.ID, Message: "Unknown connection", State: h.state}
	}
	finish := func(accepted bool, msg string) Result {
		res := Result{Type: "ack", ID: r.ID, Accepted: accepted, Message: msg, State: h.state}
		if r.ID > c.lastID {
			c.lastID = r.ID
			c.last = r
			c.result = res
		}
		return res
	}
	if r.ID == 0 {
		return finish(false, "ID must be positive")
	}
	if r.ID == c.lastID {
		if r == c.last {
			res := c.result
			res.State = h.state
			return res
		}
		return finish(false, "ID reused with different request")
	}
	if r.ID < c.lastID {
		return finish(false, "Stale request ID; never replay commands")
	}
	if r.Type == "acquire" {
		if h.state.Blocked {
			return finish(false, "Interlock active; explicit re-arm required")
		}
		if h.state.Owner != "" {
			return finish(false, "Control already owned")
		}
		h.state.Epoch++
		h.lastMemory = ""
		h.state.Owner = id
		h.deadline = now.Add(LeaseDuration)
		h.state.Reason = "Browser owns mock controls"
		h.changed(true)
		return finish(true, "Control acquired")
	}
	if h.state.Owner != id || r.Epoch != h.state.Epoch {
		return finish(false, "Control lease required or ownership epoch stale")
	}
	if r.Type == "renew" {
		h.deadline = now.Add(LeaseDuration)
		return finish(true, "Lease renewed")
	}
	if r.Type == "release" {
		h.revoke("Control released; halted and disarmed.")
		return finish(true, "Control released")
	}
	if r.Type != "set" && r.Type != "pulse" {
		return finish(false, "Unknown request type")
	}
	// HALT assertion is a priority stop, even with a stale control revision or active START.
	if r.Type == "set" && r.Control == "halt" && r.Value == 1 {
		h.state.Halted = true
		h.state.Running = false
		h.state.Momentary = ""
		h.state.LampTest = false
		h.pulsePolls = 0
		h.lastMemory = ""
		h.changed(true)
		return finish(true, "HALT asserted; pending momentary canceled")
	}
	if r.Expected != h.state.ControlRevision {
		return finish(false, "Control revision conflict; resynchronize")
	}
	if h.state.Momentary != "" {
		return finish(false, "Momentary action still active")
	}
	s := &h.state
	if r.Type == "set" {
		switch r.Control {
		case "sr":
			if r.Value > AddressMask {
				return finish(false, "SR exceeds 22 bits")
			}
			s.SwitchRegister = r.Value
		case "halt":
			if r.Value > 1 {
				return finish(false, "HALT must be 0 or 1")
			}
			s.Halted = r.Value == 1
			if s.Halted {
				s.Running = false
			}
			h.lastMemory = ""
		case "bus-cycle":
			if r.Value > 1 {
				return finish(false, "S BUS CYCLE must be 0 or 1")
			}
			s.BusCycle = r.Value == 1
		case "address-select":
			if r.Value > 7 {
				return finish(false, "Address selector out of range")
			}
			s.AddressSelect = r.Value
		case "data-select":
			if r.Value > 3 {
				return finish(false, "Data selector out of range")
			}
			s.DataSelect = r.Value
		default:
			return finish(false, "Unknown latching control")
		}
	} else {
		if r.Value != 0 {
			return finish(false, "Pulse value must be zero")
		}
		switch r.Control {
		case "load", "examine", "deposit":
			if !s.Halted {
				return finish(false, "Assert HALT for memory controls")
			}
			if r.Control == "load" {
				s.Address = s.SwitchRegister & ^uint32(1)
				h.loadedAddress = s.Address
				s.Data = h.word(s.Address)
				h.lastMemory = ""
			} else {
				next := s.Address
				if h.lastMemory == r.Control {
					next = (next + 2) & AddressMask
				}
				if r.Control == "deposit" {
					if _, exists := h.memory[next]; !exists && len(h.memory) >= 1024 {
						return finish(false, "Scratch memory full")
					}
					h.memory[next] = s.SwitchRegister & 0xffff
					s.StoredWords = len(h.memory)
				}
				s.Address = next
				s.Data = h.word(next)
				h.lastMemory = r.Control
			}
		case "continue":
			if s.Halted {
				h.advance()
			} else {
				s.Running = true
			}
			h.lastMemory = ""
		case "lamp-test":
			s.LampTest = true
		case "start":
			if s.Running {
				return finish(false, "START ignored while running")
			}
			s.Running = false
			s.Cycles = 0
			s.Address = h.loadedAddress
			s.Data = h.word(s.Address)
			h.lastMemory = ""
		default:
			return finish(false, "Unknown momentary control")
		}
		s.Momentary = r.Control
		h.pulsePolls = 2
		if r.Control == "lamp-test" {
			h.pulsePolls = 25
		}
	}
	h.changed(true)
	return finish(true, fmt.Sprintf("%s applied to simulated panel", r.Control))
}
