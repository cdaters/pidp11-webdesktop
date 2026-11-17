package labrpc

import (
	"context"
	bb "pidp11.local/webdesktop/internal/blinkenbone"
	"testing"
)

// Whole UDP round trip, including server allocations. Host benchmark, not Pi.
func BenchmarkPhysicalRead(b *testing.B) {
	for _, allocate := range []bool{false, true} {
		name := "reuse"
		if allocate {
			name = "prior-allocation"
		}
		b.Run(name, func(b *testing.B) { benchPhysicalRead(b, allocate) })
	}
}
func benchPhysicalRead(b *testing.B, allocate bool) {
	server, err := Listen("127.0.0.1:0", NewPanel())
	if err != nil {
		b.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go server.Serve(ctx)
	client, err := Dial("udp", server.Address())
	if err != nil {
		b.Fatal(err)
	}
	defer client.Close()
	if err = client.Discover(); err != nil {
		b.Fatal(err)
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// This synthetic run exceeds the real 50Hz/35s cache workload. Reset fixture
		// cache outside timing rather than weakening production replay bounds.
		if i%1000 == 0 {
			b.StopTimer()
			server.mu.Lock()
			clear(server.cache)
			server.mu.Unlock()
			b.StartTimer()
		}
		if allocate {
			client.buffer = make([]byte, bb.MaxMessage)
		}
		if _, err = client.Read(); err != nil {
			b.Fatal(err)
		}
	}
}
