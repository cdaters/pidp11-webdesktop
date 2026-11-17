# IMSAI → PiDP-11 feature-parity matrix

Baseline for “existing” below is accepted **M4.1 / `238e45f`**, before M4.2 implementation. This prevents the research inventory from claiming that planned work has already shipped. The M4.2 delivery/validation report is authoritative for completed work and screenshots. IMSAI evidence labels and exact artifact hashes are in the [reference inventory](imsai-inventory.md).

Priority: **P0** = milestone foundation; **P1** = useful local prototype or near-term integration; **P2** = later authorized feature; **N/A** = different historical machine. Complexity is relative: **S** a contained UI/model feature, **M** several components or protocol/tests, **L** emulator/guest/hardware/lifecycle work. It is not an elapsed-time estimate.

| Reference feature | Existing PiDP baseline | M4.2 equivalent / recommended work | Priority / complexity | Dependencies and acceptance boundary |
|---|---|---|---|---|
| Cohesive desktop shell | Partial: panel/console/library page navigation | Original DEC-inspired workspace with launchers and task controls | P0 / M | Shared app registry, accessible focus, responsive layout; no copied IMSAI assets |
| Move/stack windows | Missing | Purpose-built TypeScript geometry/focus model | P0 / M | Pointer capture, bounds, z-order and keyboard tests |
| Iconify/restore | Missing | Minimize and restore via dock/taskbar | P0 / S | Preserve app state while hidden; no connection/control acquisition implied |
| Close/reopen | Missing | Explicit application lifecycle separate from minimize | P0 / M | Dispose listeners/terminal instances; reopening never restores a lease |
| Resize/maximize/fullscreen | Partial: responsive fixed panel | Resizable windows, maximize restore, authentic panel fullscreen | P0 / M | One panel model and renderer, viewport bounds, mobile fallback |
| Layout persistence | Not implemented; reference persistence unproven | Optional local geometry/preferences only | P1 / S | Versioned schema, invalid-value clamping; never credentials, tokens or ownership |
| Keyboard/touch usability | Panel keyboard controls exist | Window shortcuts, clear focus, pointer/touch drag/resize | P0 / M | Prevent terminal/panel shortcut collisions; actual browser checks |
| TTY renderer | Partial: text command demo tied to simulated panel | Multiple independent mock terminal sessions with a mature renderer or explicitly bounded demo contract | P0 / M | Terminal model separate from panel adapter; lazy-load renderer where used |
| Multiple reference TTYs | Dormant TTY2/3 assets, removed in inspected IMSAI startup | PiDP independent sessions are a deliberate enhancement | P0 / M | Unique line/session identities; tests prove buffers and input ownership independent |
| VT100/ANSI features | No real terminal renderer in M4.1 | DEC-inspired mock terminal with truthful capability label | P1 / M | Renderer support is not proof of VT100/VT52/VT220 conformance |
| VT52 / VT220 profiles | Research needed | Profile contract with unsupported behavior clearly identified | P2 / L | Conformance fixtures, keyboard mapping, encoding and guest configuration |
| Terminal zoom/80–132 columns | Missing | Font/column preferences where renderer supports them | P1 / S | Fit/resize tests; no invented hardware mode transitions |
| Terminal observers/input owner | Missing; reference enforcement undetermined | Separate terminal observation/input capabilities | P0 design, P1 fixture / M | Never bind keyboard permission to panel lease or take over Screen |
| Full PDP front panel | Implemented: original SVG, working mock controls and lab RPC semantics | Refine authentic layout/labels/proportions and DIGITAL mark; compact/full presentations | P0 / M | Same state model; original REALCONS semantic tests retained |
| Physical panel coexistence | Experimental lab broker + interlock | Preserve Mode A; remote control remains laboratory-only | P0 preserve / L | Physical hardware/POWER/LOCK/OS selection untested; no deployment |
| Disk drive icons/status | Missing functional device app | RK/RL/RP-family-compatible mock catalog, mounted image and protection state | P0 / M | Explicit simulated source, compatibility metadata, safe stopped-state transitions |
| Disk library upload/download/rename/delete | Missing | Useful local fixture-media workflow with bounded sizes and clear confirmations | P1 / M | No installed/guest-image modification; metadata and byte handling distinct |
| Remote FDC images | Not applicable as IMSAI protocol | Future remote storage is separate research, not implied by web disk GUI | P2 / L | Format/controller/locking/performance/security design |
| GUI hard-disk mounting | Reference itself incomplete | Do not reproduce limitation; define explicit compatible-device contract | P1 mock, P2 real / M–L | Validated SIMH attach semantics and exclusive writable-image ownership |
| Magnetic tape reels | No equivalent in inspected IMSAI TAPE app | PDP-11-specific magnetic-tape device/library prototype | P1 / M | Separate tape formats, write protection and unavailable position reporting |
| PTR/PTP | Missing | Functional local byte-load, reader position, punch output and download | P1 / M | Bound buffers; distinguish text encoding from raw bytes; no host device access |
| Paper-tape library/bootload | Missing | Local library; simulated boot configuration preview | P1 / M | Never turn arbitrary uploaded bytes into host/emulator commands |
| LPT spool and preview | Missing | Bounded mock print queue, preview, download and clear | P1 / M | Read-only observation separate from queue mutations; no actual print job implied |
| Printer paper styles/feed | Missing | Optional paper presentation and simulated feeds | P1 / S | Presentation-only styles; do not claim escape-code printer emulation |
| SYS diagnostics | Partial: backend/panel state | Host/emulator/RPC/owner/freshness window with unavailable metrics labeled | P0 / M | Do not display invented CPU temperature/throttling as real measurements |
| SYS task monitoring | Missing | Future lightweight host metric collector | P2 / M | Authorized installed-system access; bounded sample history |
| SYS reboot/firmware flash | Deliberately absent | Do not carry over destructive host actions into this milestone | P2 / L | Separate explicit admin authorization, recovery and deployment design |
| CFG editor | Architecture only | Constrained simulated profiles/settings rather than arbitrary host files | P1 / M | Schema validation, capability split, no shell/file-path execution |
| OS library | Partial: illustrative UNIX/RT/RSX cards | Useful boot-profile details and simulated start/stop lifecycle | P0 / M | Real guest shutdown and boot remain separate authorized integration |
| MAN PDF library | Missing | Documentation links/catalog; local upload is optional future work | P1 / S–M | Rights, file bounds, safe document links; no bundled proprietary manuals required |
| CRT / IMSAI VIO | N/A | Future PDP-compatible display app only if justified | N/A / L | IMSAI display RAM/protocol is not PDP-11 hardware |
| Dazzler | N/A | No direct PDP-11 equivalent in current scope | N/A / L | Possible later independent historical graphics project |
| Cyclops camera | N/A | Do not request camera permissions for superficial parity | N/A / M | Would need a justified PDP peripheral and explicit permission workflow |
| JS1 / D+7A joystick | N/A | Do not add unsolicited gamepad/device integration | N/A / M | Machine-specific hardware semantics |
| Tektronix vector terminal | Missing, potentially relevant | Future terminal display option distinct from front panel | P2 / L | Terminal parser, plotting software, independent data channel, conformance tests |
| Per-device WebSockets | Panel stream implemented | Typed observer/terminal channels with bounds and reconnect state | P0 / M | Existing Go/WebSocket base; no browser-facing RPC |
| REST media actions | Mock architecture only | Local model contracts now, authoritative safe backend later | P1 / M–L | Capability checks and guest-state preconditions belong on backend |
| Automatic device refresh | Panel snapshots implemented | Event/snapshot publication with coalescing for observers | P0 / M | No extra physical input polls per browser; slow viewers cannot block REALCONS |
| Connection indicators | Panel connection only | Per-app source, validity, freshness and unavailable states | P0 / S–M | Explicit stale/reconnect tests; never replace missing data with live-looking animation |
| Authentication/roles | Origin/loopback checks, not authentication | Observer capability boundary and rigorously specified separate permissions | P0 / L | Observation, terminal read/write, panel, media, admin all distinct |
| Browser recovery | Mock reconnect discards ownership/pending actions | Extend safe snapshots and app reconnect independently | P0 / M | Preserve M4 failure oracle and M4.1 fencing; no replay of START/CONT/DEP |
| Browser-independent operation | M4.1 design + stand-in rollback tested | Preserve physical, SSH/Screen, serial and guest-network access domains | P0 preserve / L | Pi/real hardware never contacted; guest-native networking remains future configuration |
| Passive machine observation | Design only in M4.1 | Implement publisher on already observed path in isolated lab | P0 / L | One-way bounded copies, no additional RPC polling/mutation/routing changes |
| Host/guest resource budget | Short lab metrics exist; idle/disabled-hook gaps open | Longer observer/terminal tests and measured allocation/CPU investigations | P0 / M | Label Mac/Linux results; no extrapolated Pi certification |

