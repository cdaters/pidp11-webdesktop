# M5.21 supervised equipment laboratory

These helpers reproduce a **private operator experiment**, not a browser emulator
management interface. Read the [engineering report](../../docs/lab/M5.21.md),
[session contract](../../docs/technical/equipment-sessions.md), and the established
[M5.20 prerequisites and shutdown procedure](../m520/README.md) first. Use only
legitimate retained media, fresh disposable copies and the pinned original lab
image. No Pi, external guest networking, GPIO or production service is involved.
The original console and private monitor harness remain independently owned.

## Before starting

In the **Mac shell**, inspect Git/process state and reserve a new private work root.
The completed run is under `.research/m521-equipment`; never rerun helpers over it.
The older `.research/m521` is unrelated evidence. A reproduction can use a fresh
parent directory containing `m521-equipment/rsx` and `m521-equipment/rt11`, because
the browser scripts deliberately require the expected work-directory suffix.
No helper downloads or creates historical operating-system media.

1. Independently verify original base hashes and metadata, and record them before
   making owner-writable working copies named `disk0.work`. See the report's hashes.
2. Use the existing `pidp11-realcons-lab:local` image and verify its ID/executable
   digest. Copy `lab/integration.py` and the reviewed helpers into a dedicated
   temporary `/lab` mount; do not mount the whole repository. Record helper hashes.
3. Build assets with `npm run build:server`, then build static Linux ARM64 copies
   of `cmd/webdesktop-service` and `cmd/equipment-supervisor` into the private
   `runtime/` directory with `CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build`.
   These binaries stay private. Do not compile against a concurrently changing asset tree.
4. Use the M5.20 container restrictions: network none, read-only root, all capabilities
   dropped, no-new-privileges, 128 MiB whole-container memory and equal memory-swap
   total (zero swap), two CPUs, 128 PIDs, 64 MiB `/tmp`, only readonly lab and writable
   disposable work mounts. Set `PIDP11_ISOLATED_LAB=1`. Confirm container names are
   unused; do not replace unrelated containers. The future physical companion gate
   is separately 96 MiB enforced with no swap.

Create two authored readonly RSX inputs, each 16 NUL bytes, 800 CRLF records and SUB.
Record n in job j is `M5.21 RSX TAPE JOB j RECORD nnnn - ORIGINAL PRDRV AND PPDRV`.
`reader1.json` and `reader2.json` contain `bytes`, `sha256`, `format`, `provenance`
and the independent record list. Confirm 48,817 bytes each. The read-only verifier
below regenerates these records. Printer and punch output paths must not yet exist.

## RSX procedure and ownership checkpoints

The **container Linux shell** runs `python3 /lab/guest.py rsx --pc11-fixture` as its
foreground process. It attaches fresh LP11/PC11 files before boot and publishes
`ready.json`. That file alone is not guest-readiness evidence. Inspect the original
console until startup is complete, verify guest/version and `DEV LP:`, `DEV PR:`,
`DEV PP:` and PIP utility identity. Confirm the DZ11 application prompt independently.

Only then run `start_bridge.py --guest-and-line-verified` in that same container.
It provisions a private optional service, four fixed device slots and an explicitly
approved genuine terminal line. Run `supervisor_driver.py --guest-and-devices-verified`
separately. It verifies the original PID/start/executable and starts the Go supervisor
with a private stdin pipe; it never controls the simulator. Keep its foreground
process/log. The fixed Mac relay `forward.py` serves loopback TLS only and is pinned
to container `pidp11-m521-rsx` and Docker context `orbstack`.

The **Mac operator** uses `request.py WORK guest|supervisor JSON` with at most one
outstanding request. JSON `\r` becomes an actual Enter; a shell string containing
literal backslash-r passed directly to the older IPC helper does not. Never repeat
an uncertain command; inspect the response and original console first.

Example supervisor request, only after independently verifying the fresh spool:

```sh
python3 lab/m521-equipment/request.py "$RSX_WORK" supervisor \
  '{"id":"lp1","operation":"begin","job":"rsx-print-1"}'
```

For punch begin, use the fixed punch slot and exact readonly reader SHA-256 in
`reader_sha256`. A refresh/list operation grants no ownership. The browser needs
explicit sign-in, **Observe device**, refresh, chosen job and **Observe selected
generation**. Reopening a window does not restore a connection.

1. For each printer, operate `PIP LP:=TI:` through the **RSX console**, submit the
   three authored `M5.21 RSX PRINT JOB j RECORD n - ORIGINAL LPDRV AND PIP` records,
   then Ctrl-Z. Save the independent input list as `lpj-input.json`.
