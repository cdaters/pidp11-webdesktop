# Roadmap, resource budget and open questions

2026-11-16. All Pi numbers below are **acceptance targets**, not measurements. The target is the user's Pi 3B+ running Trixie Lite ARM64; this work has not contacted it.

## Performance targets

Budget is incremental cost of the companion service, excluding SIMH, the existing GPIO daemon and the browser on the user's Mac. CPU percentages below use **100% = one fully occupied core**, not the four-core aggregate.

| Measure | Initial target | Workload / method |
|---|---|---|
| Backend idle RSS | ≤24 MiB | Assets cached, no active browser, 5-minute settled sample |
| Backend active RSS | ≤48 MiB; ≤64 MiB peak | Two panel viewers, one terminal, 30-minute sample; measure process RSS and PSS separately |
| Idle backend CPU | <1% of one core | No viewers, no unnecessary redraw publication; required physical mediation still counted |
| Active backend CPU | <5% mean, <10% p95 over one-second samples | Two viewers at 20 Hz and terminal at 10 KiB/s |
| Emulator impact | <3% throughput regression | Same guest workload, configuration and thermals, broker versus original path |
| RPC mediation latency | <5 ms p95 added | Same-host future fixture; separate from browser transport |
| Browser command acknowledgement | <100 ms p95 on LAN | Command accepted/applied revision, not guest instruction completion |
| Browser panel freshness | <100 ms p95 | 20 Hz publication; report actual age, don't extrapolate real lamps |
| Panel network traffic | <40 KiB/s per viewer | Delta/snapshot encoding measured on wire; terminal budget separate |
| Browser core assets | <150 KiB gzip | HTML, CSS, JS and SVG; terminal chunk separate and loaded on demand |
| Browser performance | <50 MiB incremental tab memory; no sustained long tasks | Desktop browser, panel + bounded terminal, 30-minute run |
| Queue bounds | Latest lamp snapshot; ≤256 KiB terminal output per client | Disconnect/backpressure slow readers; never unbounded buffering |

Cap browser publication at 20 Hz, render changed SVG attributes, pause synthetic animation when hidden, and avoid global 60 Hz rerender loops. Physical RPC service timing remains independent of browser refresh. M4's short Mac-hosted Linux measurement reports about 2.2% idle CPU (including mediation), exceeding the <1% target; see [validation](validation.md#m3m4-isolated-realcons-and-coexistence-lab). Keep that target open rather than treating it as passed. Re-evaluate resource targets when actual integration cost is known. A lower idle limit could favor Rust, but comparing language labels is not a benchmark.

Measurement plan after authorization: record exact OS/kernel/toolchain, binary hash, CPU governor/temperature/throttling, guest workload and connection count. Capture `/proc` RSS/PSS, process CPU, queue depths and latency histograms; repeat idle, one/two viewers, terminal burst, slow reader, reconnect and large media upload. Use fixed sample lengths and record raw results. No performance command is to be run on the active Pi during this phase.

## Milestones and exit criteria

