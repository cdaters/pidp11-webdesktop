# Capability and compatibility matrix

## M5.27 local modem evidence

Original V7 cu/DC11 line 3 now completes bounded AT/CONNECT/text/hangup sessions
with an independent fixed local peer. Both directions have stopped-disk/peer
checksum evidence. The Local modem window is authenticated, read-only observation
of a separate optional process; it cannot dial or control a guest. See the
[M5.27 report](lab/M5.27.md) and [contract](technical/local-modem.md).
Ethernet remains preparation only, with actual retained 2.11BSD DEUNA/DELUA driver
and networking-tool inventory. No binary transparency or physical modem claim.


[M5.26](lab/M5.26.md) qualifies a small **genuine V7 /bin/cu ↔ DC11 line 3
ASCII text workflow**, with an independent peer and actual Chromium/Firefox/WebKit
exchanges. Communications reuses approved terminal generations, keyboard leases
and read-only socket counters. Echo/newline transformations apply; browser LF was
required to complete input. The modem exchange was unqualified in M5.26; M5.27 above adds the bounded
qualification. The pinned simulator still has no Ethernet backend. No physical deployment is added.

[M5.25](lab/M5.25.md) qualifies **laboratory-only TM11 forward-read completion
observation** in a disposable instrumented simulator: six RT-11 comparison modes,
exact bytes/status, separate serviced-interrupt checks and three browser engines.
Observer loss does not stop the tested guest. The separate reader exceeds the
1 MiB incremental-memory target; Pi CPU, automatic guest identity and connected
REALCONS timing remain unqualified. Ordinary builds retain snapshots.

[M5.24](lab/M5.24.md) qualifies genuine RT-11 MT/PIP reads of two labeled tape
files with byte-exact recovery, plus V7 RH70/RP06 filesystem and captured storage
observation. RL02 and the earlier CPU/DMA tape evidence remain qualified. Existing
windows show provenance, geometry and capture age; they do not provide live I/O,
browser media control or automatic guest identity.

[M5.22](lab/M5.22.md) qualifies a guided independent operator workflow, repeated RSX
jobs in reused slots, bounded retained history and explicit saved-data recovery after
observer restart. Genuine RT-11 printer/punch output also passed exact three-engine
history downloads. Utilities ran through the original console; safe state and guest
identity remain operator-attested. Browser mounting remains disabled.

Engineering through **M5.25**, publication through **M5.18**; the M5.10 presentation and gallery are preserved. A guest is an operating system inside SIMH. A genuine device test executes PDP-11 instructions against original emulated-device registers. Neither result automatically qualifies the physical Pi or a production installation.

[M5.20](lab/M5.20.md) qualifies RSX PIP printer output and a reader-to-punch copy,
with exact browser exports. Existing equipment windows now separate simulation,
live observation, completed exports and retained Job history. Media attachment remains local and supervised.

[M5.19](lab/M5.19.md) adds a genuine terminal workstation, DEC keyboard/identity improvements,
optional BEL audio, search/copy and presentation preferences. It extends genuine RSX
EDT and BSD game evidence while keeping the published Alpha 2 unchanged. The
[product direction](product/virtual-computer-room.md) gives equal priority to physical
PiDP-11 owners and ordinary SIMH installations without GPIO or REALCONS.

[M5.17](lab/M5.17.md) qualifies a reproducible [Source Alpha 2 candidate](releases/M5.17-candidate.md) and repeats the recorded guest/device subsets from its extracted source. M5.18 [published that exact candidate](releases/M5.18-publication.md) as an experimental source-only pre-release; publication adds no production capability.

[M5.16](lab/M5.16.md) repeats the named guest/device subsets and qualifies review tools; it adds no new production feature. Its [security packet](security/M5.16-review.md) is ready for independent review, which remains pending.

**Genuine guest tested** identifies recorded operating-system behavior. **Genuine device tested** identifies CPU/device behavior. **Laboratory tested** identifies an isolated transport or safety experiment. **Implemented**, **experimental**, **simulated**, **planned**, and **not physically accepted** describe different limits; they are not a single maturity score.

## Terminals and operating systems

