# Architecture decisions in brief

These decisions describe the current direction. The linked reports retain the evidence, alternatives and limitations.

| Decision | Reason and current boundary |
|---|---|
| Go backend with embedded assets | A small compiled service fits the Pi's memory budget and keeps deployment simple. Standard library plus a small WebSocket dependency; no runtime Node/container/database requirement. [Backend choice](../backend-decision.md), [M5.0](../lab/M5.0.md) |
| TypeScript, HTML5 and SVG | Keep the desktop compact and editable, with a shared panel model and original scalable artwork. [Frontend](../frontend-m42.md) |
| Graphics rendered in the browser | Client machines provide windows, panel graphics and xterm.js. The Pi remains headless. [Architecture](../architecture.md) |
| Dedicated SIMH guest lines | Preserve the primary operator console and avoid Screen takeover. DC11 works with the selected V7 lab image; other guests need their own driver/login checks. [M5.0 transport comparison](../lab/M5.0.md) |
| Separate terminal keyboard ownership | Several viewers may observe one line, but only one explicitly authorized writer owns its keyboard. Separate lines have separate owners, independent of panel authority. [Terminal lifecycle](../lab/M5.0.md#terminal-ownership-lifecycle-and-bounds) |
| Optional companion first | Original software remains authoritative. A side-by-side enhanced distribution is a possible alternative if specific features require it, not a reason to replace working paths now. [M5.0 modes](../lab/M5.0.md#oscars-side-by-side-proposal-and-recommendation) |
| Traditional access stays independent | Physical controls, SSH, Screen, serial terminals and original SIMH must not depend on a browser process. [Independent access](../decisions/0004-independent-access.md) |
| Observation is distinct from control | Passive publication and remote authority have different risks. M4's delayed START-release counterexample and recovery limits remain unresolved for production control. [M4](../lab/M4.md), [observation](../lab/M4.2-observation.md) |
| One guest attachment per bridge lifetime | Reused ports do not establish guest identity. EOF/write uncertainty retires the attachment; a new bridge requires independent operator verification. Same-process guest changes remain unresolved. [M5.4](../lab/M5.4.md) |
| Original-launcher integration is opt-in | Propose an additive copied V7 profile and one unused physical selection; preserve all existing mappings and Screen/REALCONS. Optional service never controls the emulator. [Pilot proposal](../lab/M5.4-pilot-plan.md) |
| Preserve the complete guest profile | M5.5 adds one listener line while retaining the original REALCONS interval/settings and uses independently copied media. A proposed selection is derived from retained installed evidence, then revalidated before any authorized Pi change. [Candidate](../lab/M5.5.md) |
| Failed fallback blocks physical acceptance | M5.5 V7/browser/physical subtests do not override a wrong-guest fallback. Keep the bridge stopped, preserve evidence, require bounded recovery, and verify original media before rollback. Diagnose selection without booting original writable guests before any retry. [Actual findings](../lab/M5.5-physical-pilot.md) |
| Optional installation starts detached | Implemented in the separate Mac/lab candidate: startup, restart, upgrade and uninstall affect only the companion. Fresh local approvals and browser attachment generations prevent silent port following. The manual pilot remains separate. [ADR 0005](../decisions/0005-detached-terminal-service.md) · [M5.6 implementation](../lab/M5.6-implementation.md) |
| Verify memory containment before installed startup | M5.7.1 checks actual local cgroup memory/swap files before opening sockets; the packaged unit refuses absent or unsuitable protection. A Go soft target is supplementary, not a hard limit. Keep the physical-only fallback instead of silently weakening the service. [Evidence and limits](../lab/M5.7.1.md#memory-limit-finding-and-implemented-strategy) |
| Distinct lab and pilot entry points | Keep the network-none lab guard intact. M5.3 adds a fixed-loopback terminal-only pilot and demonstrates it on the actual Pi; neither command is a production installer. [M5.3](../lab/M5.3.md) |

The [philosophy](../../PHILOSOPHY.md) explains the priorities behind these choices. The [technical index](../technical/README.md) is the starting point for implementation details.
