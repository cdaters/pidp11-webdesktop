package terminalbridge

import (
	"net"
	"testing"
)

func TestObservationDistinguishesSameCountReplacement(t *testing.T) {
	endpoint := NewEndpoint(Config{ID: "line"})
	defer endpoint.Close()
	peer, guest := net.Pipe()
	defer guest.Close()
	if err := endpoint.Attach(peer); err != nil {
		t.Fatal(err)
	}
	first, err := endpoint.Subscribe()
	if err != nil {
		t.Fatal(err)
	}
	connected, before, count := endpoint.Observation()
	if !connected || count != 1 {
		t.Fatal("missing viewer")
	}
	endpoint.Unsubscribe(first)
	second, err := endpoint.Subscribe()
	if err != nil {
		t.Fatal(err)
	}
	defer endpoint.Unsubscribe(second)
	connected, after, count := endpoint.Observation()
	if !connected || count != 1 || after <= before {
		t.Fatal("same-count replacement invisible")
	}
	endpoint.Close()
	connected, final, count := endpoint.Observation()
	if connected || count != 0 || final <= after {
		t.Fatal("close did not retire view lifetime")
	}
}
