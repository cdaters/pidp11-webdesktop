# Roadmap, resource budget and open questions

Originally recorded 2026-11-16; M5.5 update 2026-11-19. The table below contains **acceptance targets**, not measurements. M5.3 subsequently recorded short standalone Pi measurements; M5.4 is Mac-only preparation. Historical milestone sections retain their original scope; the latest status is at the end.

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


## M5.0 guest-terminal milestone — 2026-11-18

[M5.0](lab/M5.0.md) delivers real browser interaction with UNIX V7 under original SIMH/REALCONS, using dedicated DC11 lines and independent keyboard leases. All three automated browser engines pass the genuine demonstration, including bridge interruption and conventional-console continuity. The [runbook](lab/M5.0-runbook.md) repeats it from a fresh public-image copy. The normal service, panel and peripherals retain their simulated behavior.

The next decision is a separately reviewed **terminal-only integration proposal**: guest/line inventory, endpoint identity, user authentication and certificates, coexistence with conventional and future physical serial terminals, guest-safe lifecycle and authorized Pi resource measurement. No installation is authorized by this milestone. Keep remote panel-control, real-media and distribution-switcher work behind their own gates. Product Modes A/B/C are assessed in the report and are distinct from earlier broker-mode labels.

M5.0's short Mac-hosted Linux bridge samples are approximately 10.7–12.5 MiB RSS and 0.1–0.9% of one core; these are neither Pi measurements nor a long-duration soak. Preserve the target table above. Add a terminal-only target of <100 ms p95 added transport latency, measured separately from guest response time under an authorized LAN workload. The observed short full-command times include browser automation, forwarding and guest processing and do not validate that target.


## M5.1 read-only Pi assessment — 2026-11-18

The [authorized inspection](lab/M5.1.md) confirms the pinned original source, official ARM64 runtime files, and installed V7 login metadata matching M5.0's base. It identifies an unattached DC11 line as the preferred candidate, while documenting that the normal launcher has no external configuration argument and the M5.0 lab command intentionally rejects a normally networked Pi. No emulator or guest was started, and no installed file/service/network configuration was changed.

Next is owner review of the [staged pilot plan](lab/M5.1-pilot-plan.md). Local implementation of a reviewed terminal-only entry point and separately authorized standalone Pi testing precede any original-launcher/profile change or assembled-panel coexistence claim. Do not treat the read-only assessment, idle resource snapshot or clean current throttling flags as deployment authorization or production acceptance. The accepted application checkpoint remains M5.0.


## M5.3/M5.4 — standalone acceptance and coexistence preparation

[M5.3](lab/M5.3.md) completed the separately authorized standalone installed-binary V7 pilot and cleanup. Its brief Pi RSS/CPU samples met the sampled terminal-only targets; sustained load, added transport latency and assembled-panel contention remain open. The owner now reports the assembled physical machine passing initial controls and normal-launcher RT-11 checks. This report does not convert those observations into a browser coexistence result.

[M5.4](lab/M5.4.md) reviews the original launcher and proposes an additive copied V7 profile, preserving physical boot selection and every existing mapping. Mac-side bridge hardening prevents reusing a guest attachment or silently dialing a replacement listener, and rejects buffered output after detachment. No Pi access or deployment occurred. The [pilot proposal](lab/M5.4-pilot-plan.md) is for owner review.

| Next gate | Required evidence |
|---|---|
| Supervised original-launcher pilot | Explicit authorization of one copied profile and unused selection; original Screen/REALCONS/physical operation before, during and after the manual companion; original hashes/mappings and rollback verified |
| Automatic lifecycle identity | Trusted guest/line generations, restart and listener ownership checks, stale-evidence rejection, same-process reset handling; no port-only approval or silent guest substitution |
| Optional service | Detached startup/restart, fresh approval, least privilege, durable TLS/credentials; no emulator lifecycle dependencies or auto-enable |
| Sustained assembled-machine performance | Authorized workloads measuring bridge, simulator and panel impact separately against the unchanged targets |
| Passive panel observation | Separate source/identity/overhead/rollback review; no extra input polling or remote-control capability |

Remote panel control, GPIO work, original-image changes and production deployment remain outside this preparation. Keep physical-only operation independent of every companion component.


## M5.5 preparation — 2026-11-19

