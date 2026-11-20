# Changelog

Actual development milestones, newest first. These are checkpoints, not stable semantic-version releases. Dates use recorded local commit dates (America/Phoenix). The browser package retains its M5.0 identifier; the M5.3 pilot is identified by its separate command, checkpoint and tested binary hash.

## M5.7.1 SR0 comparison and memory containment — 2026-11-19

- Captured 20 expected SR=1 readings with only SR0 UP. After owner-confirmed all-DOWN, captured SR=1 once and stopped immediately; no guest or launcher ran. Preserved raw evidence, verified eight original file records and stopped state, then removed temporary diagnostic executables/lock.
- Added an optional expected-SR guard to the companion diagnostic, retaining the first mismatch before stopping. Oscar's scanner remains unchanged; physical cause unresolved and no acceptance tag created.
- Added kernel cgroup verification before packaged service startup, zero swap allowance and a 72 MiB Go soft target beneath the unchanged 96 MiB kernel cap. Missing/unsuitable protection refuses startup instead of silently weakening containment.
- Validated protection/refusal, bounded OOM/soft-limit comparisons, synthetic-peer lifecycle and the detached desktop in three browsers in disposable ARM64 Linux. Published a separately authorized powered-off inspection proposal and updated M5.8 gates. No Pi boot/kernel/service changes. [Report](docs/lab/M5.7.1.md).

## M5.7 physical diagnosis and M5.8 readiness — 2026-11-19

- Reproduced the all-DOWN discrepancy with the owner confirming exclusive maintenance: all 20 original-scanner samples read SR=1, predicting RSX through the unchanged map. No launcher or guest ran. Stopped the pattern sequence after Test A; no accepted physical-selection checkpoint.
- Narrowed the observation to the SR0 scan path without claiming an electrical cause. Replayed captured values, passed the unchanged-C/fake-GPIO oracle and checked the original resolver in isolated Linux. No application or original PiDP-11 source changed.
- Verified eight original file records unchanged and the machine stopped; removed exact temporary diagnostic/audit executables and the released diagnostic lock. Retained evidence; no original guest disk was opened.
- Identified disabled memory cgroups as a separate M5.8 gate and prepared staged installation, authentication, identity, resource and rollback guidance. No deployment or boot-setting change. [Diagnostic findings](docs/lab/M5.7.md) · [M5.8 readiness](docs/lab/M5.8-readiness.md).

## M5.6 terminal expansion and deployment preparation — 2026-11-19

- Added a genuine initial VT52 text parser/key personality beside the existing VT100 renderer, explicit personality/text-size controls and DEC Delete encoding. Both personalities passed ordinary genuine V7 I/O in three browser engines.
- Corrected guest-line selection changing when directory results reorder; retained generation checks, read-only reconnect and explicit keyboard ownership.
- Added a bounded, incremental Tektronix 4010 SVG fixture application and tests. Documented VT11's distinct simulator-device path; no live graphics transport or source hook implemented.
- Added first-run service configuration, no-network configuration validation and complete-package checksums; repeated disposable ARM64 systemd lifecycle, credential, upgrade, rollback and removal tests.
- Strengthened scanner preparation for interpreted launchers and exclusive maintenance, without running GPIO. Documented the remaining concurrency limitation.
- Published read-only Pi compatibility findings, actual local tests/resources and optional companion boundaries. No Pi deployment or guest operation; physical acceptance remains blocked. [M5.6 report](docs/lab/M5.6.md).

## M5.5.1 Mac-only diagnostics and optional-service engineering — 2026-11-19

- Added bounded switch-selection diagnostics, synthetic captures, unchanged original-C GPIO-stub comparisons and an original-resolver oracle. Hardware mode remains separately authorized and unexecuted.
- Removed repeated trusted-origin parsing and per-viewer output copies with measured allocation improvements; retained all lease, ordering, stale-output and queue protections. Published nine Linux workload measurements, including the unresolved eight-observer CPU limit.
- Implemented a separate detached service, private local approvals, generation-bound browser choices, explicit unavailable states, private TLS/token provisioning and optional static ARM64 packaging.
- Rehearsed real systemd installation, restart/crash, credential-session revocation, upgrade, rollback and complete uninstall in disposable Linux; tested genuine V7 in Chromium, Firefox and WebKit without Pi access.
- Documented community architecture comparisons and a proposed optional copilot adapter. No copilot or remote panel control was implemented. [Report and remaining gates](docs/lab/M5.5.1.md).

## M5.5 supervised physical pilot — 2026-11-19

- Exercised the original no-argument launcher, copied V7 media, physical HALT/CONT and DATA selector, independent Screen console, and genuine browser terminals in three engines.
- Preserved successful subtest evidence while rejecting overall acceptance: the requested IDLED fallback selected RSX-11M-PLUS despite owner-confirmed SR0–SR21 down. Paused it, then performed an explicitly authorized quit without resuming and verified the original disk unchanged.
- Removed temporary profile/mapping changes and credentials; retained private evidence and guest copies. No further guest launch, production service, repair or accepted physical tag.
- Recorded short bridge memory/CPU measurements; the 5.55% active CPU sample exceeds the <5% target.
- [Physical results, recovery and remaining blockers](docs/lab/M5.5-physical-pilot.md).

