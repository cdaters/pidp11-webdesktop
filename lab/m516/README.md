# Reproducing M5.16

Use a Mac development shell and disposable Linux only. No Pi, SSH, GPIO, guest
media download or model is required for the first two sections. Read the
[review entry point](../../docs/security/M5.16-review.md) and
[measured report](../../docs/lab/M5.16.md). Keep all generated secrets, disks,
process mappings and raw console/byte records under fresh private ignored paths.

## Ordinary and independent-adapter checks

The review tree is `87bc750543154f65489f91413ce33ceda0b6f6e5`. Its application
behavior is the M5.15 implementation; M5.16 adds tests and laboratory tools.
With Node 22.18+, Go 1.25+ and Python 3 installed, in the repository root:

```sh
npm ci
npm run doctor
go vet ./...
go test -race -count=1 ./...
npm run check
npm test
npm run test:integration
python3 lab/m516/review_checks.py --run --output "$PWD/.research/new-review"
PIDP11_CONTRACT_TLS_TEST=1 go test -race -count=1 ./internal/replicant -v
node --test lab/m515/instrumentation.test.mjs
npm run build
```

The review runner checks every named test before executing. Output must be a new
absolute directory; failure stops the sequence and preserves its logs. The TLS
probe needs `-count=1` because Go's cache does not track Node's transitive imports.
It supplies its own temporary trusted certificate and fake credentials. Browser
lifetime and expiry controls belong only to the test server.

For the optional UI, use installed Playwright engines and run:

```sh
node lab/m516/selection-ui.mjs "$PWD/.research/new-selection-ui.json"
```

This runs the actual optional UI script with labeled HTTP fixtures and an advanced
browser clock. It tests local receipt deletion/history-reset events, not upstream
history erasure, real-model retention or independent OS identity.

## Linux review without SIMH

`Dockerfile.review` needs only Python on a pinned Debian base. It contains no
application, simulator or media. The following Mac-shell preparation downloads
tools while building; the actual checks have no network. Use a new output path:

```sh
docker build -f lab/m516/Dockerfile.review -t pidp11-review-tools:local lab/m516
mkdir -m 700 .research/new-linux-review
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go test -c \
  -o .research/new-linux-review/terminalservice.test ./internal/terminalservice
docker run --rm --name pidp11-owned-review --network none --read-only \
  --cap-drop ALL --cap-add CHOWN --security-opt no-new-privileges \
  --memory 128m --memory-swap 128m --pids-limit 64 --tmpfs /tmp:rw,size=32m \
  -e PIDP11_ISOLATED_LAB=1 -v "$PWD/lab:/lab:ro" \
  -v "$PWD/.research/new-linux-review:/work" pidp11-review-tools:local \
  sh -c 'python3 /lab/m512/supervisor_test.py && /work/terminalservice.test -test.run "TestControlRejectsForeignOwner|TestPrivateFileRejectsForeignOwner|TestPrivateInputsAndControlSocket" -test.v'
```

The recorded image used Python 3.13.5; package repositories may advance even with
a pinned base. [Environment results](results/environment.json) record the actual
image identity and tool versions. The recorded host is ARM64; choose matching Go/image architectures on another
host and label that separate coverage. The only added capability is ownership
change inside temporary test directories. No permission-override capability is
required. A first M5.16 run omitted the isolation variable and was refused. The
next exposed an old test assumption about root permissions; the corrected test
requires the actual owner-refusal error, restores its temporary directory owner
and then checks that no socket exists. Production enforcement was unchanged.

Four real Linux child/socket cases and three ownership/private-input cases passed.
They are distinct from deterministic manager renew/expiry fixtures. To qualify
the native status recorder separately in network-none Linux, mount `lab/m516`
read-only and run `python3 /lab/process_evidence_test.py`. Its one test uses four
explicit controls: exit 139, SIGSEGV, deadline SIGKILL and executable-permission
refusal. These are synthetic controls, not the original Go crash recurring.
`M516_CONTROL_RESULT` optionally writes their summary to a private writable path.

## Bounded ARM64 recurrence capture

