package modem

import (
	"strings"
	"testing"
)

func exchange(m *Machine, text string) string {
	var reply strings.Builder
	for _, b := range []byte(text) {
		reply.Write(m.Feed(b))
	}
	return reply.String()
}
func TestLocalCommandsAndNoArbitraryDial(t *testing.T) {
	m := new(Machine)
	for _, command := range []string{"AT", "ate0", "ATH"} {
		if got := exchange(m, command+"\r\n"); got != "\r\nOK\r\n" {
			t.Fatal(got)
		}
	}
	for _, command := range []string{"ATDexample.com:23", "ATD127.0.0.1:22", "ATD5551234", "ATDLOCAL;OTHER"} {
		if got := exchange(m, command+"\r"); got != "\r\nNO CARRIER\r\n" || m.Connected() {
			t.Fatal(command, got)
		}
	}
	if got := exchange(m, "ATDLOCAL\r"); got != "\r\nCONNECT\r\n" || !m.Connected() {
		t.Fatal(got)
	}
	if got := exchange(m, "local text\n"); got != "local text\n" {
		t.Fatal(got)
	}
	if new(Machine).Connected() {
		t.Fatal("new session inherited carrier")
	}
}
func TestCommandBoundAndRecovery(t *testing.T) {
	m := new(Machine)
	if got := exchange(m, strings.Repeat("A", 10000)+"\rAT\r"); got != "\r\nERROR\r\n\r\nOK\r\n" {
		t.Fatal(got)
	}
	if got := exchange(m, "AT+UNSUPPORTED\r"); got != "\r\nERROR\r\n" {
		t.Fatal(got)
	}
}

func TestMalformedCommandCannotJoinDialFragments(t *testing.T) {
	m := new(Machine)
	got := exchange(m, "ATD\xffLOCAL\rAT\r")
	if got != "\r\nERROR\r\n\r\nOK\r\n" || m.Connected() {
		t.Fatal(got)
	}
}