## M5.5 Mac preparation — 2026-11-19

- Prepared an exact copied V7 profile, proposed unused physical selection 0017, bounded local preparation helper and explicit Pi pilot/rollback instructions.
- Validated the complete REALCONS-enabled profile against original SIMH and a simulated panel, including genuine terminals in three browser engines, bridge stop/crash independence and retired listener recovery.
- Corrected the laboratory replay-cache capacity for the original 1 ms profile without changing the default or replay window; added a 16 MiB payload bound and regression tests.
- Added the M5.6 optional-service deployment specification. No Pi access, physical coexistence claim, service deployment or changes to accepted checkpoints.
- [Candidate, evidence and limits](docs/lab/M5.5.md).

## M5.4 — 2026-11-18

- Documented opt-in original-launcher coexistence, physical selection semantics, guest/line identity limits, optional-service boundaries and a reversible supervised pilot proposal.
- Made bridge connection attempts and endpoint attachments one-shot, preventing reuse after guest loss or close; discarded buffered output from detached readers.
- Passed Mac lifecycle regressions, genuine V7 in three browser engines and original-SIMH listener replacement; documented the observed TCP TIME_WAIT rebind delay. Retained all accepted checkpoints. No Pi access, deployment, launcher/profile edits or panel-control change.
- [M5.4 design and validation](docs/lab/M5.4.md).

## M5.3 — 2026-11-18

- Added a separate fixed-loopback Linux ARM64 terminal pilot using the existing bridge, authentication and embedded assets; lab isolation guards remain unchanged.
- Passed genuine UNIX V7 browser acceptance on the actual Pi 3B+ with original installed SIMH, a disposable disk, one DC11 line and independent Screen console in Chromium, Firefox and WebKit.
- Verified browser/bridge disconnect independence, short Pi RSS/CPU and power observations, operator-led shutdown and unchanged original installation/disk hashes.
- Added reproducible isolated pilot tests and an actual Pi screenshot. No permanent service, physical-panel integration or stable release.
- [M5.3 report and evidence](docs/lab/M5.3.md).

## M5.2.1 — 2026-11-18

- Added permanent coding standards, a subsystem source map and a targeted maintainability review.
- Made development instructions self-contained and expanded contributor setup, test and pull-request guidance.
- Documented terminal/RPC ownership and historical compatibility contracts; expanded selected terminal lifecycle blocks for readability without changing behavior.
- [Review and actual validation](docs/technical/MAINTAINABILITY.md). No Pi access, guest replay, stable release or checkpoint changes.

## M5.2 — 2026-11-18

### Added

- Community README, beginner/developer navigation, philosophy, roadmap and architecture decisions.
- MIT licensing for original RetroRealm materials, credits, contribution and security guidance.
- Public edition of the headless Trixie guide, preserving command blocks and reproduction qualifications.
- Public GitHub repository with existing authentic screenshots and preserved history.

No application behavior, live Pi integration or panel-control change. GitHub publication is verified separately in the [publication record](docs/publication-m52.md).

## M5.1 — 2026-11-18

- Actual Pi read-only compatibility assessment and unexecuted terminal-pilot plan.
- [Report](docs/lab/M5.1.md); source `ccfb972`.

## M5.0 — 2026-11-18

- Browser communicates with genuine UNIX V7; independent guest lines and console verified in the lab.
- [Report](docs/lab/M5.0.md); source `156ce33`.

## M4.3.2 — 2026-11-17

- Continuous-form simulated LP0 printer with unchanged spool format.
- [Report](docs/printer-m432.md); source `947697a`.

## M4.3.1 — 2026-11-17

- Paddle presentation polish and consistent version display.
- [Report](docs/review-m431.md); source `59b52eb`.

## M4.3 — 2026-11-17

- Historical paddle reconstruction, security/recovery work and extended lab measurements.
- [Report](docs/lab/M4.3.md); source `a303039`.

## M4.2 — 2026-11-16

- Windowed desktop, simulated applications and passive-observation lab.
- [Report](docs/lab/M4.2.md); source `1491994`.

## M4.1 — 2026-11-16

- Consumer-fence and independent-access experiments; remaining stop guarantees documented.
- [Report](docs/lab/M4.1.md); source `238e45f`.

## M4 — 2026-11-16

- Coexistence broker laboratory; delayed START-release safety limitation demonstrated.
- [Report](docs/lab/M4.md); source `b539ada`.

## M3 — 2026-11-16

- Actual original-C/Go RPC and REALCONS interoperability in an isolated lab.
- [Report](docs/lab/M3.md); source `dbbfd71`.

## M0.2 — 2026-11-16

- Mock Go backend, shared panel state and offline RPC/XDR fixtures.
- [Report](docs/backend-milestone.md); source `520ae05`.

## M0 — 2026-11-16

- Research and isolated HTML/SVG prototype.
- [Report](docs/architecture.md); source `b09e528`.