| Capability | Status and demonstrated scope | Evidence / remaining limit |
|---|---|---|
| UNIX V7 guest | Genuine guest tested, Mac lab and completed actual-Pi terminal-only pilot | [M5.3](lab/M5.3.md); pilot removed afterward, not a permanent service |
| 2.11BSD guest | Genuine guest tested in disposable Mac-hosted Linux | [M5.9.2](lab/M5.9.2.md); vi editing, redraw, saved readback and more paging |
| VT100 | Genuine guest tested; qualified subset | V7 I/O and BSD vi; not complete VT100 conformance |
| VT52 | Genuine guest tested; initial text subset | V7 I/O and BSD vi in three engines; graphics/copier/serial behavior incomplete |
| VT220 | Genuine guest tested; seven-bit subset | BSD vi/more including WebKit; full character sets, 132 columns and reset fidelity unqualified |
| ASR-33-style teletype | Genuine V7 I/O tested; modern paper approximation | 72 columns, bounded uppercase display; no mechanical timing/acoustic emulation |
| Workstation display/search/copy | Implemented; three-engine fixtures | Bounded retained text and six presentation preferences; no saved authority, guest or connection |
| Optional BEL audio | Genuine BSD BEL received; three-engine browser API and gating checks | Synthetic, opt-in, focused-window only; no acoustic fidelity or speaker test |
| BSD robots | Genuine VT100 game tested in three engines with workaround | Initial board needs Ctrl-L redraw in every retained case; cause unresolved, not a clean first-screen pass |
| Multiple guest windows | Genuine guest/laboratory tested | Independent configured lines and observers; OS must supply the corresponding services |
| Exclusive keyboard ownership | Laboratory and genuine guest tested | Explicit acquisition; observer credentials cannot type; [terminal guide](getting-started/terminals.md) |
| Opt-in process/socket supervision | Genuine Linux/V7 laboratory tested | Ordered expiring approvals; OS remains operator-attested; observer not production-installed |
| Reconnect and attachment generations | Laboratory tested | Detached startup, explicit reconnect, no automatic keyboard/history replay; surviving-stream guest changes still need independent identity verification |
| RT-11SJ V05.03 baseline | Genuine disposable boot/original console tested | Preserved; RT-11 DZ disk handler status is not DZ11 serial evidence |
| Generated RT-11FB V05.03 | Genuine separate browser application terminal | M5.13 fresh build, line retype and asynchronous I/O; older status-word mismatch explained, no independent monitor or full diagnostic acceptance |
| RSX-11M-PLUS V4.6 BL87 | Genuine DZ11/browser terminal tested | HELLO/HELP/PIP plus VT100 EDT screen editing, Gold/keypad commands, save/readback in three engines; [M5.19](lab/M5.19.md), partial application qualification |
| RSTS/E V7.0-07 | Genuine boot, login, BASIC and system status through original console | M5.13 minimal/full image inventories: console only; exact retained batch identifies missing generation/patch volumes; no browser acceptance |

[Detailed terminal protocols and tests](technical/terminal-personalities.md). Chromium, Firefox and WebKit are the tested automation engines; WebKit results are not native Safari acceptance.

## Graphics and equipment

| Capability | Status and scope | Evidence / remaining limit |
|---|---|---|
| Tektronix 4010 | Genuine V7 plotting tested | Original `graph` / `plot -Ttek`; [graphics foundation](technical/graphics-foundations.md) |
| 4010 keyboard/GIN | Laboratory fixtures | No genuine GIN application acceptance; not full 4014 conformance |
| VT11/VR14 | Research / planned transport | Different display-device interface; not supplied by the 4010 renderer |
| LP11 output | Genuine RSX/RT-11 guest and CPU/device tested | [M5.20](lab/M5.20.md) large RSX listing; [M5.21](lab/M5.21.md) two separate 172-byte RSX jobs with three-engine exports, M5.22 152-byte RT-11 job with exact browser exports |
| PC11 reader/punch | Genuine RSX/RT-11 guest and CPU/device tested | M5.21 RSX: two 48,817-byte inputs / 49,141-byte outputs, live observation before command and exact exports; M5.22 RT-11 console-operated ASCII copy: 113-byte input / 512-byte output with exact browser exports. No browser mounting |
| Device observation | Experimental, laboratory tested | Read-only, bounded, generation-bound; local supervisor must establish producer identity |
| Completed exports | Implemented and laboratory tested | Download exact LP11/punch/reader bytes only after explicit completion; no control through downloads |
| Guest printer drivers | Narrow RSX and RT-11 installed-driver qualification | RSX LPDRV/PIP; RT-11 LP/COPY ASCII through original console. V7/BSD/RSTS/E printer integrations remain unqualified |
| Equipment supervisor | Isolated-Linux lab tested | Explicit owner/job/generation, ordered operator completion, real supervisor crash/expiry; no SIMH control or production installation |
| Reader-media catalog | Implemented and fixture tested | Up to four readonly, hash-verified entries; informational snapshot. Browser-originated mounting remains disabled |
| Continuous-form local printer | Simulated spool / explicit snapshot | Sample jobs and imported text; separate from observed LP11 output |
| RL02 disk observation | Genuine captured RT-11/RL11 subset | Verified configuration/attachment/hash, resident DL filesystem access, capacity/geometry and named registers. No live activity feed |
| TM11/TU10 tape observation | Genuine RT-11 MT/PIP subset plus earlier CPU/device evidence | Two labeled files recovered exactly (512 + 1,024 bytes); normal filemark/logical-end search; read-only snapshots, no tape writing or live motion |
| TM11 read-completion stream | Instrumented laboratory only; ordinary build excluded | [M5.25](lab/M5.25.md): exact RT-11 bytes/status, serviced IRQ differential, bounded delivery and retirement; separate reader memory target not met, Pi performance unmeasured |
| RH70/RP06 disk observation | Genuine captured V7 subset | Original filesystem access, attachment/hash, exact geometry, named register status; unit zero only |
| Storage snapshot lifecycle | Laboratory tested | Explicit local capture/publication, 30-second freshness, stale-generation rejection, retained data and empty observer restart; no automatic transition detection |
| Browser disk, magnetic tape, paper-tape and OS management | Simulated | Genuine tape input was prepared/attached by the independent lab operator; browser controls cannot attach, replace, write media or boot an OS |
| Virtual front panel | Simulated interactive SVG | Passive observation/control experiments remain separate from the ordinary desktop |

