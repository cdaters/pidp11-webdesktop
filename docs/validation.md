# Validation record

For current work, see [M4.3 findings and validation](lab/M4.3.md). M3/M4/M4.1/M4.2 and the sections below remain historical records. The [milestone 0.2 section](#milestone-02-mock-backend) remains its historical acceptance record. The first section is the historical M0 record; its unimplemented items describe that checkpoint only.

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


## M3/M4: isolated REALCONS and coexistence lab

2026-11-16 local Mac / 2026-11-17 UTC laboratory timestamps. No Raspberry Pi access. The local OrbStack Linux ARM64 runtime ran a network-none disposable container with a read-only root, no published ports, no GPIO/device mounts, 512 MiB memory limit and two-CPU quota. The Go lab executable independently refuses non-Linux or non-loopback-only environments. Source hashes were checked inside the image on the final run.

### Completed checks

- `npm run check`, `npm test`: passed; **12** TypeScript tests, including authoritative REALCONS DATA output for every selector.
- `npm run test:integration`: reconnect fixture passed; no pending-write replay or implicit ownership reacquisition.
- `go test -race ./...`: all packages passed. New broker tests cover cancellation at each asserted START stage for release, disconnect, expiry, physical movement and fault; stale/conflicting owners; persistent faults; missing lamp baseline and insufficient neutral samples. New transport tests cover UDP/TCP, duplicate/colliding XIDs, exclusive consumer, RPC failure replies, fragmented TCP and schema/profile mismatch.
- RPC dispatcher fuzz run: **1,422,294 executions** in ten seconds with two workers; no crash. This complements the existing bounded-XDR fuzz corpus, not semantic certification of all arbitrary input.
- Full `sh lab/run.sh`: passed M3 followed by M4 against the original C implementation. The original generated client uses actual rpcbind discovery for UDP and TCP. Original REALCONS uses its unchanged UDP client.
- Registration collision probe refused a competing port and retained existing TCP/UDP registrations. The simulated physical daemon uses an explicit unregistered port; simultaneous original-daemon rpcbind behavior is not reproduced as a production deployment.
- M3 asserted actual memory contents, CPU PC changes, reset/run/stop edges, selector output behavior and MMU-disabled mapping lamps. Original source files remain unchanged; the documented PTY ioctl shim is necessary for this kernel.
- M4 exercised two real WebSocket sessions through the existing transport, physical lamp forwarding, distinct physical/effective SR values, explicit handoffs, held-switch rejection, missed physical edges, delayed consumer polls, browser loss, lease expiry, physical RPC loss, broker kill and fresh restart baseline.
- **Known-failure regression passed:** a held pre-revocation START-release response causes REALCONS to issue RUN before the following HALT. This is evidence that unconditional cancellation safety is **not achieved**, not an assertion that the race is safe.

Source/runtime provenance: [environment](lab/environment.json), [build metadata](lab/build-metadata.json), [source manifest](../lab/source-manifest.json). Actual results: [M3 transcript](lab/m3-simh.log), [M3 final state](lab/m3-state.json), [M4 transcript](lab/m4-simh.log), [M4 frame trace](lab/m4-trace.json), [M4 assertions/measurements](lab/m4-report.json). Transcript CR/trailing whitespace is normalized for Git; the raw captures remain in the ignored local results directory. Build metadata records the pre-commit source head and dirty tree because measurement preceded the final checkpoint; binary hashes identify the exact measured executables.

### Linux ARM64 laboratory measurements

Broker process only; excludes original SIMH, physical stand-in, driver processes and browser rendering. Idle includes ongoing REALCONS and physical RPC polling. Active: two browser-protocol sessions and 300 SR updates at 20 Hz, with emulated CPU halted. Samples are five/fifteen seconds, below the 35-second duplicate-cache lifetime and far shorter than a steady-state soak.

| Measure | Idle | Active |
|---|---:|---:|
| Mean RSS | 10.74 MiB | 11.57 MiB |
| Peak sampled RSS | 10.86 MiB | 11.77 MiB |
| Peak sampled PSS | 8.91 MiB | 9.84 MiB |
| CPU, 100%=one core | 2.20% | 3.27% |

Active p95 acknowledgment time including local driver IPC: **1.388 ms**. No browser-paint, guest-instruction-completion or LAN latency measurement is claimed. Cache expiry scans are periodic and unchanged lamp banks are no longer forwarded every physical poll.

The **idle CPU result exceeds the proposed <1% target**, even in this Mac-hosted lab. Active CPU/memory and acknowledgment results are below their numeric budgets for this short workload, but Pi acceptance remains unmeasured. Emulator slowdown, 30-minute memory behavior, full running-lamp traffic, terminal load and on-wire traffic accounting remain outstanding.

### Safety and validation limits

[The M4 report](lab/M4.md) states the conditional handoff invariant and the counterexample. No broker-only guarantee can retract an in-flight reply or queued SIMH command. On broker crash, an independent PTY stop was not acknowledged within the recorded 1.5-second observation; no hard stop deadline or automatic physical fallback is proven. A fresh broker starts unowned/halted but does not restore prior ownership or prove consumer reconnection. A consumer-side interlock/watchdog requires a new laboratory design before production control should be considered.

The WebSocket peers here are automated protocol drivers, not a browser rendering the isolated Linux page. No new cross-browser visual or accessibility claim is made. Java runtime interoperability, physical POWER/LOCK scripts, GPIO, actual media/OS operation and any Pi deployment remain untested. The normal Mac mock and its preserved checkpoint remain available. Lab containers and child processes were removed after the successful run; the reusable local development image remains cached.

Final static Linux ARM64 artifacts: mock desktop 6,095,010 bytes; lab executable 6,160,546 bytes. The mock binary dependency graph includes only the panel/server/web project packages, with no broker or RPC transport linked. Current browser core totals 14,707 gzip bytes across HTML/JS/CSS.

## M4.1 consumer interlock and independent access

The complete `lab/verify-m41.sh` sequence passed: original M3/M4 (including the preserved unsafe START-release oracle), patched-but-disabled M3, fenced M4.1 fault injection, browserless original-route rollback and two independent original DZ11 transports. The C compatibility module passed ASan/UBSan unit checks; Linux Unix-packet protocol tests and all Go race tests passed. TypeScript check/build, 12 model tests and one reconnect test passed. A bounded 10-second RPC fuzz run completed 6,018,470 executions without a crash.

M4.1 reports about 11.20 MiB active broker RSS, 3.33% active and 2.40% idle one-core CPU, and 1.14 ms p95 driver-inclusive acknowledgment latency. Idle CPU still misses the <1% target. A small disabled-patch CPU loop test was 4.84% slower by median wall time; the <3% emulator impact target remains open. The responsive watchdog stopped managed execution in about 351.59 ms in one test. With a lost RPC response it revoked authority but did not acknowledge quiescence. These observations do not establish a hard stop deadline, Pi performance, real serial/Screen/SSH access, guest login support, or physical GPIO safety.

Full evidence, scope and reproducible commands: [M4.1 report](lab/M4.1.md). Original M3/M4 artifacts above remain historical records, not replaced by these reruns.


## M4.2 desktop and passive observation

See [M4.2 report](lab/M4.2.md), [raw evidence](lab/m42/), [frontend architecture](frontend-m42.md), [observation/security contract](lab/M4.2-observation.md) and [screenshots](screenshots/m42-desktop.png). This milestone adds 17 Node tests plus the transport fixture, passing Go race tests, 21 three-engine browser cases, bounded observation fuzzing, original C/M4/M4.1 reruns, and five-minute observer/terminal workloads. Direct standalone `file://` and embedded Go artifacts are exercised. Native Safari was unavailable because the Mac was locked; WebKit tests are recorded separately. No Pi access or production claims are made.


## M4.3 historical controls and offline hardening

See the [technical report](lab/M4.3.md), [performance measurements](lab/M4.3-performance.md), [terminal matrix](lab/M4.3-terminals.md), [security contract](lab/M4.3-security.md) and [recovery limits](lab/M4.3-recovery.md). Evidence is archived separately under [m43](lab/m43/); earlier milestone records are unchanged.

Final checks include Go race tests; 41 TypeScript tests and the transport integration fixture; 30 Chromium/Firefox/WebKit cases; nine additional final embedded/standalone artifact checks; bounded XDR/RPC/observation fuzzing; original M3/M4 and all 19 M4.1 cases; TLS, identity and credential-rotation tests; aggregate RPC deadline and held-callback fault tests. The primary observer workload exceeds 30 minutes. Browser workloads, including an initial failed DOM-budget check and the subsequent baseline investigation, are reported explicitly rather than hidden. Native Safari remained unavailable.

Reproduce ordinary checks with `go test -race ./...`, `npm run check`, `npm test`, `npm run test:integration`, `sh scripts/build.sh`, and `npm run test:browser` with the documented loopback services running. The isolated Linux runners are `lab/verify-m41.sh`, `lab/run-budget.sh`, `lab/run-m43-extra.sh`, and `lab/run-m43.sh`; they require the local laboratory images and must retain their network-none restrictions. The complementary browser workload is `node scripts/m43-browser-soak.mjs`; `node scripts/m43-browser-retention.mjs` checks repeated final-artifact disposal, and `node scripts/m43-browser-plateau.mjs` separately measures cold growth and accelerated steady-state retention. Full invocation and scope details are in the reports and runner sources. No Pi access or production performance claim is made.