The [M5.5 candidate](lab/M5.5.md) retains the installed V7 profile except for one DC11 listener and proposes unused selector 0017 from the retained M5.1 map. Its original REALCONS settings were exercised against a simulated panel in the Mac lab. Genuine guest terminals, continuing console/RPC operation after bridge stop/crash, and listener-replacement retirement passed. The fast profile exposed a bounded replay-cache capacity issue in the stand-in; the report records its correction without changing original SIMH or the profile interval.

Next is owner review of the [exact physical pilot and rollback](lab/M5.5-pilot-plan.md), followed only after separate authorization by fresh state/hash checks, physical switch selection, original launcher/Screen/panel acceptance and fallback verification. No current Pi availability or physical coexistence is inferred from cached inventory or laboratory results.

The [M5.6 deployment specification](lab/M5.6-deployment-spec.md) now covers optional LAN availability, detached startup, credential/certificate provisioning, resource limits, upgrades and uninstall. Implement and validate that separate service lifecycle before packaging or enabling it. Keep the original emulator independent, retain all existing resource targets, and leave remote control and passive observation behind their own gates.


## M5.5 supervised physical result — 2026-11-19

The [actual pilot](lab/M5.5-physical-pilot.md) passed original-launcher V7, three-browser terminal, independent Screen and owner-operated physical HALT/CONT/DATA-selector subtests. The intended IDLED fallback then booted RSX despite all SR paddles being reported down. It was paused and quit without resuming under explicit recovery authorization; the closed original disk matched its complete baseline. Temporary changes were rolled back, and no physical acceptance tag or service was created.

Next gates are a source/evidence review and a separately authorized selection diagnostic that cannot boot original writable media, followed by a reviewed retry only after the cause is understood. The bridge stayed absent throughout the failed switch. Do not treat a reused endpoint, no-argument launch or physical position report alone as verified guest identity.

Short bridge measurements were 6,848 KiB idle RSS / 0.30% CPU and 14,176 KiB maximum sampled active RSS / 5.55% mean CPU. The active sample exceeds the unchanged <5% target; its 20-second browser-acceptance workload is not the sustained workload specified above. Added latency, PSS and emulator-throughput impact were not measured. No new Pi workload is authorized by this report.


## M5.5.1 Mac-only development — 2026-11-19

The [milestone report](lab/M5.5.1.md) records a bounded switch diagnostic and original-C/resolver synthetic oracles, measured allocation improvements, community architecture research, and an implemented detached optional service with ARM64 packaging. Three browser engines exercised actual disposable V7; real-systemd install/restart/upgrade/rollback/uninstall ran in isolated Linux. No Pi access occurred, and the accepted physical checkpoints were not changed.

Next gates, in order:

1. Review and separately authorize the [stopped-machine scanner diagnostic](lab/M5.5.1-switch-diagnostic.md), with owner-confirmed switch positions and exclusive GPIO ownership. Capture raw readings without booting another original guest.
2. Investigate any discrepancy before proposing another original-launcher physical coexistence pilot. M5.5's successful subtests do not erase its failed fallback.
3. Review the [optional service candidate](lab/M5.6-implementation.md), actual network/certificate provisioning and reserved guest line before any Pi installation. Continue to stop the actual bridge before intentional guest changes.
4. Measure the unchanged resource targets on the Pi under sustained representative workloads. Mac-hosted Linux results do not close this gate; eight busy observers measured 6.83% CPU in the lab.
5. Keep passive panel observation, authoritative lifecycle evidence, per-user/per-line access and any [copilot adapter](lab/M5.5.1-community.md) separately scoped. Remote panel control remains restricted.


## M5.6 local engineering — November 19, 2026

The [M5.6 report](lab/M5.6.md) records actual optional-service setup/lifecycle tests, VT100/VT52 conformance and genuine V7 regressions, and a bounded 4010 byte fixture. [VT11 findings](technical/graphics-foundations.md) identify a separate simulator display path, not terminal data. Read-only Pi inspection supports platform compatibility only; no deployment, GPIO sampling, guest interaction or stress test occurred.

Next gates remain: supervised physical switch diagnosis; authoritative guest/line lifecycle evidence or mandatory stop-before-change operation; certificate/network review; representative Pi resource and emulator-impact measurement; separately authorized service acceptance and rollback. The original target table is unchanged. Short synthetic ARM64 measurements cannot settle the prior Pi CPU exceedance or the longer M5.5.1 eight-observer result. Full-screen VT52 applications, compressed 4010 addressing/GIN, live graphics and upstream VT11 transport design are separate incremental steps.
