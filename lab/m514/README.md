# Reproducing M5.14

These are Mac and disposable ARM64 Linux laboratory instructions. They are not a
Pi procedure. Read the [report](../../docs/lab/M5.14.md),
[development guide](../../docs/technical/development.md) and inherited
[M5.13 laboratory](../m513/README.md) before running guests. Original media,
accepted packages and earlier evidence must remain untouched. Put credentials,
working disks and raw captures in a new ignored work directory; publish only
reviewed summaries such as [results/](results/).

## Ordinary source checks

From the Mac development shell, with Node 22.18+ and Go 1.25+:

```sh
npm ci
npm run doctor
go vet ./...
go test -race ./...
npm run check
npm test
npm run test:integration
npm run test:replicant
npm run test:selection-contract
npm run build
```

The [browser setup](../../docs/technical/development.md) supplies the required
loopback mock service/preview. Preserve existing evidence by selecting a new
report path:

```sh
PIDP11_BROWSER_RESULTS=.research/m514/browser-results.json npm run test:browser
```

These are fixture checks, not historical guest acceptance. A clean Git clone
should first produce a useful `npm run doctor` missing-dependency error, then
pass after `npm ci`. Start `npm run dev`, verify its actual printed URL and stop
it with Ctrl-C. Docker, historical media and models are unnecessary for this demo.

Build the separate static ARM64 candidate into a fresh destination with
`GOFLAGS=-buildvcs=false sh packaging/build.sh /absolute/fresh/package` and record
its SHA-256. For the recorded run, the executable hash is in
[checks.json](results/checks.json); a different revision/toolchain must be labeled
as a new run. Never overwrite an accepted package to match a recipe.

## Immediate-execution and write-failure diagnostic

`startup.py` requires the existing pinned `pidp11-realcons-lab:local` ARM64 image
from the [original SIMH lab](../../docs/lab/M3.md). It starts no guest or listener.
Use a new named container, network none, 128 MiB memory, zero additional swap,
two CPUs, 64 PIDs, dropped capabilities and no-new-privileges. Mount only a fresh
private Mac work directory at `/work`, the preserved original package read-only
at `/approved`, and this harness read-only at `/harness`. Leave `/tmp` a bounded
no-execute tmpfs and the disposable root overlay writable for native comparison.

Inside that explicitly owned Linux container:

```sh
python3 /harness/startup.py > /work/startup-original.json
```

The helper copies/executes the original binary immediately, up to 12 times per
mount type, compares hashes after execution and stops that case on the first
failure. It preserves a per-case result file in its new work directory, private
stderr and generated configurations. The no-execute case records `EACCES`; do not
remount it executable to obtain a pass. A separate child sets a 100-byte file
limit to reproduce handled partial writes. No parent/system limit changes.

Repeat with `--binary /work/package/webdesktop-service` only after independently
verifying that fresh candidate package. Keep old and new result files separate.
The recorded Mac-host-copy comparison additionally copied each original runtime
from the Mac, then invoked it immediately inside this same container; it was an
operator-run comparison, not a branch of `startup.py`.

Export private native directories named in the result before deleting the exact
owned container. An exit 139, signal, timeout or new mismatch is evidence to
preserve, not permission for an automatic retry or deletion. Raw stderr, traces
and provisioned files are private even if a particular successful run prints no
secret.

## Native ARM64 VM and systemd

The recorded disposable VM was Debian Trixie ARM64, named `pidp11-m514`, with
1 GiB memory, two CPUs, isolated networking and no host integration. Create only a
new owned VM; install Python 3, `strace`, `gdb` and `curl` before disabling its
external `eth0`. Transfer files through VM control, not personal SSH credentials.

Copy reviewed packages to `/root/m514/package-old` and `package-new`, each with
its valid `PACKAGE_SHA256SUMS`, and copy `arm64.py` into the private work directory.
The old package must be the retained M5.13 package, not a newer rebuild mislabeled
as the original. In that **disposable Linux VM**, run:

```sh
python3 /root/m514/arm64.py
```

The helper checks hostname, architecture, offline interface, absent original
installation and package hashes. It performs 12 native provisions, `strace`/`gdb`,
actual missing-installation preflight refusal, disabled installation, repeated
provision refusal, protected detached startup, exact companion SIGKILL, explicit
restart, compatible rollback, memory-controller refusal and restored startup.
It leaves the service stopped. The original installation is deliberately absent;
this is not a successful physical preflight or coexistence acceptance.

