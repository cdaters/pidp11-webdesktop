# M5.22 equipment operation and recovery laboratory

Read the [operator guide](../../docs/technical/equipment-operator.md),
[history contract](../../docs/technical/equipment-history.md) and
[measured report](../../docs/lab/M5.22.md) first. The guide is the repeatable human
workflow; these helpers orchestrate the recorded private experiment. They are not
an emulator-management service or permission to operate physical hardware.

## Prerequisites and fresh evidence

Use the [M5.20 lab prerequisites](../m520/README.md) and verified original image/media
identified in the M5.22 report. No helper downloads historical operating systems.
In the **Mac shell**, inspect processes, preserve earlier experiments and reserve a
new private parent containing `m522/rsx` and `m522/rt11`. The actual retained root
`.research/m522` must never be reused. Record base hashes, lengths, modes and mtimes
before copying into owner-writable `disk0.work`. Do not overwrite immutable bases.

1. Build browser assets with `npm run build:server`. Build private static Linux
   ARM64 copies of `cmd/webdesktop-service`, `cmd/equipment-supervisor` and
   `cmd/equipment-records` using `CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build`.
   Place them under each private work directory's `runtime/`. These are lab builds,
   not public binary assets. Do not build while another process changes embedded assets.
2. Assemble a readonly `/lab` containing the reviewed M5.22 Python helpers and
   `lab/integration.py`. Mount only that directory and the fresh writable `/work`.
   Use network none, readonly root, all capabilities dropped, no-new-privileges,
   128 MiB memory/equal memory-swap total (zero swap), two CPUs, 128 PIDs and a
   64 MiB `/tmp`. Set `PIDP11_ISOLATED_LAB=1`. Preserve unrelated containers.
3. Use only unused names `pidp11-m522-rsx` / `pidp11-m522-rt11`; the fixed Mac relay
   targets these names through Docker context `orbstack`. Inspect before creation.
   A conflicting name is a stop condition, not permission to replace a container.
4. Prepare readonly `reader1.bin` and `reader1.json` containing `bytes`, `sha256`,
   `format`, `provenance` and independent records. RSX: 16 NUL bytes, 800 CRLF lines
   `M5.22 RSX TAPE RECORD nnnn - ORIGINAL PRDRV AND PPDRV`, SUB; 44,017 bytes.
   RT-11: 16 NUL bytes, three CRLF lines `M5.22 RT11 PAPER TAPE RECORD n`, SUB;
   113 bytes. Printer/punch spools must not yet exist. Create `/work/archive` mode
   0700. Credentials/configurations/working disks and raw captures remain private.

## Independent guest and observer preparation

The **isolated Linux shell** runs `python3 /lab/guest.py rsx --pc11-fixture` or
`python3 /lab/guest.py rt11` as its foreground harness. The latter initially
attaches only the printer; prepare PC11 independently at the idle monitor after
verifying installed handlers. `ready.json` is a process record, not proof of guest
readiness. Inspect the original console, version, devices and utility identities.
For the tested RT-11 copy, independently verify CT/DM are unused before removing
those handlers and installing LP/PC. This is a disposable guest configuration only.

After verified readiness, in the **same isolated Linux container**:

```sh
python3 /lab/start_bridge.py rsx --guest-and-devices-verified
python3 /lab/operator_driver.py first --guest-and-devices-verified
```

Use `rt11` for both arguments on the RT-11 run. The bridge configures `lp` and
`punch`; its terminal endpoint remains detached. The driver prepares a new private
supervisor configuration and feeds the actual guided CLI. It accepts one private
request at a time in `supervisor-request.json`, containing `request_id` and a single
`line` such as `begin lp rsx-print-1`; inspect the matching response before proceeding.
Never retry an uncertain request. For manual use, follow the operator guide directly
instead of this test adapter. Guest/monitor IPC is a separate private interface.

In the **Mac shell**, `python3 lab/m522/forward.py --guest rsx` exposes only loopback
TLS for that fixed container, bounded to 32 connections. Use `--guest rt11` only
after stopping the RSX relay. Browser helpers obtain local private lab credentials;
never commit those files or the raw console logs.