Follow the [separate-kernel preparation](../m515/README.md#separate-arm64-kernel).
Use the diagnostic image only for QEMU, with two vCPUs, 768 MiB guest memory and
no virtual network device. Keep the enclosing owned environment bounded and
network-none. A new ext4 image belongs on native outer-Linux storage; an explicit
9p work share supplies the second filesystem context.

Copy the reviewed `process_evidence.py` and `kernel_probe.py` into the private work
share. Supply exact preserved original/current executables in `kernel-input/`;
verify the hashes in [results](results/arm64-provisions.json). A newly rebuilt
executable is not automatically the original M5.13 binary. The exact originals
are not distributed with this repository.

The probe performs **one** immediate copy/execution per binary/filesystem pair,
then one separately identified original-runtime syscall trace. No loop repeats
an uncertain provision. Every case records hash/mode/size, kernel/mount identity,
native `wait4` status, exit versus signal, resource limits/events and timestamped
lifecycle observations. Private `/proc` snapshots may precede exec or miss a very
short runtime phase; the separately recorded syscall trace is additional evidence.
The tracer's wait status belongs to strace, not its child.

The recorder uses a deadline of at most 60 seconds, a 1 MiB per-file output bound
and disabled core dumping. It changes no global core pattern. Its trace uses raw
write arguments to avoid printing private file contents. A parent exception or
deadline reaps only the owned new process group, records that intervention and
preserves the attempt directory. A 139 result must be interpreted from native
status: explicit exit and SIGSEGV are different observations.

M5.16 booted a verified copy of the prior clean diagnostic image, ran the new probe,
then reused the M5.15 cgroup resource check. This was not another systemd install.
Keep the 96 MiB/zero-swap guard, detached startup and clean SIGTERM result. Sync,
remount the guest root read-only and require actual QEMU poweroff.

**Export from the correct filesystem before removing the owned container.** The
inner guest's `/root/m516` is inside its ext4 disk, not the outer container's root.
M5.16's initial outer tar failed; its empty archive was rejected. The powered-off
full disk was copied before removal and retained read-only, then inspected with
read-only `debugfs rdump`. Both binary hashes and native configuration files were
verified in the recovered export. Use explicit checked commands; never let a
failed copy/export fall through into deletion. Retain failed artifacts separately.

## Genuine guest and plotting comparison

Use the [existing original-SIMH procedure](../m511/README.md) and
[media preparation](../m512/README.md) with fresh independent working copies.
M5.16 uses `.research/m516/v7`, `bsd`, `rsx` and `rt11`; the original SIMH image,
source and media bases remain unchanged. The public summaries contain hashes,
not disk images, private tokens or raw console transcripts.

The V7 fixture uses the original `lab/m551/serve.py` with `lab/m59/guest.ini` and
the existing M5.9.2 device/provider options. Keep one outstanding request per
harness and use the exclusive wrapper for all cooperating V7 campaigns:

```sh
PIDP551_WORK="$PWD/.research/m516/v7" node lab/m516/run-exclusive.mjs lab/m59/browser.mjs
PIDP551_WORK="$PWD/.research/m516/v7" M516_PLOT_MODE=direct \
  node lab/m516/run-exclusive.mjs lab/m516/plot.mjs
```

Wait for successful completion before the next action. Direct mode observes guest
markers/file length and browser frames/parser/SVG, with no intermediate serial
tap. It explicitly leaves that unmeasured boundary null. It is less instrumented,
not an instrumentation-free timing benchmark.

Then stop the **actual bridge**, verify HTTPS is closed, change only the private
lab endpoint from 40100 to the tap on 40200, and start the M5.15 serial tap. Restart
the bridge detached; the next test explicitly approves the same inspected guest:

```sh
PIDP551_WORK="$PWD/.research/m516/v7" M516_PLOT_MODE=tapped \
  node lab/m516/run-exclusive.mjs lab/m516/plot.mjs
```

Each mode runs Chromium, Firefox and WebKit once, with unique attempt directories,
begin/end markers, a retained guest pipeline file and bounded waits. Failure does
not replay a command or proceed to peripherals. The serial tap observes delivery
at its forwarding boundary; no separate production bridge read counter was added.
Do not claim identical byte counts establish latency or identify the old fault.

After plotting, run the original three-phase [LP11/PC11 procedure](../m592/README.md)
with the labeled provider fixture and exclusive wrapper around `equipment.mjs`.
Verify every final byte download, EOF and producer HALT before accepting it. Finish
the actual device producer before V7 shutdown. The browser has no device-phase API.

For BSD/RSX/RT-11, inspect actual boot/login/application prompts before approval.
`start_guest_bridge.py GUEST --guest-and-line-verified` runs inside the already
owned network-none container; it starts only the copied companion on the fixed
lab port. `stop_guest_bridge.py GUEST` checks the recorded executable, stops that
exact bridge and verifies closed HTTPS and removed socket before guest shutdown.
The companion never owns the simulator lifecycle.

- BSD: original `bsd-inventory.py`, explicit `unix` and multiuser boot, then
  `M592_EXPANDED=1 BSD_RUN=m516 PIDP_BSD_WORK=... BSD_SCREENSHOT=... node lab/m591/bsd-browser.mjs`.
- RSX: original inventory profile, wait for actual date and final boot completion,
  then `PIDP_RSX_WORK=... PIDP_RSX_SCREENSHOT=... node lab/m512/rsx-browser.mjs`.
  A terminal-ID response must not be sent after its timeout into a date prompt.
- RT-11: fresh rescue/generated copies, explicit `BOOT DL1:M513FB`, verify
  `SHOW CONFIG`, run original MTTEST and wait for its known console-line prompt.
  Use `lab/m513/rt11-browser.mjs` and then `rt11-ast-browser.mjs` with
  `PIDP_RT_WORK` / `PIDP_RT_SCREENSHOT`. Retain the known status-word mismatch.

Stop each actual bridge first. Require BSD disk synchronization/HALT, RSX final
dismount/SHUTUP/HALT, RT-11's idle monitor after console termination and V7 syncs
before SIMH quit. Inspect exit status, retain working media and original consoles,
then remove only those exited containers and exact relays. No global process kill
or container/volume prune is part of this procedure.

## Published alpha versus development source

Follow [the public source-alpha guide](../../docs/getting-started/source-alpha.md)
for the exact M5.13 asset. Verify archive/checksum bytes and regular member paths
before extracting into a new private directory. Verify `SOURCE_SHA256SUMS`, then
`npm ci` and run its loopback preview. The old archive has no `npm run doctor`.

`onboarding.mjs URL NEW_RESULT` checks real Chromium HELP, simulation labeling,
sample print and exact offline arithmetic against an owned preview on 5175
(published) or 5176 (development). It intercepts no API and requires no model or
Pi. The caller starts and stops its exact preview process and verifies the port
closes. Run current source from a separate clean clone; never overwrite the alpha.
M5.16's clean clone at `9dd04fd` additionally ran the 47-case reviewer sequence,
uncached TLS, units/type checking and package build. The later `87bc750` commit
adds only the independently tested minimal Linux review Dockerfile.