2. Inspect prompt/task state, then issue supervisor `guest-returned` with a specific
   evidence description. Only after independent inactive-device checks send guest
   `close-printer` with `guest_safe:true`. It pauses original SIMH, checks ready/no-error
   CSR, records POS, detaches LPT and resumes. Stop if any checkpoint fails.
3. `approve_closed.py WORK lp j --producer-close-verified` checks records, original
   registers and closed-file bytes, then submits drained/closed/complete. This flag
   is an operator assertion, not automatic discovery. First punch approval in the
   actual run was manual using the same checks; later jobs used this helper.
4. For tape, start observation at 0/0 before the utility. The Mac test script
   `live-punch.mjs` uses `PIDP_RSX_WORK` and `M521_JOB=1|2`. It observes in Chromium
   or Firefox and submits `PIP PP:=PR:` through **separate private console IPC**.
   That test orchestration is not a browser monitor route. Original host buffering
   and prompt visibility are recorded separately. The final script includes the
   stronger host-size sampling added after the first run.
5. When PIP has returned and independent task inspection permits it, attest
   guest-returned, then guest `close-pc11` with `guest_safe:true`. Verify PTP CSR
   ready/no error, POS 49,141, PTR POS 48,817 and actual EOF. Approve only the safely
   closed exact output with `approve_closed.py WORK punch j --producer-close-verified`.
6. After all three devices are closed, the reviewed guest `next-job` operation can
   attach the second fixed readonly reader and fresh outputs at an independently
   verified idle boundary. It is private lab harness authority, never a browser action.
   Begin distinct second jobs and repeat the evidence checkpoints.
7. `completed.mjs` uses `PIDP_RSX_WORK` to verify four exact completed exports in
   all three engines. Do this before the interruption test reuses the first slot.

For the second visibility test, the original operator changed decimal PTP TIME
100 → 10000 while paused/idle, using the original supported register, and restored
100 afterward. This makes host growth easier to observe; it is not representative
throughput or a source patch. Do not generalize one timing result to other guests.

## Bounded fault test

After preserving the first completed punch as `punch1-completed.bin`, an independently
verified idle monitor can attach a new empty `punch1.bin` with the original readonly
reader and approve a new `rsx-tape-interruption` generation. The provided `crash.mjs`
uses WebKit, starts genuine PIP via private operator IPC, then kills **only** the
verified supervisor executable after output appears. It checks stale live rejection,
expiry, partial retention, disabled completion and the unchanged earlier export.
Do not run it against another process or overwrite an old spool.

After failure, use the original console to confirm independent operation. Wait for
the utility to finish, inspect ready registers and safely close the disposable
devices independently. Do not retroactively mark the expired generation complete.
A newly started supervisor cannot complete an unowned old job. Preserve failed
requests and logs rather than retrying them. No general fault-injection daemon is installed.

## Secondary RT-11 procedure

Run a separate fresh `guest.py rt11` container with the same isolation. Use installed
HELP and SHOW DEVICES. The report records one memory-limited handler install failure
and its narrowly scoped resolution; inspect the actual installed/unused handlers
before any removal. Do not blindly apply `REMOVE CT:,DM:` to a different configuration.

In the **RT-11 monitor**, the verified subset was `COPY/ASCII TT: LP:` with three
records/Ctrl-Z; `COPY/ASCII PC: T521.TXT`; `TYPE T521.TXT`; and
`COPY/ASCII T521.TXT PC:`. Attach the readonly 113-byte tape and fresh punch only
at an independently verified idle monitor. Check actual ready/POS/EOF and close
before hashing. No RT-11 browser observation or login claim is made by this run.

## Verification and cleanup

After the completed run, this **Mac-shell read-only check** requires no running guest:

```sh
python3 lab/m521-equipment/verify_artifacts.py PRIVATE_EVIDENCE_ROOT
```

It verifies both RSX input/output transformations, preserved first artifact, third
interrupted output and RT-11 transformations. It grants no completion approval and
writes no media. Curated measured results are in `results/`; raw console transcripts,
credentials, working disks and screenshots stay in the ignored private work root.

Stop the exact bridge first, verifying its executable/PID and socket removal; stop
its relay. Verify the original console still responds. RSX must complete
`RUN $SHUTUP` (zero minutes, empty reason, Y), final disk dismount and HALT before
guest `finish` with `guest_safe:true`. RT-11 must be idle at its monitor after
completed file operations/device close. Require container exit zero before removing
only owned containers. Stop owned previews/mock processes; preserve unrelated
services. Recheck original media hashes/metadata, accepted tags and release assets.
Retain private working media. Do not start, contact or change the physical Pi.