If a checkpoint fails, preserve the VM and diagnostics and inspect it before
continuing. The script does not promise complete recovery from every assertion.
After a successful run, export `/root/m514` privately. Use the package's reviewed
`uninstall.sh --purge-private-config-and-account` only in this owned VM; remove its
exact `zzzz-m514-hardening.conf` override, reload systemd and verify the managed
installation/configuration/account are gone. Delete only the owned VM after the
evidence and uninstall checks. The recorded run completed these separate cleanup
steps; they are not silently part of the helper.

The ARM64 ownership/provision tests were also cross-compiled from
`internal/terminalservice` and `cmd/webdesktop-service` and run as root inside this
VM, so real directory ownership checks ran. The four Linux process/socket tests
are reported in [linux-supervisor.txt](results/linux-supervisor.txt).

## Genuine guests and device regressions

Follow the inherited [M5.11 guest procedures](../m511/README.md) and
[M5.12 supervision procedure](../m512/README.md). Verify the source hashes in
[media.json](results/media.json), create independent writable copies and use only
the original `/opt/lab/pdp11_realcons` with the established PTY shim. Keep the
read-only-root/network-none/capability and memory bounds and conventional console.
Never attach production media. Stop at a failed checkpoint and inspect state
before any further guest input.

| Check | Harness and separate evidence configuration |
|---|---|
| V7 terminal matrix | `lab/m591/run.sh`, `lab/m59/browser.mjs`; set `PIDP551_WORK` and `PIDP551_PACKAGE` to fresh absolute paths |
| V7 graphics | `lab/m59/graphics-browser.mjs`; use a new `M59_GRAPHICS_SCREENSHOT` path |
| Three-engine equipment | `lab/m592/equipment.mjs` and original `lab/m592/devices-live.py`; explicit deterministic provider fixture, fresh device phase 0, new `M592_SCREENSHOT` |
| BSD matrix | `lab/m591/bsd-inventory.py`, `lab/m591/bsd-browser.mjs`; `PIDP_BSD_WORK`, `BSD_RUN=m514`, `M592_EXPANDED=1`, new `BSD_SCREENSHOT` path |
| RSX text terminal | `lab/m512/guest-inventory.py rsx`, `lab/m511/rsx-browser.mjs`; `PIDP_RSX_WORK` names the fresh private work directory |
| RT-11 application | `lab/m512/guest-inventory.py rt11-rescue`; fresh `rescue.work`, copied generated M5.13 `disk0.work`, explicit guest `BOOT DL1:M513FB` |
| RT-11 browser/AST | `lab/m513/rt11-browser.mjs`, `rt11-ast-browser.mjs`; `PIDP_RT_WORK`, optional `PIDP_RT_SCREENSHOT` preserve earlier captures |

Each bridge needs its own private configuration, loopback relay, explicitly
approved guest line and current instance/revision. Host relay ports used here
were 8445 (V7), 8446 (BSD), 8449 (RSX) and 8448 (RT-11); a port is not guest identity.
Refer to each harness's configuration before running it. The table is a composition
map, not an unattended guest installer or permission to bypass interactive startup.

For the fault test, first stop the V7 bridge, configure `supervised_endpoints` for
`v7-dc0`, restart detached, approve the independently inspected original simulator
and line, and start the M5.12 lab observer. With the exact owned V7 laboratory
under `.research/m514/v7`, run in the Mac shell:

```sh
PIDP551_WORK="$PWD/.research/m514/v7" node lab/m514/supervision.mjs
```

It deliberately stops/continues the owned observer and kills only the exact
companion executable. It verifies console/serial independence and explicit stale
socket recovery. It neither quits the guest nor restores authority automatically.
After inspection, stop the actual bridge, perform guest-safe shutdown through
the independent console, then remove the exact owned lab and loopback relay.

## Tutor and evidence handling

The existing `lab/m513/tutor` command is opt-in real local inference:
`PIDP11_LOCAL_MODEL_TEST=1 go run ./lab/m513/tutor`. It uses the already configured
local model; do not download a model or treat this as a new held-out evaluation.
Preserve raw answers and assess them independently of citation validity. HTTP
boundary tests use deterministic providers; do not conflate those with inference.

The recorded raw logs, debugger output, runtime packages, private console records,
first plotting failure and working media are retained in the ignored
`.research/m514/` work area. Public results contain reviewed booleans, counts,
hashes and nonprivate model answers. No private config, disk, credential or raw
console belongs in this directory. [cleanup.json](results/cleanup.json) records
which task-owned resources were removed while preexisting services were preserved.
