package terminalbridge

import (
	"fmt"
	"net"
	"testing"
)

// BenchmarkFanout measures ordered 1KiB serial output with renderer credit returned
// by every viewer. It includes net.Pipe scheduling but excludes TLS and browser UI.
func BenchmarkFanout(b *testing.B) {
	for _, viewers := range []int{1, 4, 8} {
		b.Run(fmt.Sprintf("viewers-%d", viewers), func(b *testing.B) {
			e := NewEndpoint(Config{ID: "bench"})
			a, peer := net.Pipe()
			defer peer.Close()
			defer e.Close()
			if err := e.Attach(a); err != nil {
				b.Fatal(err)
			}
			clients := make([]*Client, viewers)
			for i := range clients {
				clients[i], _ = e.Subscribe()
				<-clients[i].out
			}
			data := make([]byte, 1024)
			b.SetBytes(int64(len(data) * viewers))
			b.ReportAllocs()
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				if _, err := peer.Write(data); err != nil {
					b.Fatal(err)
				}
				for _, c := range clients {
					f := <-c.out
					if len(f.Data) != 1024 {
						b.Fatal("output order")
					}
					if err := e.Operation(c, "ack", 0, 0, nil, 1024); err != nil {
						b.Fatal(err)
					}
				}
			}
		})
	}
}
