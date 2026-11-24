# M5.24 historical storage laboratory

Plan recorded before execution. All work uses fresh private media, the pinned
original SIMH/REALCONS executable and independent original console in network-none
ARM64 Linux. REALCONS is disconnected. The collector cannot issue monitor or guest
commands. Earlier experiments and the M5.23.1 interoperability proposal are untouched.

## Selected tape workflow

RT-11SJ (S) V05.03 on RL02 is the first choice: its M5.23 inventory contains MT.SYS
(nine disk blocks), PIP and DIR. The original installed handler table reports
MT CSR 172520, vector 224; MS and MM are not installed. DEC's Installation Guide
AA-H376F-TC section 2.6.10 maps MT to TM11, MS to TS11 and MM to TJU16, not by name
similarity. Its Device Handlers Manual AA-PE7VA-TC section 2.8 describes the supplied
file-structured module (FSM) used by standard utilities. Later manuals describe
format history explicitly; the actual V05.03 handler and utility must still pass.

Use the original TM11/TU10 emulation and attach an authored readonly SIMH TAP image
while the CPU is initially stopped. `media.py` prepares two files with exact 512-byte
data records and 512-byte VOL1/HDR1/EOF1 labels: AA-PD6PA-TC section 1.2.1, table
1-6 records that labels before V5.5 occupied 512 bytes, unlike later 80-byte labels.
It specifies the header/data/trailer filemarks and two extra marks at logical end.
This is neither a BUP saveset nor a DOS tape. No historical software is fabricated.

From the original RT-11 console, verify SHOW CONFIG/DEVICES and installed HELP.
Use INSTALL MT (and REMOVE an unused handler only if required for a free slot),
then DIR MT0: and COPY/IMAGE of each named file to fresh output names on the
working RL02. COPY is the installed PIP utility; /IMAGE preserves content. Inspect
normal EOF/filemark traversal and an explicit nonexistent-file result. At a verified
idle prompt, independently pause and capture only fixed named TM registers and
attachment facts. Decode recovered files from the quiescent working filesystem and
compare all bytes with independently authored input. No direct bus-address reads.

No tape initialization or writes are needed: the host-authored image has documented
labels and filemarks. The simulator attaches it read-only/locked. Any guest rejection
must be preserved and diagnosed; no uncertain command is replayed automatically.
Only disposable disk outputs and handler installation may change. Keep the same
memory/monitor unless installed evidence demonstrates a requirement to change it.

## Additional disk family

Use a fresh copy of the already verified UNIX V7 RP06 base, 174,423,040 bytes, SHA-256
`fc04dab1e7f2fbf3ea4b44603ed2c9d6ba15f4f86c702d4a27a1dac725966f39`.
This original RP/Massbus setup fits the collector's unchanged 256 MiB bound; the
retained 314,880,000-byte RSX RQ image does not. No limit is raised just to admit it.
Verify original boot and shell/filesystem access, sync at an idle console boundary,
then independently pause/capture RP0 named registers, attached model/hash/size and
source-defined geometry. Return to the console; observer stop must not stop it.

## Boundaries and sources

The fixed harness permits only original-console bytes, explicitly verified idle
capture, continue and guest-safe finish. Requests use the existing one-outstanding
Mac `lab/m521-equipment/request.py` helper, never browser routes. Fresh containers
use read-only root, network none, dropped capabilities, no-new-privileges, 128 MiB
memory with equal memory-swap total, two CPUs, 128 PIDs and bounded temporary space.
This lab-wide budget does not replace future 96 MiB companion-only/zero-swap policy.

