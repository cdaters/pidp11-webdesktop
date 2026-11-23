# M5.23 disk and tape snapshot laboratory

This is a checkpoint-driven private experiment, not a production supervisor. Read
[the report](../../docs/lab/M5.23.md), [device inventory](../../docs/technical/storage-inventory.md)
and [snapshot contract](../../docs/technical/storage-observation.md). Original console
operations and browser observation are separate. The Go collector never runs SIMH
commands; the lab harness does, under the independently verified conditions below.

## Prepare without touching earlier evidence

In the **Mac shell**, inspect Git and running containers; preserve unrelated work.
Back up the preceding evidence first. Reserve a new private parent containing
`m523/inventory` and `m523/rt11`. Never rerun over the recorded `.research/m523`.
Use the exact original image/binary and legitimate RT-11 base hashes in the report.
Stop on missing or different media rather than substituting an unknown distribution.

1. Record the immutable base's hash, length, mode and nanosecond mtime. Copy it to an
   unused `rt11/disk0.work`, independently verify bytes, then make only that working
   copy owner-writable. No historical tape distribution is needed for the CPU test.
2. Build assets with `npm run build:server`. Build private static Linux ARM64 copies
   of `cmd/webdesktop-service` and `cmd/storage-snapshot` with
   `CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build`; place in `rt11/runtime/`.
   These lab binaries are not publication assets.
3. Assemble a readonly `/lab` from the reviewed M5.23 Python helpers plus
   `lab/integration.py` and `lab/pdp11_program.py`. Mount only that directory and a
   fresh writable `/work`. No entire repository, home directory or Docker socket.
4. Use the [established container procedure](../m520/README.md): network none,
   read-only root, all capabilities dropped, no-new-privileges, 128 MiB memory and
   equal memory-swap total (zero swap), two CPUs, 128 PIDs, 64 MiB `/tmp`;
   `PIDP11_ISOLATED_LAB=1`. Confirm names `pidp11-m523-inventory` and
   `pidp11-m523-rt11` are unused. Never replace a conflicting container.

The whole-container budget includes SIMH and the lab; it does not replace the future
96 MiB enforced companion-only/zero-swap gate. No Pi, GPIO, REALCONS connection or
external guest network is involved.

## Original inventory and guest access

Run `python3 /lab/inventory.py` as the **inventory container's Linux command**. It
starts the original diskless simulator, records fixed SHOW output, quits and requires
exit zero. Preserve the output before removing only that exited owned container.

In the **separate RT-11 container**, run `python3 /lab/guest.py` as its foreground
command. It boots the fresh RL02 working copy. `ready.json` alone does not prove
successful guest boot. Use the original console to inspect RT-11 version and idle
prompt before issuing `SHOW CONFIG`, `SHOW DEVICES`, `DIR *.SYS` and
`DIR DL:DL.SYS`. Record actual results and distinguish available handlers from installed
ones. Do not install magnetic-tape drivers or guess tape commands in this subset.

The Mac helper `lab/m521-equipment/request.py WORK guest JSON` provides one private
request at a time. It is operator test IPC, not a browser route. JSON `\r` becomes
Enter; never replay an uncertain command or blindly retry a timed-out request.

Example **Mac shell**, only after verifying the original guest is idle:

```sh
python3 lab/m521-equipment/request.py "$STORAGE_WORK" guest \
  '{"op":"console","data":"SHOW CONFIG\r","wait":0.5}'
```

Inside the **same isolated Linux container**, run `python3 /lab/tape.py` separately.
It creates an unused `/work/tape`, generates one original authored readonly tape,
starts a separate diskless SIMH and executes the reviewed CPU read program. It
requires exact DMA memory bytes, captures each filemark/end-of-image stage and waits
halted for explicit capture/finish requests. This is CPU/device qualification only.
The input path must not exist beforehand; preserve it and the octal listings afterward.

## Capture and publish only verified facts

