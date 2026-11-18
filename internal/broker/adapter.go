package broker

import (
	"fmt"
	"pidp11.local/webdesktop/internal/panel"
	"sync"
	"time"
)

// Adapter connects the existing bounded browser transport to the lab broker.
// The mock desktop does not construct this adapter.
// mu protects per-client duplicate-request accounting. Lock order is Adapter.mu
// then Broker.mu; broker code must not call back into Adapter while locked.
type Adapter struct {
	B       *Broker
	mu      sync.Mutex
	last    map[string]panel.Request
	results map[string]panel.Result
}

func NewAdapter(b *Broker) *Adapter {
	return &Adapter{B: b, last: map[string]panel.Request{}, results: map[string]panel.Result{}}
}
func (a *Adapter) Connect(id string) bool { return a.B.Connect(id) }
func (a *Adapter) Disconnect(id string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.B.Disconnect(id)
	delete(a.last, id)
	delete(a.results, id)
}
func (a *Adapter) Poll(now time.Time) { a.B.Tick(now) }
func (a *Adapter) Snapshot() panel.State {
	s := a.B.View()
	return panel.State{Source: "realcons-lab", Indicators: s.Outputs, Revision: s.Polls + s.Revision + s.LampRevision, ControlRevision: s.Revision, Epoch: s.Epoch, Owner: s.Owner, Blocked: s.Phase != "ready" && s.Phase != "active", Address: uint32(s.Outputs["ADDRESS"]), Data: uint32(s.Outputs["DATA"]), SwitchRegister: uint32(s.Effective["SR"]), Halted: s.Effective["HALT"] != 0, Running: s.Outputs["RUN"] != 0, BusCycle: s.Effective["S_BUS_CYCLE"] != 0, AddressSelect: uint32(s.Effective["ADDR_SELECT"]), DataSelect: uint32(s.Effective["DATA_SELECT"]), Reason: s.Phase + ": " + s.Reason}
}
func (a *Adapter) Apply(id string, r panel.Request, now time.Time) panel.Result {
	a.mu.Lock()
	defer a.mu.Unlock()
	result := panel.Result{Type: "ack", ID: r.ID}
	if prev, ok := a.last[id]; ok && r.ID <= prev.ID {
		if r == prev {
			result = a.results[id]
		} else {
			result.Message = "stale or conflicting ID"
		}
		result.State = a.Snapshot()
		return result
	}
	var e error
	switch {
	case r.ID == 0:
		e = fmt.Errorf("positive ID required")
	case r.Type == "acquire":
		e = a.B.Grant(id, now)
	case r.Type == "renew":
		e = a.B.Renew(id, r.Epoch, now)
	case r.Type == "release":
		s := a.B.View()
		if s.Owner != id || s.Epoch != r.Epoch {
			e = fmt.Errorf("stale owner")
		} else {
			a.B.Revoke("explicit browser release")
		}
	case r.Type == "set" || r.Type == "pulse":
		names := map[string]string{"sr": "SR", "halt": "HALT", "bus-cycle": "S_BUS_CYCLE", "address-select": "ADDR_SELECT", "data-select": "DATA_SELECT", "load": "LOAD_ADRS", "examine": "EXAM", "deposit": "DEPOSIT", "continue": "CONT", "start": "START", "lamp-test": "LAMPTEST"}
		name := names[r.Control]
		e = a.B.Control(id, r.Epoch, r.Expected, name, uint64(r.Value), r.Type == "pulse")
	default:
		e = fmt.Errorf("unknown request")
	}
	result.Accepted = e == nil
	if e != nil {
		result.Message = e.Error()
	} else {
		result.Message = "accepted by isolated REALCONS broker; execution completion not implied"
	}
	result.State = a.Snapshot()
	if r.ID > 0 {
		a.last[id] = r
		a.results[id] = result
	}
	return result
}
