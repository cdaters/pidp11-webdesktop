package main

import (
	"net"
	"testing"
	"time"
)

func TestConnectionLimitAndSlotRecovery(t *testing.T) {
	raw, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer raw.Close()
	listener := &boundedListener{Listener: raw, slots: make(chan struct{}, 1)}
	first, err := net.Dial("tcp", raw.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer first.Close()
	accepted, err := listener.Accept()
	if err != nil {
		t.Fatal(err)
	}
	next := make(chan net.Conn, 1)
	go func() {
		c, e := listener.Accept()
		if e == nil {
			next <- c
		}
	}()
	excess, err := net.Dial("tcp", raw.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer excess.Close()
	excess.SetReadDeadline(time.Now().Add(time.Second))
	b := make([]byte, 1)
	if _, err := excess.Read(b); err == nil {
		t.Fatal("excess connection stayed active")
	} else if timeout, ok := err.(net.Error); ok && timeout.Timeout() {
		t.Fatal("excess connection was not promptly refused")
	}
	accepted.Close()
	accepted.Close()
	third, err := net.Dial("tcp", raw.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer third.Close()
	select {
	case c := <-next:
		c.Close()
	case <-time.After(time.Second):
		t.Fatal("slot did not recover")
	}
}