After independent guest/device review, start the optional observer in the
**isolated Linux shell** with `python3 /lab/start_bridge.py`. It provisions private
TLS/control files and allows only disk/RL0/RL11 and tape/TM0/TM11. Its placeholder
terminal endpoint remains detached and is never contacted.

For the disk, the **Mac operator** submits `{"op":"capture","guest_idle_verified":true}`
to the RT-11 harness. That explicit action pauses the independently idle original
CPU, captures fixed SHOW/named-register facts and hashes the unchanged working image.
Review `capture.json`: actual attachment, controller, ready/no-error bits, length,
hash and preserved guest access. It leaves the CPU paused so media remain quiescent.

Then, within the 30-second capture window, in the **Linux shell**:

```sh
python3 /lab/publish.py disk --independent-capture-verified
```

`publish.py` normalizes the inspected fixed fields into a new private configuration
and invokes the real `storage-snapshot` utility. The utility independently rereads
and hashes media, then submits one revision-bound publication. It cannot capture,
pause, resume, mount or command the guest. On a rejection, retain the config and raw
capture; do not replay uncertain publication or alter its timestamp to obtain a pass.
A genuinely new capture requires a new independent original-console checkpoint.

For tape, submit `{"op":"capture"}` to `WORK/tape`, while the original CPU remains
halted after its completed read test. Review the final known stage, status and hash;
invoke `python3 /lab/publish.py tape --independent-capture-verified` in Linux. The
parser requires the demonstrated end-of-image sequence; it is not a generic tape
status decoder. Earlier stages remain in `tape/stages.json`.

After a successful disk capture, the independent Mac operator sends
`{"op":"continue"}` to return RT-11 to its original console. The browser does not
resume it. Run a conventional directory request to verify independent access.

## Browser, resources and restart

In the **Mac shell**, `python3 lab/m523/forward.py --guest rt11` supplies a fixed
loopback-only TLS relay to the network-none container, with at most 32 connections.
Run `lab/m523/browser.mjs` with `PIDP_STORAGE_WORK` set to the reviewed private
`.../m523/rt11` directory. All three engines compare every displayed field with the
independent capture. Stale is a legitimate expected label after 30 seconds; no
refresh can make an old capture current. Screenshots and credentials stay private.

The **Linux** `resources.py` makes 100 bounded authenticated metadata requests and
samples only the actual observer process. It does not measure guest block I/O.
`revoke.py` explicitly retires the two exact tested generations. `stop_bridge.py`
checks the original bridge PID/executable and stops only that process. Require its
Unix socket to disappear; confirm the original RT-11 console still answers.

`restart_observer.py` restarts only the optional service from its unchanged config.
No capture or terminal approval is persisted. The **Mac** `restart-check.mjs` verifies
empty storage inventory, 404 for both old generation URLs, no automatic request on
window open, and explicit unavailable state after refresh. It neither recovers
records nor approves a new device.

## Finish and preserve

1. Stop the actual observer with its exact helper, then confirm conventional RT-11
   `DIR DL:DL.SYS` still answers. No browser-only close substitutes for process stop.
2. Send `{"op":"finish"}` to the halted tape harness. Require its original simulator
   to exit zero; preserve the readonly image and register/DMA evidence.
3. At the independently verified RT-11 idle monitor after all file/device activity,
   send `{"op":"finish","guest_idle_verified":true}`. Require container exit zero
   before removing that owned container. No generic broad process kill.
4. Stop the owned relay/preview/mock processes, preserve unrelated resources, and
   compare the immutable base's hash/metadata and readonly tape hash with baseline.
   Keep disposable disks, captured facts and failed-attempt logs; do not restore over
   originals or overwrite older experiments.

The public `results/` contains curated metadata, hashes and measurements. It excludes
media bytes, private credentials, complete console transcripts and runtime binaries.
Use backend/frontend/browser regression fixtures separately; never interpret those
fixtures as genuine guest/device behavior. The report records corrections and limits.
