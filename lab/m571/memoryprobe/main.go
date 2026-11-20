// memoryprobe is a bounded allocation fixture for the isolated ARM64 Linux lab.
// It never contacts a guest, network endpoint or GPIO device.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"runtime"
	"runtime/debug"
	"time"
)

func main() {
	size := flag.Int("mib", 112, "retained allocation (1–128 MiB)")
	flag.Parse()
	if os.Getenv("PIDP11_ISOLATED_LAB") != "1" || runtime.GOOS != "linux" || runtime.GOARCH != "arm64" || *size < 1 || *size > 128 {
		fmt.Fprintln(os.Stderr, "isolated ARM64 Linux and bounded allocation required")
		os.Exit(1)
	}
	// Touch every page so virtual reservations cannot masquerade as resident data.
	blocks := make([][]byte, 0, *size)
	for i := 0; i < *size; i++ {
		b := make([]byte, 1024*1024)
		for j := 0; j < len(b); j += 4096 {
			b[j] = byte(i + 1)
		}
		blocks = append(blocks, b)
		time.Sleep(5 * time.Millisecond)
	}
	runtime.GC()
	var stats runtime.MemStats
	runtime.ReadMemStats(&stats)
	// The harness rejects missing/incomplete JSON if the output pipe closes.
	_ = json.NewEncoder(os.Stdout).Encode(map[string]any{"retained_mib": *size, "heap_alloc": stats.HeapAlloc, "runtime_managed_bytes": stats.Sys - stats.HeapReleased, "go_soft_limit": debug.SetMemoryLimit(-1)})
	runtime.KeepAlive(blocks)
}
