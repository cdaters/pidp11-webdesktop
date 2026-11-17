package panel

import (
	"testing"
	"time"
)

var now = time.Unix(1, 0)

func owner(t *testing.T) (*Hub, uint64) {
	t.Helper()
	h := New()
	h.Connect("a")
	r := h.Apply("a", Request{ID: 1, Type: "acquire"}, now)
	if !r.Accepted {
		t.Fatal(r)
	}
	return h, r.State.Epoch
}
func command(h *Hub, id uint64, kind, control string, value uint32) Result {
	s := h.Snapshot()
	return h.Apply("a", Request{ID: id, Type: kind, Control: control, Value: value, Epoch: s.Epoch, Expected: s.ControlRevision}, now)
}
func finish(h *Hub) { h.Poll(now); h.Poll(now) }
func TestLeaseConflictAndReconnection(t *testing.T) {
	h, epoch := owner(t)
	h.Connect("b")
	if h.Apply("b", Request{ID: 1, Type: "acquire"}, now).Accepted {
		t.Fatal("two owners")
	}
	if h.Apply("b", Request{ID: 2, Type: "set", Control: "sr", Epoch: epoch}, now).Accepted {
		t.Fatal("spectator write")
	}
	h.Disconnect("a")
	s := h.Snapshot()
	if s.Owner != "" || !s.Halted || s.Running {
		t.Fatal(s)
	}
	h.Connect("new")
	r := h.Apply("new", Request{ID: 1, Type: "acquire"}, now)
	if !r.Accepted || r.State.Epoch == epoch {
		t.Fatal(r)
	}
	if h.Apply("new", Request{ID: 2, Type: "set", Control: "sr", Epoch: epoch}, now).Accepted {
		t.Fatal("old epoch accepted")
	}
}
func TestRevisionAndReplay(t *testing.T) {
	h, _ := owner(t)
	s := h.Snapshot()
	req := Request{ID: 2, Type: "set", Control: "sr", Value: 123, Epoch: s.Epoch, Expected: s.ControlRevision}
	r := h.Apply("a", req, now)
	if !r.Accepted {
		t.Fatal(r)
	}
	again := h.Apply("a", req, now)
	if !again.Accepted || again.State.ControlRevision != r.State.ControlRevision {
		t.Fatal("not idempotent")
	}
	req.Value++
	if h.Apply("a", req, now).Accepted {
		t.Fatal("id collision")
	}
	req.ID++
	if h.Apply("a", req, now).Accepted {
		t.Fatal("stale revision")
	}
}
func TestStartCancelAndLeaseExpiry(t *testing.T) {
	for _, cancel := range []string{"disconnect", "expiry", "interlock", "release"} {
		t.Run(cancel, func(t *testing.T) {
			h, _ := owner(t)
			command(h, 2, "set", "halt", 0)
			command(h, 3, "pulse", "start", 0)
			if h.Snapshot().Running {
				t.Fatal("start ran on press")
			}
			switch cancel {
			case "disconnect":
				h.Disconnect("a")
			case "expiry":
				h.Poll(now.Add(LeaseDuration))
			case "interlock":
				h.Interlock("physical stand-in changed")
			case "release":
				h.Apply("a", Request{ID: 4, Type: "release", Epoch: h.Snapshot().Epoch}, now)
			}
			finish(h)
			s := h.Snapshot()
			if s.Running || !s.Halted || s.Momentary != "" || s.Owner != "" {
				t.Fatal(s)
			}
		})
	}
}
func TestHistoricalControls(t *testing.T) {
	h, _ := owner(t)
	command(h, 2, "set", "sr", 0o2000)
	command(h, 3, "pulse", "load", 0)
	finish(h)
	command(h, 4, "set", "sr", 0o12345)
	command(h, 5, "pulse", "deposit", 0)
	finish(h)
	command(h, 6, "pulse", "examine", 0)
	finish(h)
	if h.Snapshot().Address != 0o2000 || h.Snapshot().Data != 0o12345 {
		t.Fatal(h.Snapshot())
	}
	command(h, 7, "pulse", "examine", 0)
	finish(h)
	if h.Snapshot().Address != 0o2002 {
		t.Fatal("consecutive examine did not advance")
	}
	command(h, 8, "set", "halt", 0)
	if h.Snapshot().Running {
		t.Fatal("HALT release resumed")
	}
	command(h, 9, "pulse", "start", 0)
	if h.Snapshot().Address != 0o2000 {
		t.Fatal("START used current SR")
	}
	h.Poll(now)
	if h.Snapshot().Running {
		t.Fatal("premature release")
	}
	h.Poll(now)
	if !h.Snapshot().Running {
		t.Fatal("start did not run on release")
	}
}
func TestLampFramesDontConflictWithControls(t *testing.T) {
	h, _ := owner(t)
	command(h, 2, "set", "halt", 0)
	command(h, 3, "pulse", "continue", 0)
	finish(h)
	s := h.Snapshot()
	h.Poll(now)
	if h.Snapshot().ControlRevision != s.ControlRevision {
		t.Fatal("lamp frame changed control revision")
	}
	r := h.Apply("a", Request{ID: 4, Type: "set", Control: "sr", Value: 42, Epoch: s.Epoch, Expected: s.ControlRevision}, now)
	if !r.Accepted {
		t.Fatal(r)
	}
}
func TestBoundsAndPulseSerialization(t *testing.T) {
	h, _ := owner(t)
	if command(h, 2, "set", "sr", AddressMask+1).Accepted {
		t.Fatal("oversize SR")
	}
	if command(h, 3, "set", "halt", 2).Accepted {
		t.Fatal("invalid latch")
	}
	command(h, 4, "pulse", "load", 0)
	if command(h, 5, "pulse", "start", 0).Accepted {
		t.Fatal("overlapping pulses")
	}
	for i := 0; i < 7; i++ {
		if !h.Connect(string(rune('b' + i))) {
			t.Fatal("early cap")
		}
	}
	if h.Connect("overflow") {
		t.Fatal("viewer cap")
	}
}
func BenchmarkPoll(b *testing.B) {
	h := New()
	h.Connect("a")
	h.Apply("a", Request{ID: 1, Type: "acquire"}, now)
	command(h, 2, "set", "halt", 0)
	command(h, 3, "pulse", "continue", 0)
	b.ReportAllocs()
	for b.Loop() {
		h.Poll(now)
		h.Snapshot()
	}
}
func TestPriorityHaltAndPersistentInterlock(t *testing.T) {
	h, _ := owner(t)
	command(h, 2, "set", "halt", 0)
	s := h.Snapshot()
	command(h, 3, "pulse", "start", 0)
	r := h.Apply("a", Request{ID: 4, Type: "set", Control: "halt", Value: 1, Epoch: s.Epoch, Expected: s.ControlRevision}, now)
	if !r.Accepted {
		t.Fatal(r)
	}
	finish(h)
	if h.Snapshot().Running {
		t.Fatal("canceled START ran")
	}
	h.Interlock("physical HALT stand-in")
	if h.Apply("a", Request{ID: 5, Type: "acquire"}, now).Accepted {
		t.Fatal("persistent fault ignored")
	}
	h.ReArm()
	if !h.Apply("a", Request{ID: 6, Type: "acquire"}, now).Accepted {
		t.Fatal("cannot rearm")
	}
}
func TestLampPulseAndSequenceReset(t *testing.T) {
	h, _ := owner(t)
	command(h, 2, "pulse", "lamp-test", 0)
	for i := 0; i < 25; i++ {
		h.Poll(now)
	}
	if h.Snapshot().LampTest || h.Snapshot().Momentary != "" {
		t.Fatal("lamp test stuck")
	}
	command(h, 3, "pulse", "examine", 0)
	finish(h)
	a := h.Snapshot().Address
	h.Disconnect("a")
	h.Connect("a")
	h.Apply("a", Request{ID: 1, Type: "acquire"}, now)
	command(h, 2, "pulse", "examine", 0)
	if h.Snapshot().Address != a {
		t.Fatal("stale memory sequence after handoff")
	}
}
