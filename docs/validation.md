# Validation record

For the current mock backend delivery, see [milestone 0.2 below](#milestone-02-mock-backend). The first section is the historical M0 record; its unimplemented items describe that checkpoint only.

Date: 2026-11-16. Environment: local Mac; Node v26.9.0, npm 11.19.1. Locked development dependencies: TypeScript 7.0.2, Vite 8.3.8, @types/node 26.6.6. No production npm dependencies.

## Completed

- `npm run check`: passed strict TypeScript checking.
- `npm test`: all **7** Node test cases passed. Covers deterministic activity; halt/single step; all 22 switches; invalid bit/register inputs; word-aligned load; deposit/examine isolation; address wraparound and data truncation; lamp-test state; reset; immutable snapshots and unsubscribe; selector validation and START/HALT interaction.
- `npm run build`: passed production bundling and self-contained HTML packaging.
- Development page returned HTTP 200 over `127.0.0.1`.
- Built `prototype.html` tested in the Codex in-app browser via the loopback-only production preview server. Memory workflow yielded ADDRESS `00001000`, DATA `012345`; zero captured browser warning/error logs after that production workflow.
- Browser keyboard Space toggled high bit 21 and low bit 0 and updated ARIA checked state. Lamp test illuminated all 48 rendered lamps. Invalid octal `999` produced a validation message. BUS REGISTER selector displayed the low 16 bits of SR.
- Demo console `status` reflected the same panel address/data and scratch word count. Library profile button displayed its planning notes.
- Desktop layout inspected at 1440 × 1100 and mobile at 390 × 844. Mobile page width equaled viewport width (390 px); only the intended SVG scroller overflowed (760 px content, 356 px viewport). [Desktop screenshot](screenshots/panel-desktop.jpg), [mobile screenshot](screenshots/panel-mobile.jpg).
- The first dev browser check found injected CSS blocked by CSP. Fixed by linking the stylesheet directly. Production standalone CSS and script use content hashes; no `unsafe-inline` policy is required.
- npm dependency audit during install reported zero known vulnerabilities. This is a point-in-time registry result, not a security certification.

## Artifact sizes

Measured from the final build with Python gzip defaults; compression tools/settings may vary slightly.

| Artifact | Bytes | Gzip bytes |
|---|---:|---:|
| Main JS | 19,823 | 7,438 |
| CSS | 12,107 | 3,590 |
| Multi-file index HTML | 962 | 570 |
| Total multi-file core | 32,892 | 11,598 |
| Standalone `prototype.html` | 32,881 | 11,361 |

The standalone file inlines the same built JS/CSS and prohibits connections through CSP. This verifies core asset size well below the proposed 150 KiB gzip budget. It does not measure Pi RSS, CPU, RPC latency, physical panel freshness or emulator overhead.

## Not verified / not implemented

- Direct `file:` opening: blocked by the browser tool's URL policy; no bypass attempted. The built artifact itself was tested through HTTP.
- Firefox/Safari compatibility and assistive-technology testing beyond observable keyboard/ARIA behavior.
- Long-running browser memory/CPU profiling or reduced-motion/hidden-tab behavior under automated lifecycle tests; those behaviors are implemented but not benchmarked.
- Go/Rust backend binaries or comparative memory/CPU benchmarks.
- Wire interoperability, RPC malformed-input tests, physical/virtual arbitration or crash failover.
- A real interactive terminal, Telnet negotiation, PTY integration, media attachment or OS boot/shutdown.
- Anything on the Raspberry Pi. No SSH, network discovery, RPC access, installation, reboot or production changes were performed.

Both local preview processes were stopped after verification. Reopen with the commands in the README. Screenshots capture this prototype's real rendered UI, not the physical Pi or the upstream Java application.


## Milestone 0.2: mock backend

Date: 2026-11-16. Mac Apple M4 Pro, macOS 27 ARM64, Go 1.26.0, Node 26.9.0. No Pi access or emulator/GPIO process was involved. The original M0 record above and its screenshots remain historical checkpoint evidence.

### Automated checks actually completed

| Check | Result / scope |
|---|---|
| `npm run check` | Passed strict TypeScript check, including reconnect fixture source |
| `npm test` | 11 passing tests: local model, selector ordinals, desired latch levels/pulses, stale state suppression, historic ENABLE/START/memory behavior |
| `npm run test:integration` | One passing deterministic browser-transport fixture: pending write discarded on disconnect, new spectator session, no replay, revision baseline reset on new hello |
| `go test -race ./...` | Passed: 4 codec, 8 domain, 4 HTTP/WebSocket top-level tests, plus their table/subtests; no detected data races |
| Repeated server tests | `go test -race ./internal/server -count=5` passed after correcting the flood test's TCP-notification assumption |
| C oracle regeneration | 15 committed vectors reproduced byte-for-byte (14 original-C generated, 1 Java-source-derived); provenance file also unchanged |
| Decoder fuzzing | Latest 10-second run, two workers: **1,798,317 executions**, no crash; exercises all payload decoders, calls, replies and TCP record framing |
| Build | `sh scripts/build.sh` passed; embeds compiled assets and builds native Mac plus Linux ARM64 with CGO disabled |
| Binary inspection | Linux binary identified as stripped, statically linked ARM64 ELF; cross-build only, not executed on target |
| Go microbenchmarks | Codec, state poll/snapshot and real-WebSocket command round trip ran successfully with allocation reporting; diagnostic Mac loops, not Pi acceptance |

Malformed codec tests include byte-vector extension errors, huge counts, truncated fields/records, trailing bytes, invalid call headers, unknown procedures, wrong reply XID, fragmented/empty-fragment framing, duplicate descriptors, invalid widths and unused high bits. Current golden fixtures do not independently cover every possible field/value/procedure path; fuzzing is crash/bounds evidence, not semantic certification.

Domain tests include two-owner conflict, spectator rejection, stale epoch/revision, exact duplicate versus reused ID, lamp revision independence, overlapping pulses, viewer limits, START cancel on release/disconnect/expiry/interlock, priority HALT, persistent interlocks and memory-sequence reset on handoff. Interlocks are fixture inputs, not physical hardware.

Real loopback WebSocket tests cover shared state across two connections, reconnect with a fresh session, stale write rejection, origin/Host restrictions, unknown JSON fields, negative unsigned inputs, trailing JSON, oversized messages, request flooding and a stalled output connection. The latter wraps the server connection to block writes after a successful handshake; the one-second write deadline closes it, revokes ownership and allows another viewer to acquire. This is deterministic backpressure fault injection, not a long-duration network soak.

An early flood assertion intermittently failed because it required immediate client-visible EOF/reset while deliberately leaving replies unread. A timed diagnostic showed the server handler had already exited. The corrected test verifies server-side eviction and successful replacement ownership; it does not claim a bound on OS TCP close notification. Client stale-stream and acknowledgment timeouts remain necessary.

### Browser checks actually completed

Codex in-app browser, locally served **embedded production assets**. Two viewers saw identical SR/address/data state; competing ownership was disabled/rejected. Owner closed while running; surviving viewer observed HALT and could explicitly acquire. Restarting the mock executable disabled controls, then automatically reconnected the page as a spectator with a fresh initial snapshot and no command replay.

Verified HALT→ENABLE stays stopped until CONT, LOAD/DEP memory workflow, Space toggling bit 21 and ARIA state, and the revised status/label layout. Final screen shows address `00001000`, data `012345`, SR `00012345`. No warning/error logs were captured in the final fresh-page workflow. Deliberate earlier disconnect/restart can naturally produce network errors and is not included in that clean-console claim.

Desktop screenshot uses the browser's normal 1280-pixel viewport with full-page capture. Mobile checked at 390 × 844: document width 390 px; only intended panel scroller overflows, with 960 px content in a 356 px container. Temporary viewport override was reset. All owned preview processes and test tabs were closed.

[Current desktop screenshot](screenshots/panel-mock-desktop.jpg) · [Current mobile screenshot](screenshots/panel-mock-mobile.jpg)

### Short Mac measurements

Raw data and exact binary hashes: [performance-mac.json](performance-mac.json). Final capture ran after automated tests completed, with the browser preview server stopped. `scripts/measure-mac.py` samples process RSS/CPU via macOS `ps`; CPU uses elapsed process CPU time divided by wall time, **100% = one fully occupied core**. Sampling is approximately every 200 ms; no PSS or browser memory measurement was made.

| Measure | Observed Mac value |
|---|---:|
| Idle sample duration | 10.06 s |
| Idle mean / peak RSS | 10.62 / 10.62 MiB |
| Idle CPU, one core | 0.398% |
| Active sample duration | 15.28 s |
| Active mean / peak RSS | 12.87 / 14.02 MiB |
| Active CPU, one core | 1.767% |
| Control RTT p50 / p95 / maximum | 0.320 / 0.473 / 1.401 ms |
| Received JSON payload total, both viewers | 24.92 KiB/s |
| Linux ARM64 / native Mac executable | 6,095,010 / 6,187,938 bytes |
| Core HTML + JS + CSS | 42,347 bytes; 14,424 bytes gzip, summed per file |
| Current standalone prototype | 42,336 bytes |

Active workload: two simulated-panel viewers, 300 accepted SR updates at 20 Hz for approximately 15 seconds, one lease owner, running simulated lamps. Payload volume includes acknowledgments, full snapshots and heartbeats to both clients, but excludes WebSocket/TCP/IP overhead; it is not an on-wire packet capture. RTT ends at receipt of server acknowledgment, not browser paint or guest instruction completion. Binary hashes describe the measured build; rebuilding with different Git metadata/toolchains may change them.

The samples are encouraging for the selected Go implementation, but too short to establish sustained CPU distribution, absence of leaks or target acceptance. The [Pi budgets and 30-minute workload](roadmap.md#performance-targets) remain unmeasured targets. No Rust equivalent has been benchmarked.

### Remaining validation limits

No executed JVM oracle, complete original peer transport interoperability, UDP retry/rpcbind integration, real REALCONS edge sequence, physical latch reconciliation, broker crash failover, real terminal, device/OS operation, or Pi resource measurement. No Firefox/Safari, screen-reader validation, browser memory/paint latency profile or long-duration slow-client/maximum-viewer soak. The partial original protocol and differences in mock/hardware behavior are documented in [backend scope](backend-milestone.md) and [broker safety](broker-safety.md).
