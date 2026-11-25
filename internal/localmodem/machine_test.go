package localmodem

import (
	"strings"
	"testing"
	"time"
)

func feed(t *testing.T, m *Machine, text string, now time.Time) Action {
	t.Helper()
	var result Action
	for _, b := range []byte(text) {
		a, err := m.Feed(b, now)
		if err != nil {
			t.Fatal(err)
		}
		result.Reply = append(result.Reply, a.Reply...)
		result.Data = append(result.Data, a.Data...)
		result.Dial = result.Dial || a.Dial
		result.Hangup = result.Hangup || a.Hangup
	}
	return result
}
func TestCommandsRequireCRAndOneFixedPeer(t *testing.T) {
	m := New()
	now := time.Unix(100, 0)
	feed(t, m, "ATE0\r", now)
	if got := string(feed(t, m, "AT\n", now).Reply); got != "" {
		t.Fatal(got)
	}
	if got := string(feed(t, m, "\r", now).Reply); got != "\r\nOK\r\n" {
		t.Fatal(got)
	}
	for _, command := range []string{"ATDexample.com", "ATD127.0.0.1:22", "ATD5551212", "ATDLOCAL;OTHER"} {
		if got := feed(t, m, command+"\r", now); got.Dial || string(got.Reply) != "\r\nNO CARRIER\r\n" {
			t.Fatal(command, got)
		}
	}
	if got := feed(t, m, "ATDLOCAL\r", now); !got.Dial || len(got.Reply) != 0 || m.Mode != "dialing" {
		t.Fatal(got)
	}
	if string(m.DialResult(false, now)) != "\r\nNO CARRIER\r\n" || m.Mode != "command" {
		t.Fatal("unavailable peer")
	}
	feed(t, m, "ATE1\r", now)
	if got := string(feed(t, m, "AT\r", now).Reply); got != "AT\r\r\nOK\r\n" {
		t.Fatal(got)
	}
	if got := string(feed(t, m, strings.Repeat("X", 1000)+"\r", now).Reply); !strings.HasSuffix(got, "\r\nERROR\r\n") {
		t.Fatal("overflow")
	}
	if m.used != 0 || m.discard {
		t.Fatal("overflow did not reset")
	}
}
func TestGuardedEscapeAndHangup(t *testing.T) {
	m := New()
	now := time.Unix(100, 0)
	feed(t, m, "ATE0\rATDLOCAL\r", now)
	m.DialResult(true, now)
	if got := string(feed(t, m, "a+++b\n", now.Add(time.Millisecond)).Data); got != "a+++b\n" || m.Mode != "data" {
		t.Fatal(got)
	}
	if got := feed(t, m, "+++", now.Add(2*time.Second)); len(got.Data) != 0 {
		t.Fatal(got)
	}
	if got, err := m.Tick(now.Add(2500 * time.Millisecond)); err != nil || len(got.Reply) != 0 || m.Mode != "data" {
		t.Fatal("early escape")
	}
	if got, err := m.Tick(now.Add(3 * time.Second)); err != nil || string(got.Reply) != "\r\nOK\r\n" || m.Mode != "command" {
		t.Fatal(got, err)
	}
	if got := feed(t, m, "ATH\r", now.Add(4*time.Second)); !got.Hangup || string(got.Reply) != "\r\nOK\r\n" {
		t.Fatal(got)
	}
	if got := feed(t, m, "ATDLOCAL\r", now.Add(5*time.Second)); !got.Dial {
		t.Fatal("cannot explicitly redial")
	}
	m.DialResult(true, now.Add(5*time.Second))
	if string(m.LostPeer()) != "\r\nNO CARRIER\r\n" || m.Mode != "command" {
		t.Fatal("lost peer")
	}
	if len(m.LostPeer()) != 0 {
		t.Fatal("repeated carrier loss")
	}
}
func TestFailedGuardAndDataBounds(t *testing.T) {
	now := time.Unix(100, 0)
	m := New()
	feed(t, m, "ATE0\rATDLOCAL\r", now)
	m.DialResult(true, now)
	feed(t, m, "+++", now.Add(2*time.Second))
	if got := string(feed(t, m, "x\n", now.Add(2500*time.Millisecond)).Data); got != "+++x\n" {
		t.Fatal(got)
	}
	feed(t, m, "++", now.Add(4*time.Second))
	a, err := m.Tick(now.Add(5 * time.Second))
	if err != nil || string(a.Data) != "++" {
		t.Fatal(a, err)
	}
	feed(t, m, "\n", now.Add(5*time.Second))
	feed(t, m, strings.Repeat("x", LineLimit), now.Add(5*time.Second))
	if _, err := m.Feed('x', now.Add(5*time.Second)); err == nil {
		t.Fatal("unbounded line")
	}
	if _, err := New().Feed(128, now); err == nil {
		t.Fatal("high bit accepted")
	}
}
func TestArrivalAfterPostGuardCommitsEscapeBeforeCommand(t *testing.T) {
	now := time.Unix(100, 0)
	m := New()
	feed(t, m, "ATE0\rATDLOCAL\r", now)
	m.DialResult(true, now)
	feed(t, m, "+++", now.Add(2*time.Second))
	if got := feed(t, m, "ATH\r", now.Add(4*time.Second)); !got.Hangup || string(got.Reply) != "\r\nOK\r\n\r\nOK\r\n" {
		t.Fatal(got)
	}
}
