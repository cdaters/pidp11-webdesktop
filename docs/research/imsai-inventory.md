# IMSAI Web GUI reference inventory — M4.2

Research snapshot: 2026-11-17 UTC. This is an inventory of identifiable functionality in the public distribution and documentation, **not a claim that every feature was exercised against a working IMSAI**. No IMSAI hardware, private server, Raspberry Pi, login, access-control bypass, firmware installation or guest-image modification was involved.

## Evidence and provenance

Evidence labels used below:

* **P** — directly inspected in the shipped package (HTML/CSS/JavaScript, entry point and handlers). This proves the packaged implementation exists, not that its firmware/physical-device behavior was tested.
* **D** — stated in official documentation or release notes.
* **I** — inference from presentation/architecture, explicitly not validated behavior.
* **U** — undetermined, absent from the inspected code path, or needing an actual supported system. Absence of a search token is not proof of absence throughout the firmware.

The [update guide](https://thehighnibble.com/imsai8080/update/) still labels its latest-release link “August 2024” / v1.13.0, but that link resolved during this investigation to the [June 2026 release, firmware v1.14.0](https://github.com/thehighnibble/firmware/releases/tag/v1.14.0). The shipped GUI identifies itself as **webfrontend 1.15.0**. Use those separate firmware/GUI version numbers, rather than treating the older guide label as current.

Public artifact inspected: [v1.14.0 update.bin](https://github.com/thehighnibble/firmware/releases/download/v1.14.0/update.bin), published 2026-06-04. It is an ordinary gzip-compressed tar archive, not encrypted firmware. It contains frontend resources for IMSAI and Cromemco variants. The 83 MB IMAGE.zip and firmware executable were not needed for this analysis; no historical operating-system images were downloaded. Unpacking and inspecting ordinary bundled JavaScript was sufficient, so binary decompilation was unnecessary.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `update.bin` | 4,841,049 | `1a69a9196e3315f4f22b010f78eba05506bd4289445846b75f192950918bc019` |
| IMSAI console JS, decompressed `27bf42a4a190b234397f.js` | 1,019,063 | `986fdb1bc5037a2f2f0c7d850fde3757871854869fa0956eb6a19e9a1d65992d` |
| IMSAI printer JS, decompressed `848a69f3846ddc6e3239.js` | 56,526 | `845440421a3ab077e242e07e8276f3b7d9f52d26b33e7600c455f97f2ceed8b7` |
| IMSAI console `index.html` | — | `2a0eb12000e041b35d2dbdb7f9fbb75671f6ea2da86ec994d0e05f05233f601d` |

Ignored local research copies reside under `.research/imsai42/`; no bundled code, fonts, sounds, images, screenshots, firmware or guest media were copied into the application or tracked documentation. The release explicitly prohibits rehosting its packages. The repository [license page](https://github.com/thehighnibble/firmware/blob/master/LICENSE.md) states CC BY-NC-SA 4.0, while embedded frontend package metadata says MIT. That inconsistency is **not** treated as permission to reuse or redistribute the package. This project implements original equivalents.

## Desktop and window behavior

| Component / behavior | Evidence | Finding |
|---|---|---|
| Workspace shell | P: console HTML, startup template | Fixed viewport, wallpaper, monospaced typography, icon/device launchers, overlaid windows and blue frame/background palette. No general Linux desktop is required. |
| Window stacking and focus | P: window module | Maintains an ordered window array; clicking raises a window and updates z-indices. |
| Move windows | P: title-bar handlers | Mouse dragging modifies top/left; on release the window is anchored relative to the nearer viewport edges. |
| Minimize/restore | P: `open`/`iconify` class logic | Title-bar/icon interaction iconifies or restores. Clicking a launcher for an open background window first raises it. This is not a taskbar model. |
| Close/destroy | U/P | Most desktop windows are constructed at startup and iconified, not demonstrably destroyed. The printer is a separate browser window with a close control. Do not equate iconification with closing a session. |
| Resize | P: CSS and resize handlers | Selected windows use native `resize: both`; libraries, manuals, SYS, VIO and Dazzler have resize setup. Not every device is uniformly resizable. |
| Fullscreen / zoom | P, D | TTY and display views have full-area presentation/zoom controls. TTY implements Win Alt+Enter / other platforms Meta+Enter, plus font zoom/reset. The inspected terminal method uses CSS and fitting; do not assume all controls call the browser Fullscreen API. |
| Responsive positioning | P | Relative viewport anchoring and resize-event icon recalculation; the device area reflows. This is not evidence of fully accessible mobile window interaction. |
| Touch | P dependency, U validation | A drag/drop touch shim is bundled. Real touch-device usability was not exercised in this research. |
| Geometry persistence | P negative search, U overall | No localStorage, sessionStorage, IndexedDB or browser-cookie accesses found in the two inspected bundles. Window geometry is kept in DOM styles during the page lifetime. Durable layout restoration is not established. |
| Global menu/taskbar | U/P | Device launchers and per-window controls are evident; a general application menu or taskbar was not identified. |
| Browser compatibility | D, U current validation | Official overview prioritizes Chrome, describes limited Firefox testing and Safari issues. This investigation did not certify the shipped UI in any browser. PiDP needs its own current browser tests. |

The [official overview](https://thehighnibble.com/imsai8080/) presents the browser desktop as access to emulated peripherals rather than only a front panel. Its architectural pattern—device windows with local rendering and lightweight connections—is directly useful, while its hardware, appearance and code remain separate from PiDP.

## Device/application inventory

| Application | Evidence | Discoverable functionality and settings |
|---|---|---|
| **TTY:** | P, D | xterm-based serial terminal; connect/disconnect indicator; keyboard remapping/control modifier; CP437 versus ISO-8859-1 decoding; 80/132-column behavior; sound bell; font zoom/reset; fullscreen fitting; optional Tektronix routing. Socket is `/tty`. Multi-character input is paced, including a longer newline delay. |
| TTY2 / TTY3 | P, U capability | Templates, icons and CSS positions exist, **but the IMSAI startup entry point removes both launchers and constructs only TTY**. Do not report three operational IMSAI terminals based on dormant assets. |
| Terminal compatibility | P, U completeness | ANSI/xterm behavior and selected DEC sequences exist; Cromemco 3102 translation code is present but Cromemco-specific UI is removed in this IMSAI build. Full VT52, VT100 or VT220 conformance is not proven by these observations. |
| **TEK:** | P | Tektronix 4014-style vector display/parser, connection indicator, graphics input and coupling to primary TTY. This is distinct from a second independent serial login. |
| **CRT:** / VIO | P, D | IMSAI VIO display backed by browser graphics; consumes binary display memory/mode updates, exposes focus/connection, fullscreen and capture controls. |
| **DZLR:** | P, D | Cromemco Dazzler graphics; binary updates and browser rendering; aspect/size, fullscreen and screen-capture features. Its machine-specific memory semantics should not be ported as PDP-11 hardware. |
| **ACC:** / CYC launcher | P | Cyclops camera controller: requests browser camera access, processes preview frames, connects to `/acc`, and stops tracks on disconnect. Preview modes can be changed. No camera was activated in this investigation. |
| **JS1:** | P | USB/browser Gamepad API source, joystick axes/buttons, preview and `/d7aio` connection. Hardware mapping is Cromemco-specific. No gamepad was exercised. |
| **CPA:** | P, D | Six control switches and four right-side status indicators, not a full address/data/SR rendering. Packaged panel status/control messages drive power/run/wait/hold/interrupt presentation. |
| **A–D disk drives** | P, D | Dynamically rendered drive icons, inserted/empty presentation, eject, library drag/drop mount, and refresh. Mounting rejects an occupied destination in the frontend. Backend image/guest integrity is not proven by that UI guard. |
| **I hard disk** | P, D | Displayed as a drive, but the inspected mount branch does not implement hard-disk insertion; release notes explicitly retain configuration-file selection/restart as a known limitation. Do not claim complete GUI hard-disk mounting parity. |
| **LIB:** | P | Local disk-image library, mounted-state indication, upload, download, delete and inline rename with Enter/Escape completion. File type/device constraints govern drag/drop. |
| Remote FDC media | P, D | Remote entries use a distinguishing marker/badge; remote mount/eject supported, while rename/delete/download are unavailable for those entries. Panel notifications trigger drive/library refetches. Actual remote-FDC interoperability was not run. |
| **PTR:** / punch | P, D | Load local/library paper-tape bytes, visualize perforations and position/progress, reader/punch connection, and download punched bytes. Browser-generated file handling is separate from physical media. |
| **TAPE:** | P | **Paper-tape** library, not magnetic tape reels: upload, delete, rename, download, drag/drop reader/punch workflows. Intel HEX/Mostek tape bootload offers an explicit confirmation. |
| **LPT:** | P, D | Separate `/printer/` browser window; connection status, form feed, line feed, paper styles/widths, reset, browser print and close. Loads existing spool text and receives live `/lpt` bytes. Full printer escape-code emulation is not established. |
| **MAN:** | P | PDF manual library with thumbnails/fallback icons, opening documents in another browser target, upload/delete and drag/drop. This is an additional discoverable app beyond the overview's short feature list. |
| **CFG:** | P | CodeMirror editor with file list, save/revert and dirty-text comparison; `.conf` enumeration and fetch/PUT. Its launcher is initially hidden in the IMSAI device template even though the editor is constructed. Visibility/workflow may depend on other controls; unrestricted shell execution was not identified. |
| **SYS:** | P, D | Machine/firmware/GUI identity, boot ROM and clock, memory maps, environment, host/platform/network/UART/HAL data, paths, mounted disks and partitions; task table with process/core/priority/stack/utilization data and refresh cadence. |
| SYS actions | P, D | Confirmed host reboot, firmware/update drag/drop, upload progress/result prompts. These are destructive host-management capabilities, not patterns to expose automatically in PiDP. |
| OS selection | I/P | Disk/ROM/configuration and tape bootload form the workflow. A standalone named OS-library/boot-profile app was not identified. PiDP's OS catalog is an adaptation, not a copy of a verified IMSAI app. |
| Native/conventional access | D | Official configuration retains USB/RS232 serial paths alongside browser access. Its host/guest configuration cannot be assumed to describe the PiDP installation. [Configuration reference](https://thehighnibble.com/imsai8080/configure/). |

## Communication and lifecycle findings

The inspected package bundles a purpose-built window manager and application controllers with xterm, CodeMirror, iconv-lite, a touch drag/drop shim, fonts and icons. Embedded package metadata names webpack 4.46, xterm 3.14.5 and CodeMirror 5.39 ranges. These are evidence of the reference's packaging, **not dependency recommendations for a new project**. No React runtime was identified. CSS, templates and some media are embedded in the JS bundle; other assets are addressed by hashed filenames. The console bundle is about 355 KiB gzip; the printer bundle about 13 KiB gzip.

| Boundary | Package-inspected behavior | PiDP implication |
|---|---|---|
| Device streams | Distinct same-host `ws://` endpoints `/tty`, `/vio`, `/dazzler`, `/cpa`, `/ptr`, `/acc`, `/d7aio`; printer uses `/lpt` | Use typed independent channels/capabilities; do not expose emulator RPC to browsers. Modern secure LAN deployment needs an appropriate secure transport policy. |
| Binary rendering | `ArrayBuffer` display/terminal/peripheral data, browser-side canvas/terminal work | Keep rendering on the client; preserve byte streams and explicit frame schemas. |
| Disk/library control | HTTP GET/PUT/DELETE plus PATCH rename at `/disks` and `/library`; timestamp query parameters defeat cache | Separate snapshots from authorized mutations; reject unsafe attach/eject on the authoritative backend, not only in UI. |
| Other file APIs | `/conf`, `/tape`, `/manual`, machine-specific file URLs and uploads | Replace arbitrary-path editing with constrained profile/media IDs for PiDP. |
| Status/actions | `/system` reads, reboot DELETE and bootload PUT; `/tasks` status refresh | Split observation from administration. A diagnostic screen must not implicitly grant host-control rights. |
| Stream disconnect | TTY/display handlers detach and mark offline. CPA disconnect shows an offline/reload prompt and a ten-second reload countdown | Do not replay panel commands on reconnect; keep machine state validity explicit. |
| Automatic refresh | CPA disk-change notification schedules drive/library refetch after a short debounce | Device event notifications can avoid unnecessary filesystem polling. |
| Session ownership | U | No authenticated role/lease or multi-controller arbitration was found in frontend package analysis. Server-side enforcement was not inspected, so lack of frontend symbols is not proof of absent firmware security. |
| Reconnection | P/U | No generic TTY retry timer identified; CPA handles loss by page reload. Durable terminal replay, command exactly-once semantics and multi-browser arbitration are unproven. |
| Persistence | P/U | Media/config changes are sent to host APIs. Browser preference persistence was not found. Backend durability and crash recovery cannot be established from frontend resources. |

## Design lessons and remaining research

Adopt the complete device-workspace organization, consistent connection indicators, direct manipulation of local media, per-application controls and client-side rendering. Implement these independently with modern bounds and capability checks. Improve on the reference where this project requires explicit source/freshness, keyboard accessibility, separate terminal ownership, observer-only operation, mobile layouts and safe recovery.

No live IMSAI interaction was performed; the evidence above is packaged-code/documentation analysis. Unknowns include firmware-side authorization, simultaneous browser behavior, exact packet semantics beyond inspected handlers, queue/backpressure bounds, durable session recovery, mobile accessibility, full terminal conformance, hardware timing and host media-write safety. The complete firmware server and an authorized working reference system would be needed to settle those questions. Neither needs to block the offline PiDP desktop.