[Device contract and producer limits](technical/observed-peripherals.md) · [Current gallery](screenshots/README.md).

## Reference desk and optional AI

| Capability | Status and scope | Evidence / remaining limit |
|---|---|---|
| Offline guide | Implemented deterministic demonstration | Not a language model |
| Historical reference search | Implemented, offline | 36 notes with source metadata; important release-specific gaps remain |
| Source facts | Implemented, deterministic | 15 explicit `/fact` topics; no inference or terminal sharing |
| Exact PDP-11 arithmetic | Implemented, deterministic | `/calc`: 8/16/22-bit values, bases, masks and shifts; no ambiguous-number guessing |
| Local model gateway | Laboratory tested | Fixed model, authentication/TLS, bounded requests and cancellation; no management/tools |
| Gemma conversation | Experimental, genuine model tested | Retained three-engine evidence; M5.13: six of eight requested distinctions, two incomplete; one marked quotation withheld; not independent expert acceptance |
| Source attribution | Conservative delivered-answer label; substantial marked quotations withheld | Catalog contains paraphrases, not authenticated quotation spans; unusual syntax and factual accuracy remain unverified |
| Claim review | Experimental, narrow fragments | M5.12 new frozen corpus: 2/12 recognized, five missed contradictions; no whole-answer certification or independent expert benchmark |
| Selected terminal text | Explicit user sharing | Nothing read automatically; submitted text cannot be recalled from a model |
| Human-approved command proposals | Experimental, disabled by default | Only `pwd`, `ls`, `ls /`; separate review, current keyboard ownership and one-use approval; not general AI execution |
| Hacker Replicant interoperability | Existing modified-application laboratory evidence | Genuine V7 selection and real model under a lab-only process/attachment/view guard. M5.23.1 records agreed architecture and an unimplemented 0.2 proposal; no native upstream compatibility or production identity qualification |

[M5.12 evidence](lab/M5.12.md) · [Retained Phase D evidence](lab/M5.9.3-D.md) · [User setup](getting-started/configured-companion.md) · [Independent application and attribution](../integrations/hacker-replicant/README.md).

## Physical operation and distribution

| Capability | Current status |
|---|---|
| Original PiDP-11 independence | Non-negotiable design requirement; conventional-console independence demonstrated in recorded pilots |
| Physical/browser coexistence | Partially demonstrated, **not physically accepted**; M5.5 fallback selected an unexpected guest |
| Hardware readiness | SR0 signal-path discrepancy observed; machine disassembled pending switch repair; no M5.16 hardware access |
| Memory readiness | Assessed Pi’s memory controller disabled; current service refuses uncontained startup; actual Pi correction unperformed |
| Optional static ARM64 service | Laboratory tested; detached, authenticated, memory-limited, disabled by default; not production accepted |
| Remote front-panel control | Not a production feature; START-release and blocked-RPC safety limits remain |
| Fresh-card tutorial | Reconstructed from actual successful installation; independent complete replay outstanding |
| Release availability | Published Source Alpha 2 includes the qualified M5.14–M5.16 corrections; Alpha 1 remains unchanged. No stable release or binary download |

See [installation paths](getting-started/installation-paths.md), [known limitations](known-limitations.md) and [alpha readiness](releases/alpha-readiness.md). All historical reports retain their original test scope.
