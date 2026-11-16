# Backend decision: Go versus Rust

2026-11-16 — provisional recommendation: **Go**, with a pure-Go protocol boundary if compatibility tests prove it. Neither a Go nor a Rust backend is implemented or benchmarked in this milestone. Resource estimates below are hypotheses and budgets, not measured language rankings.

| Criterion | Go | Rust | Project consequence |
|---|---|---|---|
| Code complexity | Standard HTTP server, JSON, embedding, goroutines and cancellation make small services straightforward | Explicit ownership plus async/runtime/framework choices add design work; strong types are useful for protocol state | Go likely needs less project-specific plumbing; this is an engineering judgment, not an LOC measurement |
| Memory | GC heap and runtime overhead; allocation rate and live heap affect collection cost | No tracing GC; predictable ownership, but queues, allocators and async tasks still consume memory | Rust has a plausible lower idle footprint; measure equivalent functionality before quantifying it |
| CPU | GC creates some work; bounded queues, reused buffers and modest update rates should suit an I/O-bound service | No GC cycles; efficient codecs possible; excess wakeups and copying still cost CPU | Neither language compensates for polling too fast or unbounded fan-out |
| Cross-compilation | Pure Go: `CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build`; no target C linker for this case | `aarch64-unknown-linux-gnu` is supported; Mac-to-Linux linking needs suitable target linker/sysroot, or a reproducible Linux cross-build | Go is simpler for this Mac-to-Pi workflow; cgo would reduce that advantage |
| RPC compatibility | `net/rpc` is not ONC RPC/XDR; need a reviewed implementation or a narrow codec with fixtures | Likewise need an ONC RPC implementation/crate, reviewed for server support, UDP and TCP | Library availability alone is not proof of interoperability |
| WebSockets | Small reviewed external dependency; HTTP itself is in standard library | Typically runtime plus HTTP/router and WebSocket crates | Pin dependencies and keep the graph small in either language |
| C reuse | cgo with libtirpc/rpcgen, or a separate C helper, is possible | FFI with libtirpc/rpcgen is possible | Reusing original C wire code is a fallback; deployment/linking/licensing costs remain |
| Long-term maintenance | Small code surface and familiar service model, race detector and profiling tools | Strong compile-time ownership checks, larger learning surface for new contributors | Prefer the language future maintainers can review and debug; revisit if team expertise favors Rust |
| Licensing | Go standard library uses BSD-style licensing | Rust is primarily MIT/Apache-2.0 | Actual runtime dependencies and copied source must be audited separately |

Go's collector has explicit CPU/memory tradeoffs and a soft memory limit; `GOMEMLIMIT` is not a total process RSS cap. Start with ordinary defaults and profile before tuning. Use bounded subscriber queues, one shared panel poller, one state owner, capped terminal history and bounded file streaming. A Rust implementation can also leak resources logically by retaining state; ownership does not impose a resource budget. [Go GC guide](https://go.dev/doc/gc-guide), [Rust ownership](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html).

Keep language/toolchain versions pinned at implementation time. Validate `linux/arm64` output with `file` and a disposable Linux ARM64 runner before any hardware rollout. Do not use host-specific CPU optimizations that assume newer ARM features. Rust's standard target is ARMv8-A little-endian; do not confuse a Pi 3B+ ARM64 OS with an ARMv7 build. [Go build targets](https://go.dev/doc/install/source#environment), [Rust ARM64 target](https://doc.rust-lang.org/rustc/platform-support/aarch64-unknown-linux-gnu.html).

## Protocol implementation choice

First build an offline conformance fixture from original `rpcgen` C and Java/RemoteTea output. Audit candidate ONC RPC libraries for bounded decode, UDP XID/retry behavior, TCP record framing, server registration and license. Go `net/rpc` uses its own default codec and does not provide BlinkenBone interoperability. Avoid choosing a dependency based on its name. If a small, well-tested pure-Go codec cannot meet parity cheaply, retain original C protocol code in a narrow helper and compare total deployment cost before reconsidering Rust. No CPU simulation is ported. [Go net/rpc](https://pkg.go.dev/net/rpc), [Go HTTP](https://pkg.go.dev/net/http).

## Licensing findings

BlinkenBone's root license and inspected C/Java panel source headers carry MIT terms. The bundled RemoteTea library has a GNU Library GPL v2 license file; it is not made MIT by the repository root. SIMH and other bundled components require their own notices; the PiDP repository has no root LICENSE in the inspected tree. Protocol interoperability does not require shipping the Java runtime or panel images. Keep original SVG artwork and cite source behavior; do not copy The High Nibble artwork or assume guest disk redistribution rights.

Recommend MIT for newly written project code, pending the owner's release decision; no license is assigned by this proposal. Before distribution generate a dependency/source inventory, retain required notices and resolve guest image/artwork rights. This is a source inventory finding, not a legal opinion. [BlinkenBone license](https://github.com/j-hoppe/BlinkenBone/blob/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/LICENSE), [RemoteTea license](https://github.com/j-hoppe/BlinkenBone/blob/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/3rdparty/remotetea/COPYING.LIB), [Rust licensing](https://github.com/rust-lang/rust#license).

Decision gate: compare stripped release binaries, idle/active RSS, peak RSS, CPU seconds, wakeups and p95 command latency under identical workloads. Rust becomes attractive if Go misses the 48 MiB active RSS ceiling or CPU budget after profiling, or an independently maintained Rust protocol implementation substantially lowers total maintenance cost. Do not build two production backends merely to settle a theoretical speed argument.