Manuals: [installation](https://www.bitsavers.org/pdf/dec/pdp11/rt11/v5.6_Aug91/AA-H376F-TC_RT-11_Installation_Guide_Aug91.pdf),
[handlers](https://www.bitsavers.org/pdf/dec/pdp11/rt11/v5.6_Aug91/AA-PE7VA-TC_RT-11_Device_Handlers_Manual_Aug91.pdf),
[file/tape formats](https://www.bitsavers.org/pdf/dec/pdp11/rt11/v5.6_Aug91/AA-PD6PA-TC_RT-11_Volume_and_File_Formats_Manual_Aug91.pdf),
[utilities](https://www.bitsavers.org/pdf/dec/pdp11/rt11/v5.6_Aug91/AA-M239D-TC_RT-11_System_Utilities_Manual_Part_I_Aug91.pdf).
Private downloaded manuals, working media and raw transcripts stay outside Git.
Final measured results and any corrections belong in the M5.24 report.

## Reproduction sequence and observed result

The completed [M5.24 report](../../docs/lab/M5.24.md) and sanitized [results](results/)
record a successful MT/PIP read of both files and V7 RP06 observation. Scripts are
bounded lab building blocks, not a one-command installer or automatic guest replay.

1. In the Mac shell, prepare a **new** private work directory and copy the verified
   immutable RT-11 and V7 bases to independent writable files. Verify original and
   initial-copy hashes. Never reuse the retained `.research/m524/` directories.
2. Run `media.py NEW_RT11_WORK/tape` once. It refuses an existing destination.
   Independently inspect `expected.json` and its 4,192-byte tape hash. Copy the lab
   harness and retained `lab/integration.py` to a read-only `/lab` mount. Build the
   two Go commands `cmd/webdesktop-service` and `cmd/storage-snapshot` for Linux ARM64
   after `npm run build:server`; place them in the private `/work/runtime` directory.
3. Use the established original-image/network-none container boundary described
   above. Start `python3 /lab/guest.py rt11` or `v7` with one independent `/work`.
   The recorded image digest and exact original executable are in the report.
   Check `ready.json` and original console output before sending input.
4. Send original-console requests with `lab/m521-equipment/request.py WORK guest
   JSON`. Keep one outstanding request. Inspect its returned prompt before each
   next command. RT-11 required `REMOVE CT`, then `INSTALL MT`; no SYSGEN or modified
   driver. V7 required the retained bootstrap `boot`, then `hp(0,0)unix`.
5. Execute the documented tape commands, verify the idle prompt, then request
   `capture` with `guest_idle_verified:true` and a fresh `name`. Run
   `verify_tape.py RT11_WORK` only while paused or after shutdown. It reads the
   RT-11 directory and compares every output byte without writing guest data.
6. Start the optional observer with `start_bridge.py rt11` or `v7`. After an idle
   boundary and **fresh** capture named `browser-capture`, run `publish.py GUEST
   --independent-capture-verified` immediately (30-second acceptance limit).
   The simulator stays paused during whole-image verification; a stale capture must
   be diagnosed, not timestamp-edited. This operator helper cannot contact SIMH.
7. Independently continue the guest. On the Mac, `forward.py --guest GUEST` provides
   a bounded loopback-only lab TLS relay; `PIDP_STORAGE_WORK=ABSOLUTE_WORK node
   lab/m524/browser.mjs` checks all fields and all three engines without interception.
   The fixed helper currently guards M5.24 work paths; adapt it deliberately for a
   later uniquely named run. `resources.py` measures 100 local metadata requests.
8. `revoke.py`, `stop_bridge.py`, `restart_observer.py` and `restart-check.mjs` verify
   explicit retirement, empty restart and 404 old URLs. Stop the restarted observer
   again. Confirm original-console output with TYPE on RT-11 / `ls /` on V7.
9. At RT-11's idle prompt, finish the harness. V7 must complete three `sync` commands
   at its single-user prompt before independent halt/quit. Verify simulator exit
   zero, original hashes/size/mode/mtime, authored-tape hash and final recovered bytes.
   Remove only owned exited containers; stop only owned relays/previews. Preserve
   raw evidence and working disks privately. The observer never performs this cleanup.

Stop at unexpected output or an uncertain response. No automatic command retry,
real hardware, external network, production guest, tape write or browser control.
