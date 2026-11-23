# M5.20 laboratory runbook

This is an isolated Mac/ARM64-Linux experiment, not a Pi installation guide. Read
[the engineering report](../../docs/lab/M5.20.md) for actual results, failed attempts,
versions, hashes and remaining limits. The public `results/` directory contains
curated measurements, not raw consoles, tokens, working disks or historical media.

## Prerequisites and boundaries

Use the original source/image preparation in [the original lab guide](../../docs/lab/M3.md) and the
verified legitimate bases retained by the [M5.12 inventory](../m512/README.md).
Never manufacture missing media or silently substitute an unknown distribution.
M5.20 used the exact image/binary/media hashes in the report. A fresh clone does
not contain those private inputs. Stop if they are unavailable or differ.

Complete the separately versioned private evidence backup before experiments.
Do not overwrite `.research/m520` from the recorded run. Use an isolated fresh
workspace for a deliberate replay; preserve checkpoints and prior artifacts.
The helper browser paths deliberately require the reviewed `m520/rsx` and
`m520/rsx-pc11` directory suffixes. Keep one outstanding IPC request per harness.
If a request times out, inspect the response, console and process before deciding
what happened. Never automatically replay uncertain input.

The browser has no monitor interface. All attach/detach, pause/continue, EOF checks
and completion approvals below belong to a separately supervised private lab.
`guest_safe` and verification flags are operator assertions, not safety detectors.
They must follow the specified independent checks. Do not adapt these helpers into
an unattended production supervisor.

## Prepare fresh media and guest

In the **Mac shell**, build the application (`npm run build:server`) and a private
static ARM64 `cmd/webdesktop-service` with `CGO_ENABLED=0 GOOS=linux GOARCH=arm64`.
Keep it outside Git. Record the hash. Copy a verified immutable RSX base into a new
`rsx/disk0.work`; independently rehash the copy, make only that copy owner-writable,
and record the original size/mode/nanosecond mtime/hash. For RT-11 inventory, use a
separate copy of its verified base. Do not bind an original guest disk writable.

The recorded container invocation had this shape (Mac shell; `work_dir` must be
the new absolute working directory, and `guest_name` one of the reviewed names):

```sh
docker --context orbstack run --name "$guest_name" \
  --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --memory 128m --memory-swap 128m --cpus 2 --pids-limit 128 \
  --tmpfs /tmp:rw,nosuid,size=64m \
  --mount "type=bind,src=$PWD/lab,dst=/lab,readonly" \
  --mount "type=bind,src=$work_dir,dst=/work" \
  -e PIDP11_ISOLATED_LAB=1 pidp11-realcons-lab:local \
  python3 /lab/m520/guest.py rsx
```

This is a reconstruction of the recorded setup, not a new deployment command that
was run during documentation. The whole simulator/container budget is distinct
from the future companion-only enforced 96 MiB/zero-swap requirement. Preserve
read-only/no-exec isolation: the service executable belongs in the owned
`/work/runtime/` directory, not the container root or `/tmp`.

`guest.py` creates a fresh LPT spool before boot. Wait for RSX **BOOT UP COMPLETE**
and the startup command file's EOF; a date-input timeout can take a minute. Inspect
startup errors. RT-11 uses `guest.py rt11` for inventory only. Helpers expect the
source lab directory at `/lab`, not `/lab/lab`.

Use the fixed private IPC helper from the **Mac shell**:

```sh
python3 lab/m513/ipc.py .research/m520/rsx console $'DEV LP:\r' 1
```

There must be no outstanding `request.json`. This writes to the independent
original console, not a browser endpoint. Inventory `DEV PR:`, `DEV PP:`, `PIP /ID`
and the driver directory as described in the report. The RT-11 inventory uses
`SHOW DEVICES` and `DIR LP.SYS,PC.SYS,PP.SYS`; no handler installation was executed.

## Genuine printer run

1. Independently confirm the fresh RSX guest, idle application line and empty,
   preattached LPT spool. A CR/LF response alone does not establish a prompt.
2. Copy the verified ARM64 service into the owned work directory. In the **isolated
   Linux shell**, run `python3 /lab/m520/start_bridge.py rsx --guest-and-line-verified`.
   This provisions a fresh private configuration and approves only the inspected
   line; it cannot start SIMH. Existing configuration is refused.
3. In a separate isolated exec process, start
   `python3 /lab/m520/observe_printer.py --guest-and-spool-verified`.
   Wait for its ready record and inspect errors. It renews only the exact original
   simulator process identity; this is not automatic authoritative OS detection.
4. In the **Mac shell**, start `python3 lab/m520/forward.py --guest rsx`. This fixed,
   bounded relay reaches only the named network-none container's TLS port. Then run
   `PIDP_RSX_WORK="$PWD/.research/m520/rsx" node lab/m520/print-rsx.mjs` once.
   The public distribution test account used by that helper is not a production
   credential. The script creates one guest file and issues one PIP print command.
