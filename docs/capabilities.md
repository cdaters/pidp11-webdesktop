# Capability and compatibility matrix

Current through **M5.11**; the M5.10 presentation and gallery are preserved. A guest is an operating system inside SIMH. A genuine device test executes PDP-11 instructions against original emulated-device registers. Neither result automatically qualifies the physical Pi or a production installation.

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
| Multiple guest windows | Genuine guest/laboratory tested | Independent configured lines and observers; OS must supply the corresponding services |
| Exclusive keyboard ownership | Laboratory and genuine guest tested | Explicit acquisition; observer credentials cannot type; [terminal guide](getting-started/terminals.md) |
| Reconnect and attachment generations | Laboratory tested | Detached startup, explicit reconnect, no automatic keyboard/history replay; surviving-stream guest changes still need independent identity verification |
| RT-11SJ V05.03 | Genuine disposable boot/original console tested; browser not qualified | M5.11 installed HELP and device inventory; DZ not installed in the tested image |
| RSX-11M-PLUS V4.6 BL87 | Genuine DZ11/browser terminal tested | Chromium VT100 HELLO/HELP/PIP listing; no full-screen or broader release claim |
| RSTS/E V7.0-07 | Genuine boot, login, BASIC and system status through original console | Separate serial line/browser not qualified; V7.0 product support is not installed-driver evidence |

[Detailed terminal protocols and tests](technical/terminal-personalities.md). Chromium, Firefox and WebKit are the tested automation engines; WebKit results are not native Safari acceptance.

## Graphics and equipment

| Capability | Status and scope | Evidence / remaining limit |
|---|---|---|
| Tektronix 4010 | Genuine V7 plotting tested | Original `graph` / `plot -Ttek`; [graphics foundation](technical/graphics-foundations.md) |
| 4010 keyboard/GIN | Laboratory fixtures | No genuine GIN application acceptance; not full 4014 conformance |
| VT11/VR14 | Research / planned transport | Different display-device interface; not supplied by the 4010 renderer |
| LP11 output | Genuine device tested | CPU-driven output through original SIMH; live observation and completed byte-exact downloads |
| PC11 reader/punch | Genuine device tested | All-byte-value transfer, position and EOF; no browser tape mounting or guest input operation |
| Device observation | Experimental, laboratory tested | Read-only, bounded, generation-bound; local supervisor must establish producer identity |
| Completed exports | Implemented and laboratory tested | Download exact LP11/punch/reader bytes only after explicit completion; no control through downloads |
| Guest printer drivers | Not qualified | CPU-device output does not prove V7/BSD/RSTS/E printer-driver integration |
| Continuous-form local printer | Simulated spool / explicit snapshot | Sample jobs and imported text; separate from observed LP11 output |
| Disk, magnetic tape, paper-tape and OS management | Simulated | No real guest-media attachment, writes or OS booting |
| Virtual front panel | Simulated interactive SVG | Passive observation/control experiments remain separate from the ordinary desktop |

[Device contract and producer limits](technical/observed-peripherals.md) · [Current gallery](screenshots/README.md).

## Reference desk and optional AI

| Capability | Status and scope | Evidence / remaining limit |
|---|---|---|
| Offline guide | Implemented deterministic demonstration | Not a language model |
| Historical reference search | Implemented, offline | 34 notes with source metadata; important release-specific gaps remain |
| Source facts | Implemented, deterministic | 15 explicit `/fact` topics; no inference or terminal sharing |
| Exact PDP-11 arithmetic | Implemented, deterministic | `/calc`: 8/16/22-bit values, bases, masks and shifts; no ambiguous-number guessing |
| Local model gateway | Laboratory tested | Fixed model, authentication/TLS, bounded requests and cancellation; no management/tools |
| Gemma conversation | Experimental, genuine model tested | Retained three-engine evidence; M5.11: 10/10 narrow expected distinctions, 9/10 without identified material error; not independent expert acceptance |
| Claim review | Experimental, narrow fragments | M5.11 frozen corpus: 3/18 recognized, seven missed contradictions; no whole-answer certification or independent expert benchmark |
| Selected terminal text | Explicit user sharing | Nothing read automatically; submitted text cannot be recalled from a model |
| Human-approved command proposals | Experimental, disabled by default | Only `pwd`, `ls`, `ls /`; separate review, current keyboard ownership and one-use approval; not general AI execution |
| Hacker Replicant interoperability | Actual application laboratory tested | Explicitly modified pinned app; genuine V7 selection and real model under a lab-only process/attachment/view guard; production identity remains unqualified |

[M5.11 evidence](lab/M5.11.md) · [Retained Phase D evidence](lab/M5.9.3-D.md) · [User setup](getting-started/configured-companion.md) · [Independent application and attribution](../integrations/hacker-replicant/README.md).

## Physical operation and distribution

| Capability | Current status |
|---|---|
| Original PiDP-11 independence | Non-negotiable design requirement; conventional-console independence demonstrated in recorded pilots |
| Physical/browser coexistence | Partially demonstrated, **not physically accepted**; M5.5 fallback selected an unexpected guest |
| Hardware readiness | SR0 signal-path discrepancy observed; machine disassembled pending switch repair; no M5.11 hardware test |
| Memory readiness | Assessed Pi’s memory controller disabled; current service refuses uncontained startup; actual Pi correction unperformed |
| Optional static ARM64 service | Laboratory tested; detached, authenticated, memory-limited, disabled by default; not production accepted |
| Remote front-panel control | Not a production feature; START-release and blocked-RPC safety limits remain |
| Fresh-card tutorial | Reconstructed from actual successful installation; independent complete replay outstanding |
| Release availability | Source and local candidate-building procedure; no stable release or implied binary download |

See [installation paths](getting-started/installation-paths.md), [known limitations](known-limitations.md) and [alpha readiness](releases/alpha-readiness.md). All historical reports retain their original test scope.
