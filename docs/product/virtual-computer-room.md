# A genuine PDP-11 computer room

PiDP-11 Web Desktop is an optional browser computer room for genuine PDP-11
computing environments. Terminals, printers, paper tape, storage, communications,
graphics and reference tools should help people use an independently operated
computer. A convincing animated peripheral is a useful demonstration, not a
completed connection to equipment.

There are two equal audiences: owners of physical PiDP-11/70 replicas, and people
running ordinary SIMH PDP-11 installations without a panel. Neither must give the
browser responsibility for running their computer. A physical installation keeps
Oscar's launcher, REALCONS, switches, lamps, console, SSH and Screen independent.
An ordinary installation needs no GPIO, PCB or REALCONS connection. Both can offer
operator-verified guest serial endpoints and optional, separately approved device
observations. M5.19 tests that common workstation boundary in disposable Linux;
it does not qualify new production deployments on every platform.

The High Nibble's [IMSAI 8080esp](https://thehighnibble.com/imsai8080/) is an
inspiration for bringing equipment into a browser. Our device choices and behavior
must follow PDP-11 sources and actual guest tests, not copy another machine's
labels or treat its visual effects as protocol evidence.

## Build useful equipment in dependency order

| Priority | Next useful result | Evidence needed before calling it genuine |
|---|---|---|
| 1. Everyday terminals | Comfortable VT100/VT52/VT220 and teletype work: keys, search, copy, readable display, optional bell | Actual historical applications, explicit ownership, observer/reconnect tests, accessible browser controls |
| 2. Understandable connections | Explain a verified profile, guest terminal driver, current generation and reconnection steps | Independent operator approval; no inferred guest identity or automatic reconnect after port reuse |
| 3. Printer and paper tape | Guest-produced printer jobs; reader input and punch output on disposable media | Installed guest driver/application, exact resulting bytes, completion/EOF, preserved original media and independent console |
| 4. Disk and magnetic tape | Read-only catalogs first, then observed disposable working copies | Known format/provenance, generation and exclusive writable ownership; no browser paths or general mount commands |
| 5. Serial/network equipment | Useful serial bridges, virtual modems and isolated guest links | Actual guest protocol/driver, explicit endpoints and lifecycle; no assumption that SIMH device availability implies guest support |
| 6. Graphics | Extend Tektronix serial behavior, then genuine VT11/VR14 bus-display output | Application-produced vectors for the correct device; Tek output is not VT11 evidence |
| 7. Physical observation | Read-only physical panel status after repairs and renewed qualification | Separately authorized hardware tests and independent panel operation |
| 8. Physical control research | Only narrowly justified, separately authorized operations | Resolve ownership, START edges, crash/polling and actual halt guarantees; no present approval |

Judge work by practical usefulness to both audiences, historical authenticity,
frequency of use, genuine data, reuse across guests, implementation cost,
accessibility and preservation/lifecycle risk. Dependencies may move a small item
forward: connection descriptions accompany terminal controls, for example. Distant
modem or display simulations must not displace working print and paper-tape jobs.
Security, bounded resources and independent operation remain acceptance conditions,
not a substitute for delivering equipment functionality. A new security campaign
needs a demonstrated problem; a release needs separate owner approval.

## One language for equipment

Every window must distinguish **simulation** (local demonstration), **observation**
(actual approved output without control), and **supervised interaction** (narrow
approved input/operation). Disconnected equipment is not simulated live data.
Cached output must remain labeled as a retained observation. Some devices will
always be read-only.

The small [equipment description](../../src/equipment.ts) records identity,
historical role, protocol, supported environments, provider, data direction,
attachment, authority, generation, failure behavior, operations and limits. M5.19
uses it for genuine terminal connection details. It is descriptive, not a plugin
framework, driver implementation, remote-control API or authority token.