## RSX sequence and restart boundaries

1. Independently verify LP/PR/PP Loaded, PIP identity and idle tasks. Run
   `print_job.py WORK 1 --guest-and-device-verified` in the **Mac shell**. It submits
   the known original-console print subset, checks original ready registers and
   closed-file bytes, and submits ordered completion to the guided operator.
2. Begin `punch` with a new job and exact configured reader checksum. Before output,
   set the original PTP TIME to decimal 10,000 only at the independently safe monitor
   boundary, recording its original decimal 100. This disclosed delay makes actual
   growth observable; it is not a default-performance qualification.
3. Run the Mac `live-punch.mjs` with `PIDP_RSX_WORK` and `M522_JOB=1`; it selects the
   empty generation in Chromium before using separate private console IPC for PIP.
   In Linux, `resource_sample.py NAME` samples the actual observer/supervisor.
   After verified utility return, `complete_punch.py WORK 1 --guest-returned-verified`
   checks device drain/EOF, safe close and exact output before completion.
4. Explicitly save both records using the operator guide or `archive_jobs.py JOB...`
   inside Linux. Independently closed first spools are renamed `lp-first.out` and
   `punch-first.bin`; private guest `next-job` with `guest_safe:true` establishes unused empty
   paths at the same configured slots. Inspect the boundary before requesting it.
   Repeat job 2 (Firefox), then preserve `lp-second.out` / `punch-second.bin`.
5. Run `verify_history.mjs` on the Mac with `PIDP_EQUIPMENT_WORK` and
   `M522_HISTORY_PHASE=before-restart`. It compares all three engines against original
   closed spool bytes and checks stale live generations fail. It does not approve jobs.
6. Independently prepare the third empty spool and begin a distinct job. `expire.mjs`
   observes actual output in WebKit, sends guided `quit` and verifies expiry/incomplete
   bytes. Save that terminal record. A fresh supervisor must reject completion of an
   unowned job; preserve the rejection rather than reapproving the partial spool.
7. `stop_bridge.py` checks the exact bridge PID/executable before stopping it. Confirm
   the original console still answers. `restart_observer.py` starts only the optional
   observer and requires empty history/detached views; it never starts SIMH. Explicitly
   recover the five saved record IDs with `equipment-records -confirm-retained-data`.
   Repeat `verify_history.mjs` with `M522_HISTORY_PHASE=after-recovery`. Old live URLs
   must stay retired. The later safe close of a third output cannot complete its
   expired historical record retroactively.

The helpers are inspected, checkpoint-driven tools, not one unattended launch script.
Stop on unexpected prompt/register/identity/length/hash or uncertain acknowledgement.
Do not broaden device commands to get a passing result.

## RT-11 and cleanup

After the independent original-console readiness checks above, the Mac `rt11.mjs`
uses `PIDP_RT_WORK`: Chromium approves observation of empty outputs before console
COPY operations, then checks original ready/POS/EOF, safe close and exact downloads.
Use `verify_history.mjs` with `PIDP_EQUIPMENT_WORK` pointing to RT-11 and
`M522_HISTORY_PHASE=rt11`. Save both completed records. This verifies genuine device
output in the browser, not a browser login shell or sustained small-job live growth.

Stop the actual guide and bridge before guest shutdown; confirm independent console
operation. In RSX restore PTP TIME 100, run the verified SHUTUP procedure, require
final disk dismount/HALT, then request harness `finish`. For RT-11 confirm idle
monitor after completed file/device operations before `finish`. Record exit codes
before removing only owned containers; stop their relays/preview. Preserve working
media and raw evidence. Compare immutable bases against the recorded hashes and
metadata, plus existing tags/release metadata. Never terminate unrelated processes.

Read-only artifact revalidation in the **Mac shell**:

```sh
python3 lab/m522/verify_artifacts.py PRIVATE_M522_ROOT
```

It regenerates authored transformations and independently checks all seven archived
record envelopes and retained ranges. `results/` contains sanitized measurements;
private credentials, guest media, binaries and full transcripts are excluded.
The recorded late browser presentation/cancellation corrections use regression
fixtures separately from the genuine run. See the report for precise test scope.
