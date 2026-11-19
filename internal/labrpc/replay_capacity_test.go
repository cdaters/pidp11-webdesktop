package labrpc

import (
	"bytes"
	"context"
	"encoding/binary"
	"net"
	"testing"
	"time"

	bb "pidp11.local/webdesktop/internal/blinkenbone"
)

func replayFixture(t *testing.T, capacity int) (*Server, *Panel, func([]byte) []byte) {
	t.Helper()
	panel := NewPanel()
	server, err := ListenWithReplayCapacity("127.0.0.1:0", panel, capacity)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { server.Serve(ctx); close(done) }()
	t.Cleanup(func() {
		cancel()
		select {
		case <-done:
		case <-time.After(time.Second):
			t.Error("replay fixture did not stop")
		}
	})
	peer, err := net.Dial("udp", server.Address())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { peer.Close() })
	exchange := func(request []byte) []byte {
		t.Helper()
		peer.SetDeadline(time.Now().Add(2 * time.Second))
		if _, err := peer.Write(request); err != nil {
			t.Fatal(err)
		}
		reply := make([]byte, bb.MaxMessage)
		n, err := peer.Read(reply)
		if err != nil {
			t.Fatal(err)
		}
		return reply[:n]
	}
	return server, panel, exchange
}

func inputRequest(t *testing.T, xid uint32) []byte {
	t.Helper()
	request, err := bb.EncodeCall(bb.Call{XID: xid, Procedure: 5})
	if err != nil {
		t.Fatal(err)
	}
	return request
}

func TestReplayCapacityPreservesDuplicatesAndExpiredAccounting(t *testing.T) {
	server, panel, exchange := replayFixture(t, 2)
	first := exchange(inputRequest(t, 1))
	exchange(inputRequest(t, 2))
	if status := binary.BigEndian.Uint32(exchange(inputRequest(t, 3))[20:]); status != 5 {
		t.Fatal("full cache must reject before dispatch", status)
	}
	if !bytes.Equal(first, exchange(inputRequest(t, 1))) {
		t.Fatal("full cache lost original duplicate reply")
	}
	_, _, gets, _ := panel.Snapshot()
	if gets != 2 {
		t.Fatal("duplicate or rejected request consumed an input read", gets)
	}
	// Expire records deterministically; do not shorten the production window or
	// wait 35 seconds in a unit test. Reused XIDs must not leak byte accounting.
	server.mu.Lock()
	for key, record := range server.cache {
		record.at = time.Now().Add(-replayWindow)
		server.cache[key] = record
	}
	server.mu.Unlock()
	if status := binary.BigEndian.Uint32(exchange(inputRequest(t, 1))[20:]); status != 0 {
		t.Fatal("expired cache did not recover", status)
	}
	server.mu.Lock()
	defer server.mu.Unlock()
	actual := 0
	for _, record := range server.cache {
		actual += len(record.request) + len(record.reply)
	}
	if actual != server.cacheBytes || len(server.cache) != 1 {
		t.Fatal("expired-entry accounting mismatch", actual, server.cacheBytes, len(server.cache))
	}
}

func TestFastPanelReplayCapacityBeyondOriginalLimit(t *testing.T) {
	_, panel, exchange := replayFixture(t, 65536)
	for xid := uint32(1); xid <= 4100; xid++ {
		if status := binary.BigEndian.Uint32(exchange(inputRequest(t, xid))[20:]); status != 0 {
			t.Fatal("fast panel cache rejected valid workload", xid, status)
		}
	}
	exchange(inputRequest(t, 1))
	_, _, gets, _ := panel.Snapshot()
	if gets != 4100 {
		t.Fatal("replay advanced input state", gets)
	}
}

func TestReplayPayloadByteBound(t *testing.T) {
	server, _, exchange := replayFixture(t, 65536)
	// Valid RPC envelope with excess procedure data: rejected by the decoder,
	// but duplicates still need a bounded cached error reply.
	request := append(inputRequest(t, 1), make([]byte, 8000)...)
	var first []byte
	full := false
	for xid := uint32(1); xid <= 2200; xid++ {
		binary.BigEndian.PutUint32(request, xid)
		reply := exchange(request)
		if xid == 1 {
			first = reply
		}
		if binary.BigEndian.Uint32(reply[20:]) == 5 {
			full = true
			break
		}
	}
	if !full {
		t.Fatal("large packets exceeded payload budget")
	}
	binary.BigEndian.PutUint32(request, 1)
	if !bytes.Equal(first, exchange(request)) {
		t.Fatal("byte pressure evicted an unexpired duplicate")
	}
	server.mu.Lock()
	defer server.mu.Unlock()
	if server.cacheBytes > replayByteLimit || len(server.cache) >= server.cacheCapacity {
		t.Fatal("byte bound not independent of entry bound", server.cacheBytes, len(server.cache))
	}
}

func TestReplayCapacityConfigurationBounds(t *testing.T) {
	for _, capacity := range []int{-1, 0, 65537} {
		if server, err := ListenWithReplayCapacity("127.0.0.1:0", NewPanel(), capacity); err == nil {
			server.Close()
			t.Fatal("invalid capacity accepted", capacity)
		}
	}
	server, err := Listen("127.0.0.1:0", NewPanel())
	if err != nil {
		t.Fatal(err)
	}
	defer server.Close()
	if server.cacheCapacity != 4096 {
		t.Fatal("default fixture capacity changed")
	}
}