| Existing equipment | Current provider / direction / generation | Operations and boundary |
|---|---|---|
| Ordinary front panel | Local model or mock Go hub; simulation; session state | Simulated switches/lamps only; never presented as physical output |
| Mock terminal, printer, paper tape, disk/tape controls | Local browser model; simulation; local window/model lifetime | Local examples and bounded exports; no attached guest devices |
| Guest terminal / teletype / Tek guest display | Go serial bridge; observation or supervised input; explicit attachment generation and keyboard epoch | Copy/save output; approved keyboard/paste; loss disconnects without replay; guest identity remains attested |
| Guest devices: completed LP11/PC11 | Immutable allowlisted export; observation; simulator/guest generation and checksum | View/download approved bounded snapshot; cached result is not a live driver |
| Guest devices: live LP11/PC11 | Approved file follower; observation; producer identities, sequence/offset and renewal | Read/output completion and download; stale approval or missing bytes stops observation |
| Original media observation schema | Offline fixture, separate from the captured storage contract | Descriptive validation only; busy/activity vocabulary is not genuine telemetry |
| Captured RL02/RP06/TM11 storage | Independent local capture and read-only hash collector; bounded service/capture generations | Explicit view/retain, stale/current-unknown labels, no live I/O or media control |
| Standalone 4010 window | Local vector fixture; simulation | Draw/erase/export fixture; genuine Tek is a separately selected guest terminal |
| References / Companion | Local reference corpus or optional explanation provider; no equipment authority | Search, selection review and explanation; AI never receives machine control |

See [terminal capabilities](../technical/terminal-personalities.md),
[device observation](../technical/observed-peripherals.md), and
[graphics boundaries](../technical/graphics-foundations.md) for current contracts.
Future integrations should extract small interfaces from these actual consumers:
a validated descriptor, an explicit generation, a bounded output stream/snapshot,
a cancel/close lifetime and capability-specific operations. Do not build a generic
remote SIMH command channel. Browsers must not supply arbitrary host paths, monitor
commands or mount operations, share writable disks, start emulators or manipulate
physical controls.

## M5.24 equipment progress and next step

[M5.20](../lab/M5.20.md) demonstrates actual RSX PIP printing, a separate RSX
reader-to-punch utility copy and full-byte CPU/device transfer. The existing printer
and paper-tape windows now expose explicitly selected observation/completed modes
alongside simulation. Originals remain independent; only the private lab operator
attached and safely closed disposable media.

[M5.21](../lab/M5.21.md) adds the bounded independent supervisor: live RSX punch
observation before output, repeated jobs/new generations, supervised close and exact
exports. A real supervisor crash expired observation while the original console
continued. RT-11 LP/PC handlers passed a separate console ASCII subset.

[M5.22](../lab/M5.22.md) provides the guided operator, bounded immutable job history,
explicit saved-data recovery, genuine slot reuse/restart tests, RT-11 browser exports
and bounded active measurements. [M5.23](../lab/M5.23.md) adds captured RL02/TM11
attachment/status, real RT-11 filesystem reads and CPU tape DMA/filemarks.
[M5.24](../lab/M5.24.md) now qualifies RT-11 MT/PIP labeled-file reads and V7 RP06
filesystem/captured status, with visible provenance and age. The next recommended
step is the bounded [passive activity feasibility proposal](../technical/storage-activity-proposal.md),
using a separate disposable build and explicit loss/generation semantics. It is not
a current live feed. Further broad LP11/PC11 work needs a demonstrated blocker.
Reader selection currently means a read-only catalog and operator assistance. Do not
expose attachment controls before safe state, authority, cancellation and actual
attachment are independently verified. These subsets do not qualify production media
management, unattended completion or remote physical control.

## Recorded M5.19 recommendation

M5.19 implements terminal workstation improvements and reports their actual
qualification in [the engineering record](../lab/M5.19.md). Source Alpha 2 remains
an immutable experimental source release; development main is a different revision.

The recommended next milestone is **genuine printer and paper-tape workflows**.
Inventory installed guest drivers first. Select one supported guest application,
produce a small identifiable printer job, feed a verified disposable paper tape,
recover punched bytes and compare checksums. Show job completion, retained partial
output and EOF accurately. Preserve standalone console operation and original
media. Extend the existing observation interfaces only where that actual workflow
requires it; do not graduate the simulated equipment merely by adding animation.
