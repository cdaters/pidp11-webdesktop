# Validation record

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