## Equivalent experience without machine confusion

The strongest transferable reference pattern is a device-oriented workspace: terminals, storage, paper tape, printer, front panel and diagnostics are visibly related but remain separate applications. The reference's compact window manager shows that a heavy desktop framework is unnecessary. PiDP should retain this organization while using DEC names, PDP-11 devices and verified control semantics.

A full PDP-11/70 panel, magnetic tape, explicit OS profiles, separate terminal ownership, authentic supplied DIGITAL artwork, source/freshness labels, passive observation and verified consumer fencing are **PiDP-specific additions or improvements**. They should not be described as identical IMSAI features. Conversely, Cromemco graphics/camera/joystick peripherals are not required for PDP-11 parity merely because their launchers exist in the reference.

“Functional prototype” means useful local state transitions and file/queue/session interactions that are actually implemented and tested, clearly marked simulated. It does not mean a picture of a drive with inactive buttons. “Production integration” means original emulator/guest/hardware behavior and remains outside M4.2 authorization. Keep those acceptance categories separate in the milestone report.

## Delivered M4.2 status

| Area | Delivered and exercised | Remaining gap |
|---|---|---|
| Desktop/window management | Drag, resize, keyboard focus, minimize/restore, maximize, native fullscreen request, close/reopen, taskbar and geometry-only preferences | Native Safari/fullscreen system behavior and real assistive-technology certification remain open |
| Panel | Shared compact/full SVG, supplied DIGITAL artwork, calibrated layout, source/freshness labels, touch/keyboard controls | Verified mechanical dimensions, physical paddle/rotary behavior and GPIO |
| Terminals | Four independent mock sessions with xterm 6, fit, keyboard ownership, bounded history/scrollback | Real guest transport/profile conformance; VT52/VT220; zoom and fixed 80/132-column controls |
| Disk/tape | Compatible RK05/RL02/TU10 mock catalog, mount/eject/protection, stopped-only guards, synthetic tape position | RP-family app, disk upload/download/rename/delete, actual images and exclusive writable attachment |
| Paper/printer | Local byte load/read/punch/download; print queue/preview/spool/download/clear | Real device routes, encoding/profile validation and persistent library |
| Systems | Named OS descriptions/configuration and mock start/stop guards | Actual guest boot/shutdown and guest networking |
| Diagnostics | Real connection/ownership/window counts plus bounded mock logs; unavailable host telemetry labeled | Authorized CPU/RAM/thermal/throttling metrics |
| Observation/security | Optional passive C publisher, eight-client WS, lab token sessions, capability separation, strict CSP and adversarial tests | TLS/provisioning/audit for LAN, terminal/media authorization routes |
| Recovery | Original counterexample retained, M4.1 regressions/rollback pass, separate bounded-call experiment | End-to-end stop bound, physical POWER/LOCK, production supervisor and authorized hardware validation |

This provides the complete device-workspace organization with useful local interactions. It does not claim production device parity or reuse the IMSAI package's code/artwork. See [frontend details](../frontend-m42.md) and [validation/results](../lab/M4.2.md).