5. If browser cleanup fails after PIP returns, do not rerun printing. Preserve the
   screen and console, release ownership, and use `view-printer.mjs` without
   `M520_COMPLETED` to inspect/download the already-existing partial job read-only.
6. Independently verify PIP has returned and no printing task remains (`ACT`). Only
   then send the guest harness a unique `close-printer` request with
   `guest_safe:true`. Its private `request.json`/`response.json` exchange is the same
   as `lab/m513/ipc.py`, with that additional explicitly reviewed field. The harness
   pauses the CPU, requires ready/no-error CSR, closes LPT, and resumes. Inspect the
   returned registers and full file; do not infer flush from idle time.
7. Compare all bytes with the separately recorded input lines. Then send the
   printer supervisor a unique `printer-request.json` containing `op:"complete"`
   and `producer_close_verified:true`. Require its matching response and result.
   It submits a full SHA-256 completion; browser users cannot do this.
8. Run `M520_COMPLETED=1 PIDP_RSX_WORK="$PWD/.research/m520/rsx" node lab/m520/view-printer.mjs`.
   All three engines must download the same original spool. The helper neither
   acquires a keyboard nor repeats the print command.

The recorded print script failed at a click obscured by another window after the
print finished. Its window-raising correction is retained; the whole corrected
script was syntax-checked, not rerun against the existing filename. The separate
read-only verification helpers genuinely passed.

## Diskless CPU paper tape

With that bridge still running, start `python3 /lab/m520/pc11.py` in a separate
owned isolated exec process. It starts a **separate diskless** original simulator,
creates a read-only 12,288-byte reader working copy, and approves a new empty punch.
After its ready record, run in the **Mac shell**:

```sh
PIDP_RSX_WORK="$PWD/.research/m520/rsx" node lab/m520/pc11-browser.mjs
```

Each browser requests exactly one phase through private filesystem IPC. Require
all phase HALTs, positions, byte comparisons, actual EOF CSR and final hash. A
phase timeout must not be replayed. After phase three, send one unique private
`devices-request.json` with `op:"finish"`; require its matching finished response.
This quits only the owned diskless CPU simulator, not the separate RSX guest.

## RSX paper-tape utility

Use a second fresh RSX disk and directory `rsx-pc11`. Before boot, prepare the
401-byte fixture described in `results/rsx-pc11-bytes.json`: 16 NUL bytes, twelve
numbered CRLF records and SUB. Make `guest-reader.bin` read-only and save its exact
hash/record list as `reader-fixture.json`. There must be no existing punch file.
Start `guest.py rsx --pc11-fixture`; it attaches PTR read-only and a new PTP file
**before boot**. Confirm startup and installed drivers independently.

In the **RSX original console**, issue `PIP PP:=PR:` once. Wait for the prompt. Only
then authorize the private `close-pc11` operation with `guest_safe:true`. Inspect
PTR/PTP registers in its result: record positions and EOF before detach. Do not
reinterpret logical EOF as hardware EOF if the actual CSR does not show it.

The recorded test approved the completed file afterward, not a live stream. Stop
the previous actual bridge and Mac relay before reusing port 8449 for this guest.
Verify the new guest and application line independently. Start the separate bridge
with `--rsx-paper-tape` and relay with `--guest rsx-pc`. In the **isolated shell**:

```sh
python3 /lab/m520/publish-rsx-tape.py --producer-close-verified
```

The helper verifies the documented transformation and reader hash before publishing
a bounded completed snapshot. A nonempty spool must not be relabeled as fresh live
output. In the **Mac shell**, run:

```sh
PIDP_RSX_WORK="$PWD/.research/m520/rsx-pc11" node lab/m520/view-rsx-tape.mjs
```

All three completed downloads must match the original punch file. This does not
exercise browser reader-media selection or streaming while RSX punches.

## Verify and clean up

`python3 lab/m520/verify-artifacts.py .research/m520` is a read-only, independent
byte comparison of the retained printer, full-byte CPU transfer and RSX tape
transformation. It uses no emulator or network. Raw evidence stays private.

Stop each actual bridge by its recorded PID after verifying `/proc/PID/exe` and
its ownership; wait for process exit and private socket removal. Stop its exact
Mac relay. Confirm the original console still answers. In **RSX**, run
`RUN $SHUTUP`, answer zero minutes, empty reason and Y. Wait for **SHUTUP operation
complete**, final disk dismount and HALT—not merely the start of dismount. Only
then use `lab/m513/ipc.py ... finish`. RT-11 must be idle at its monitor before
finish. Require container exit zero before removing only the owned container.

Stop owned previews/mock service. Rehash immutable bases and compare size/mode/
nanosecond mtime. Verify unrelated services, accepted refs and release identities.
Retain all working disks, private captures and failed-attempt evidence. Any failed
checkpoint stops dependent operations; preserve data rather than force cleanup.
