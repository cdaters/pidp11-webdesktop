# Original simulator storage inventory

This inventory concerns the exact retained, unmodified-source laboratory build,
not every SIMH release or the owner's current Pi. M5.23 ran `SHOW VERSION`,
`SHOW CONFIGURATION` and fixed `SHOW device` commands in a fresh diskless instance.
[Sanitized output](../../lab/m523/results/inventory.json),
[source hashes](../../lab/m523/results/sources.json), and [experiment report](../lab/M5.23.md).

Source: Oscar's repository at
[`26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75`](https://github.com/obsolescence/pidp11/tree/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/02.3_simh/4.x%2Brealcons/src).
Runtime: **PDP-11 V4.0-0 Current REALCONS**, build November 17, 2026; FrontPanel API
12. Executable SHA-256:
`f38167163e37dbb9578f33cc58f9740e3a6408829c4e357637b76835864c8237`.
The original source/build and retained PTY compatibility shim are documented in
[M3](../lab/M3.md); no new simulator modification was made.

## Disk families

All inventory-start units were unattached. “Disabled” is a configured state, not
absence of compiled support. Unit counts below describe media units, excluding
controller-internal timer/queue units. Geometry/capacity for an unattached or disabled
family is not a measured attached medium. The default inventory CPU was 11/73;
the actual RT-11 test used 11/70, so RL changed from RLV12 to RL11 accordingly.

| SIMH family | Historical controller / media | Media units | Observed default / capacity scope | Guest evidence and observation restrictions |
|---|---|---:|---|---|
| RK | RK11/RKV11, RK05 cartridge | 8 | Enabled, 1247 KW display per unit, write enabled | RT-11 RK handler file exists, not installed; no new guest test. Named RK registers are candidate captured status only |
| RL | RL11/RLV12, RL01/RL02 cartridge | 4 | Enabled/autosize initially; qualified RL0 explicitly RL02 | RT-11 resident DL driver boot and directory access passed. This is the implemented disk snapshot subset |
| HK | RK611, RK06/RK07 | 8 | Enabled/autosize, 6944 KW display default | RT-11 DM installed; no mounted-volume test this milestone |
| RP | RH Massbus, RP04/05/06/07 and RM02/03/05/80 | 8 | Enabled, Massbus adapter RHA, model-dependent geometry | Retained V7 lab config uses RP0/RP06; RT-11 DP installed. No new RP browser qualification |
| RQ, RQB–RQD | MSCP; selectable RQDX/UDA-family controllers, RD/RA disks and RX50/RX33 floppies | 4 per controller | RQ enabled as RQDX3; units 0–2 RD54, unit 3 RX50; B–D disabled | Retained RSX boots RQ0 autosized. RT-11 DU present but not installed. MSCP packets are not decoded by M5.23 |
| RX | RX11, RX01 floppy | 2 | Enabled, 256 KB display, write enabled | RT-11 DX present/not installed; no new mounted-volume result |
| RY | RX211/RXV21, RX02 floppy | 2 | Disabled; single/double density format choices are source-defined | RT-11 DY present/not installed; no new qualification |
| RC | RC11/RS64 fixed-head disk | 1 SIMH unit representing configured platter capacity | Disabled | No guest/controller experiment; capacity/geometry of an attachment unknown |
| RF | RF11 fixed-head disk | 1 SIMH unit representing configured capacity | Disabled | RT-11 RF present/not installed; no attachment or guest qualification |
| RS | Massbus RS03/RS04 fixed-head disks | 8 | Disabled in SHOW CONFIGURATION | Source/device inventory only; no new guest or browser result |

The disk modules define write-enable/lock and device-specific register state. Supported
image formats vary: RK/RX have their own raw representations; the RL/HK/RP/RQ/RY/RS
modules use the disk library to differing degrees. A format advertised by the global
framework is not proof that every controller accepts it. Only the tested RL02 SIMH
flat image is admitted by the new collector. Other attached formats, exact per-model
geometry, readiness and activity remain unqualified; no default animation is used.

For the qualified RL02, the original source defines **512 cylinders × two heads ×
40 sectors × 256 bytes = 10,485,760 bytes** logical capacity. The legitimate image
has **10,478,080 stored bytes**. Both values are displayed separately; a host file's
length is not the controller's geometry. At capture RL0 was attached/write enabled,
RLCS was octal `000315` (done, without controller error), and RT-11 had returned a
real directory listing through the resident DL driver.

## Tape and related transports

| SIMH name | Controller / transport family | Media units | Exact-build evidence / current qualification |
|---|---|---:|---|
| TM | TM11/TU10 nine-track tape | 8 | Enabled by default, SIMH format, unlimited configured capacity. TM0 readonly authored image, real CPU DMA, two filemarks and end-of-image qualified |
| TS | TS11/TSV05 | 1 | Compiled, disabled. RT-11 MS handler present/not installed; no new guest/controller test |
| TU | Massbus TM02/TM03; TU16/TU45/TU77 models | 8 | Compiled, disabled. RT-11 MM handler present/not installed; no new device test |
| TQ | TQK50/TMSCP, selectable transports | 4 | Enabled as TK50, 94 MB nominal model, 98 MB capacity display. No TMSCP decoding/guest tape qualification |
| TA | TA11/TU60 cassette | 2 | Compiled, disabled; RT-11 CT installed, but no attached cassette qualification |
| TC | TC11/TU56 DECtape | 8 | Compiled, disabled; RT-11 DT present/not installed. Its source position is in lines, not the TM byte-offset contract |
| TDC | TU58 serial cartridge emulation | Two units per configured serial controller | Present/disabled in default configuration; not qualified as a TM-style reel transport or included in the collector |

The TM module explicitly supports SIMH/E11/TPC/P7B format selection; other tape
modules have their own flags and restrictions. M5.23 admits **SIMH tape only** and
never changes format. The original representation contains little-endian record
lengths, record bytes, odd-length padding and a trailing length; a zero length is a
filemark. The qualification image has one 42-byte authored record and two filemarks,
58 bytes total. No historical distribution tape or tape content is published.

TM `POS[0]` is the simulator's logical image offset: 0 → 50 after reading the record,
54 → 58 after filemarks, still 58 after reading beyond the image. It is not the host
C stream's cursor, number of physical records traversed or tape length in feet.
`MTS`/`UST` showed EOF on each filemark. Reading beyond the image produced the original
bad-tape/error status via `MTSE_EOM`; this is distinct from configured-capacity EOT.
Expected EOF can also set the controller error summary. The browser preserves these
captured facts without pretending an error summary means unexpected lab failure.

## Installed guests versus available handlers

Fresh M5.23 RT-11SJ (S) V05.03 `SHOW CONFIG`, `SHOW DEVICES` and `DIR *.SYS` confirmed:
DL resident; CT/DM/DP/TT installed; MT/MS/MM/DU/RK/RF/DX/DY and many other handler
files present but not installed. Availability of `MT.SYS` is **not** guest tape access.
COPY and directory utilities have previous genuine console evidence; a matched
magnetic-tape label/record/utility workflow has not been qualified. M5.23 deliberately
uses authored CPU/controller tape evidence, rather than claiming the handler is
missing or inventing a guest tape command.

Retained legitimate configurations, not newly replayed in this milestone:
[V7](../../lab/m50/guest.ini) uses RP0/RP06; [RSX and RSTS profiles](../../lab/m512/guest-inventory.py)
use RQ0 and two RL01 units respectively. Their earlier guest results establish those
specific configurations, not browser storage telemetry or support for every driver
listed here. Unknown guest support remains unknown until tested.

For general background, the [Open SIMH PDP-11 guide](https://opensimh.org/simdocs/pdp11_doc.html)
and [simulator guide](https://opensimh.org/simdocs/simh_doc.html) describe controller
families and tape representations. Exact-build claims above come from the pinned
local sources and actual inventory, not newer documentation alone.