| Milestone | Deliverable | Exit criteria |
|---|---|---|
| M0: research and isolated prototype — accepted, preserved | Architecture, language decision, protocol analysis; original SVG panel with simulated activity and controls | Local build/typecheck/model tests; desktop/mobile browser inspection; explicit mock boundary; no Pi traffic |
| M1: wire fixtures — codec baseline delivered | Bounded XDR codec and original C/Java differential fixtures | All used procedures round-trip; both byte extensions; descriptor discrepancies; truncation/oversize/fuzz tests; no network hardware |
| M2: mock Go service — mock panel delivered | Embedded assets, versioned REST/WS, mock state hub, ownership lease and terminal fixture | Cross-built Linux ARM64 binary; bounded queues, slow-reader and disconnect tests; same frontend can use local/remote mocks |
| M3: isolated emulator integration — laboratory baseline passed | Disposable Linux SIMH/REALCONS + virtual panel RPC server | Control parity including START edges; UDP/TCP and rpcbind behavior verified; no production Pi |
| M4: coexistence laboratory — implemented; safety limitation demonstrated | Broker and physical-panel stand-in, ownership/recovery tests | Single physical client; spectators; override and stale state tests; crash rollback and registration plan; decide broker vs daemon hook |
| M4.1: consumer interlock and independent access — laboratory implementation | Optional consumer authority/watchdog, original regression, rollback, separate terminal domains | Finite tests and limits in [M4.1](lab/M4.1.md); no unconditional crash-safe guarantee |
| M4.2: desktop and passive-observation lab — delivered | Complete local workspace, optional nonblocking publisher, lab capability boundaries, bounded-call experiment, longer soaks | [Evidence and limits](lab/M4.2.md); no Pi or production control claim |
| M4.3: offline hardening and historical reconstruction | Photo-calibrated paddle faces, panel scaling/layout, DEC fixtures, publisher identity, TLS/session rotation, operation budgets and 30-minute workloads | [Recorded implementation and limits](lab/M4.3.md); production audit/pilot still requires separate authorization |
| M5: authorized Pi audit and read-only pilot | Reconcile installed source/binaries/services/console configuration after installation work ends | Explicit user authorization; backup/rollback reviewed; no polling assumed side-effect free; incremental benchmarks pass |
| M6: authorized control, terminal and media | Owned controls; real terminal broker; catalog and safe attach/detach | Guest-safe lifecycle, no terminal takeover, image exclusivity, auth/origin checks, end-to-end recovery tests |
| M7: packaging and release | Reproducible builds, service configuration, notices and operator docs | Source/dependency license inventory, measured resource report, target acceptance and separately authorized release |

Current M3/M4 status: original C UDP/TCP and REALCONS tests pass in the network-none Linux lab. Broker tests pass their conditional handoff invariants and reproduce an in-flight START-release counterexample. No unconditional transition/crash fail-safe guarantee exists. M4.1 short measurements still miss the idle CPU target, and its disabled-patch instruction-loop microbenchmark leaves the emulator-impact target open. An optional consumer interlock is now implemented and tested in M4.1; blocked RPC and production hardware/authority questions remain unresolved. See [M4 findings](lab/M4.md).

Earlier M1/M2 status: M1 has C-generated payload/envelope vectors, Java-source-derived byte extension coverage and fuzzed bounded codecs; it still needs an executed Java oracle and full peer schema/transport conformance. M2 has embedded assets, REST/WS, ownership/recovery, browser verification and a static ARM64 cross-build. A deterministic stalled-writer test now covers timeout/revocation; a real terminal fixture and sustained slow-reader/soak coverage remain future work. See [milestone 0.2](backend-milestone.md) and [validation](validation.md).

Completion of the other Codex session does not automatically authorize M5. The complete microSD backup and explicit authorization are required before any production Pi access. No automatic detection, background Pi probing, live endpoint setting, RPC code path or deployment script is included in milestone 0.2.

## Risks and unknowns

| Risk / unknown | Evidence and effect | Resolution |
|---|---|---|
| Installed revision/config unknown | Only public source inspected; official installation may differ | Authorized inventory in M5; use hashes and effective settings |
| Multi-client ownership absent | Global panel state, no lease fields | Explicit broker, one writer, adversarial handoff tests |
| RPC discovery collision | Physical daemon unregisters program 99/version 1 on startup | Separate fixture network boundary; select a tested deployment routing strategy |
| Read callback has side effects | Physical POWER handling invokes restart/shutdown scripts | Preserve semantics deliberately; no casual monitoring poll on active Pi |
| Protocol quirks | Char arrays expand 4×; Java sign extension; descriptor differences | C/Java golden vectors and schema profiles before RPC implementation |
| Polling/edge loss | REALCONS detects edges; START acts on release | Serialize pulses across observed polls; test missed packets and lease expiry |
| Broker failure interrupts physical controls | It sits between REALCONS and hardware daemon | Physical-only rollback; no automatic failover claim without testing |
| Terminal takeover and monitor access | Official stack uses screen and launcher scripts | Determine non-disruptive endpoint; separate guest and privileged monitor capability |
| Device/OS corruption | Abrupt stop or shared writable images can damage guest state | Safe lifecycle, immutable bases/working copies and exclusive mounts |
| Source provenance | Repository includes components with different source notices | Retain the component inventory and original notices; guest media is not bundled |
| Historic panel fidelity | Prototype is an original interpretation, not a calibrated replica | 0.2 now uses DEC handbook/photo and Java/REALCONS evidence; dimensional calibration and full hardware behavior remain out of scope |
| Resource competition | Pi runs simulator and high-rate GPIO work already | Measure overhead under real guest/physical load in M5, not Mac extrapolation |
| Browser compatibility | SVG/keyboard behavior and terminal performance vary | Test Chromium, Firefox and Safari before release; M0 QA records actual browser tested |

