package broker

import (
	"fmt"
	"testing"
	"time"
)

func ready(t *testing.T) *Broker {
	t.Helper()
	b := New()
	b.Physical(map[string]uint64{"POWER": 1, "HALT": 0, "PANEL_LOCK": 0, "SR": 0o1000, "ADDR_SELECT": 4, "DATA_SELECT": 2}, time.Now())
	b.Physical(b.Snapshot().Physical, time.Now())
	b.Lamps(map[string]uint64{"RUN": 0})
	for i := 0; i < 3; i++ {
		b.Inputs()
	}
	b.Connect("a")
	if e := b.Grant("a", time.Now()); e != nil {
		t.Fatal(e)
	}
	return b
}
func control(t *testing.T, b *Broker, name string, value uint64, pulse bool) {
	t.Helper()
	s := b.Snapshot()
	if e := b.Control("a", s.Epoch, s.Revision, name, value, pulse); e != nil {
		t.Fatal(e)
	}
}
func TestHaltBeforeStartReleaseEveryTransition(t *testing.T) {
	for _, cause := range []string{"release", "disconnect", "expiry", "physical", "fault"} {
		for polls := 0; polls < 3; polls++ {
			t.Run(cause+string(rune('0'+polls)), func(t *testing.T) {
				b := ready(t)
				control(t, b, "HALT", 0, false)
				control(t, b, "START", 0, true)
				for i := 0; i < polls; i++ {
					b.Inputs()
				}
				switch cause {
				case "release":
					b.Revoke("handoff")
				case "disconnect":
					b.Disconnect("a")
				case "expiry":
					b.Tick(time.Now().Add(Lease))
				case "physical":
					v := b.Snapshot().Physical
					v["SR"]++
					b.Physical(v, time.Now())
				case "fault":
					b.Fault("link failed")
				}
				first := b.Inputs()
				if first["HALT"] != 1 || first["START"] != 1 {
					t.Fatal("HALT must precede pending START release", first)
				}
				for i := 0; i < 4; i++ {
					next := b.Inputs()
					if next["HALT"] != 1 {
						t.Fatal("handoff enabled execution", next)
					}
				}
				if b.Snapshot().Owner != "" {
					t.Fatal("owner retained")
				}
			})
		}
	}
}
func TestPhysicalHandoffAndNoAutomaticRearm(t *testing.T) {
	b := ready(t)
	b.Revoke("handoff")
	for i := 0; i < 3; i++ {
		b.Inputs()
	}
	if e := b.Grant("physical", time.Now()); e != nil {
		t.Fatal(e)
	}
	if b.Inputs()["HALT"] != 1 {
		t.Fatal("grant cleared HALT")
	}
	v := b.Snapshot().Physical
	v["START"] = 1
	b.Physical(v, time.Now())
	if b.Inputs()["HALT"] != 1 {
		t.Fatal("held key bypassed halt")
	}
	b.Fault("physical link lost")
	v["START"] = 0
	b.Physical(v, time.Now())
	for i := 0; i < 5; i++ {
		b.Inputs()
	}
	if e := b.Grant("a", time.Now()); e == nil {
		t.Fatal("fault auto-rearmed")
	}
	b.Physical(v, time.Now())
	b.Revoke("operator rearm")
	for i := 0; i < 3; i++ {
		b.Inputs()
	}
	if e := b.Grant("a", time.Now()); e != nil {
		t.Fatal(e)
	}
}
func TestConflictObserverAndStaleEpoch(t *testing.T) {
	b := ready(t)
	s := b.Snapshot()
	b.Connect("observer")
	if e := b.Grant("observer", time.Now()); e == nil {
		t.Fatal("second owner")
	}
	if e := b.Control("observer", s.Epoch, s.Revision, "CONT", 0, true); e == nil {
		t.Fatal("spectator control")
	}
	control(t, b, "SR", 123, false)
	if e := b.Control("a", s.Epoch, s.Revision, "SR", 124, false); e == nil {
		t.Fatal("stale revision")
	}
	b.Disconnect("observer")
	if b.Snapshot().Owner != "a" {
		t.Fatal("observer revoked owner")
	}
	b.Revoke("handoff")
	for i := 0; i < 3; i++ {
		b.Inputs()
	}
	b.Grant("a", time.Now())
	if e := b.Control("a", s.Epoch, b.Snapshot().Revision, "CONT", 0, true); e == nil {
		t.Fatal("stale epoch")
	}
}

func TestGrantRequiresActualLampBaselineAndNeutralSamples(t *testing.T) {
	b := New()
	physical := map[string]uint64{"POWER": 1, "HALT": 0}
	b.Physical(physical, time.Now())
	for i := 0; i < 4; i++ {
		b.Inputs()
	}
	b.Connect("a")
	if e := b.Grant("a", time.Now()); e == nil {
		t.Fatal("missing output baseline accepted")
	}
	b.Lamps(map[string]uint64{"RUN": 1})
	b.Inputs()
	if e := b.Grant("a", time.Now()); e == nil {
		t.Fatal("running grant")
	}
	b.Lamps(map[string]uint64{"RUN": 0})
	b.Inputs()
	if e := b.Grant("a", time.Now()); e == nil {
		t.Fatal("unstable physical baseline")
	}
	b.Physical(physical, time.Now())
	if e := b.Grant("a", time.Now()); e != nil {
		t.Fatal(e)
	}
}

type fenceFixture struct {
	ready, armed, fail bool
	revokes            int
}

func (f *fenceFixture) Ready() bool { return f.ready && !f.armed && !f.fail }
func (f *fenceFixture) Arm() error {
	if !f.Ready() {
		return fmt.Errorf("inhibited")
	}
	f.armed = true
	return nil
}
func (f *fenceFixture) Revoke() error {
	f.revokes++
	f.armed = false
	if f.fail {
		return fmt.Errorf("unavailable")
	}
	return nil
}
func (f *fenceFixture) Heartbeat() error {
	if f.fail || !f.armed {
		return fmt.Errorf("expired")
	}
	return nil
}
func TestConsumerQuiescenceAndUnavailableAuthority(t *testing.T) {
	b := ready(t)
	f := &fenceFixture{}
	b.authority = f
	b.Revoke("test")
	for i := 0; i < 4; i++ {
		b.Inputs()
	}
	if b.View().Phase == "ready" {
		t.Fatal("lamp HALT mistaken for consumer ack")
	}
	f.ready = true
	b.Inputs()
	if e := b.Grant("a", time.Now()); e != nil {
		t.Fatal(e)
	}
	if !f.armed {
		t.Fatal("grant without authority")
	}
	f.fail = true
	b.Tick(time.Now().Add(110 * time.Millisecond))
	if b.View().Owner != "" || b.View().Phase != "fault" || f.revokes < 2 {
		t.Fatal("authority loss did not fault", b.View())
	}
	f.fail = false
	b.Inputs()
	if e := b.Grant("a", time.Now()); e == nil {
		t.Fatal("automatic recovery")
	}
	b.Revoke("explicit rearm")
	for i := 0; i < 3; i++ {
		b.Inputs()
	}
	if e := b.Grant("a", time.Now()); e != nil {
		t.Fatal(e)
	}
}
func TestExpiredRenewCannotReviveLease(t *testing.T) {
	b := ready(t)
	s := b.View()
	if b.Renew("a", s.Epoch, time.Now().Add(Lease)) == nil {
		t.Fatal("expired renewal revived")
	}
	if b.View().Owner != "" {
		t.Fatal("owner retained")
	}
}