See [validation](validation.md) for what was actually verified in this delivery.

## M4.2 risk update and next decisions

The [M4.2 report](lab/M4.2.md) records current measurements separately from historical M4.1 evidence. Passive observation is now implemented on the original path and has no broker/RPC-client dependency. Broker idle CPU still needs work: retain its physical freshness and watchdog timing, profile required RPC work/allocations, and avoid claiming savings from merely changing a language or slowing safety polling. Longer alternating instruction samples reduce the earlier short-benchmark concern but do not establish guest throughput on a Pi.

Recommended next is **M4.3 offline hardening**, with no production authorization implied: validate DEC terminal profiles and byte-stream flow control; define TLS/session provisioning/logout/revocation UX; isolate publisher identity and runtime paths; bound discovery plus recovery as an end-to-end protocol; run 30-minute multi-client workloads and repeated CPU trials. Native Safari and real touch/assistive-technology testing remain desirable. Then report the readiness of an explicitly authorized read-only Pi audit/pilot. Remote control, real media modification, physical POWER/LOCK behavior and guest-safe stop/recovery remain later gates.

## M4.3 risk update and recommended next milestone

The [M4.3 report](lab/M4.3.md) supersedes the earlier recommendation to start M4.3. Continue with an explicitly authorized **installed-system read-only audit**, followed by a separately reviewed observation-only pilot only if compatibility, identity, TLS provisioning and physical-only rollback are established. The [pilot plan](lab/M4.3-pilot.md) has not been executed. Offline improvements can continue independently.

| Remaining risk | M4.3 evidence / gate |
|---|---|
| CPU stop versus lease revoke | Optional shared budgets tested on one UDP consumer; original blocked-RPC and committed-command limits remain. No hard real-time or unconditional fail-safe claim. |
| Observation identity | Kernel UID/PID/start checks; same-UID executable inode verification. Separate-UID `/proc` restrictions and actual service-account lifecycle require production audit. |
| LAN exposure | TLS1.3/WSS, exact origin, secure sessions, rotation/CSRF tested in isolation. LAN certificate/DNS/firewall, connection-level DoS limits and durable audit remain deployment work. |
| Terminal fidelity | Tested VT100/ANSI subset, selected VT220 functions; VT52 disabled. Offline transport contracts do not constitute a guest terminal gateway or login validation. |
| Historical appearance | Primary photograph governs shapes/colors; supplemental IMSAI image informs shading only. Hidden pivot geometry, calibrated pigments and physical switch behavior still need hardware/reference confirmation. |
| Performance | Extended Mac-hosted evidence, allocation benchmarks and unchanged targets. Pi thermal contention, GPIO load and guest throughput remain unmeasured. |
| Native Safari | WebKit passes; native Safari WebDriver unavailable because remote automation is disabled. No settings changed or native-Safari success claimed. |
| Physical-only access | Original-binary rollback and independent DZ lines remain laboratory tests; clean RAM-device reset is fixture initialization, not guest-safe rollback. |

Go remains the backend choice. The existing reused UDP buffer materially reduces allocation volume; language replacement is not justified by these measurements. Preserve required physical sampling and watchdog timing while profiling before further optimization. The companion observer remains optional and outside the original RPC route.
