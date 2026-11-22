# M5.12 isolated qualification runbook

Use the **Mac development shell** and owned disposable ARM64 Linux only. No Pi,
SSH, GPIO or production guest disks are involved. Read [the engineering report](../../docs/lab/M5.12.md),
[prior lab prerequisites](../m591/README.md) and
[identity contract](../../docs/technical/supervised-guest-identity.md) first.

The laboratory needs the previously built unchanged original-SIMH image, the
verified authorized public-media archive, installed browser engines and, for real
model cases, the already installed local Gemma model. Do not download replacement
media/model weights or reuse a live working directory implicitly. All generated
credentials, disks, manuals and raw captures belong in ignored private storage.

## Order and stop conditions

1. Record Git revision, tag inventory, package checksum and original media hashes.
   Create fresh working copies from verified immutable bases. Clones can inherit
   read-only permissions: make **only the new working files** owner-writable.
   `guest-inventory.py` now refuses that mistake before boot.
2. Verify the exact owned container/VM names and loopback ports are unused.
   Use network-none containers, read-only roots, dropped capabilities, process/CPU
   bounds and explicit memory limits. Never disturb unrelated review services.
3. Keep one command outstanding per private guest IPC channel. Inspect the actual
   response ID and prompt before sending the next guest command. On timeout, do
   not resend uncertain input or a device phase. Preserve failed attempts.
4. Stop the actual bridge and observer before intentional guest changes. Confirm
   guest-safe shutdown before quitting its original simulator. Preserve changed
   working disks, original console logs and hashes before removing owned labs.

The helpers are laboratory orchestration, not an unattended installer. Review
local paths, prerequisites and current guest prompts before running them.

## Supervised original V7

Prepare a fresh V7 work directory with the existing `lab/m50/prepare.py` helper and
fresh package with `packaging/build.sh`. The accepted media and binary hashes are
in [results/media.json](results/media.json) and the report. Set absolute
`PIDP551_WORK` and `PIDP551_PACKAGE` in the Mac shell. The M5.12 work directory used
`.research/m512/v7`; scripts deliberately check that scope.

Place `{"supervised_endpoints":["v7-dc0"]}` in its private `service-options.json`.
`sh lab/m512/run.sh` starts the owned `pidp11-m551` network-none lab with a 96 MiB
**whole-container** memory boundary. Wait for its private `ready.json`; no guest
line is approved automatically. The existing fixed Docker-exec relay exposes
container HTTPS 8445 only on Mac loopback.

In that isolated Linux container, inspect the recorded original simulator PID,
its dedicated DC11 listener and the conventional guest session. Then explicitly
run the observer with those reviewed values:

```sh
PIDP11_ISOLATED_LAB=1 python3 /lab/m512/supervisor.py \
  --pid SIMH_PID --address 127.0.0.1:40100 \
  --socket /tmp/m551-control/control.sock --endpoint v7-dc0 \
  --operator-epoch FRESH_REVIEWED_OPERATOR_EPOCH --guest-and-line-verified
```

`SIMH_PID` and the epoch are placeholders, not automatic discovery. The observer
never starts a simulator. Require its first verified connected-socket observation
before browser use. Failure ends renewal and the service retires the attachment.
Do not restart an observer to disguise unexplained evidence loss.

From the Mac shell, `node lab/m512/endurance.mjs` runs 30 minutes (bounded to at
most 60), with two views, explicit handoffs, observer replacement, returned output
markers and bursts. It explicitly signs in again during the run because browser
authentication expires after 15 minutes. It never extends that policy or reacquires
keyboard authority silently. `passive-throughput.mjs` adds one read-only observer
for approximately 94 seconds, counts actual output bytes and stalls its renderer
for three seconds. Saturating backpressure tests remain separate fixtures.

`docker exec pidp11-m551 python3 /lab/m512/supervisor_test.py` runs four bounded
Linux child-process/socket tests. It does not touch the guest. Numeric PID reuse is
modeled by redirecting pathname lookup after exit; the old real pidfd must refuse.
This is not a claim that the kernel recycled the PID during the test.

## RT-11 and RSTS/E

`prepare-guests.py` verifies the existing archive and creates fresh bases/working
copies for these guests; it refuses existing directories. `guest-inventory.py`
accepts only the explicit `rt11`, `rt11-mtty`, `rsts` and `rsx` profiles in a
network-none container. It exposes only private console/finish IPC to the lab
operator; there is no browser monitor endpoint.

For RT-11, follow actual `IND SYSGEN` prompts using the reviewed choices in the
report. The `M512C` answer/conditional files and generated masters stay on the
private working disk. Build both monitor and matching DL handler; preserve the
old handler there. Boot the separately named `M512FB` with the `rt11-mtty` profile,
confirm `SHOW CONFIG` and run the original compiled MTTEST. Do not confuse
programmed terminal I/O with an independent shell. `rt11-browser.mjs` expects the
known MTTEST console-input prompt and a separately approved DZ line on 8448. It
sends that console line once through private lab IPC, then verifies actual browser
input and application retype. It must not be run at an unknown prompt.

RSTS/E's current generated monitor has no DZ11 terminal lines. Hardware inventory,
KB inventory, configuration source, BASIC and a bounded raw-line probe were
recorded; no browser support was inferred. Complete legitimate regeneration inputs
are required before another terminal attempt. Do not repeat a missing-driver test
as if a new listener could supply that code.

## BSD, RSX and devices

Use the established [BSD profile and preparation](../m591/README.md) on a fresh
working disk. Explicitly boot `unix`, enter multiuser mode and approve the dedicated
DZ line. `lab/m591/bsd-browser.mjs` with `M592_EXPANDED=1`, a fresh `BSD_RUN`, explicit
`PIDP_BSD_WORK` and a private `BSD_SCREENSHOT` exercises nine browser/personality
cases. `bsd-endurance.mjs` adds a bounded ten-minute two-view workload on 8446.
Do not let screenshots overwrite accepted presentation images.

The fresh RSX profile uses DZ CSR `160030`, vector `330`. Wait for the original
startup sequence before shutdown; it can attempt unavailable network/devices in
this deliberately isolated environment. `rsx-browser.mjs` uses a separately
configured and explicitly approved service on 8449, tests HELLO/HELP/PIP, and
records its text-only scope. Stop its actual bridge before guest SHUTUP. Preserve
any timeout; do not label an unfinished shutdown as clean.

Original LP11/PC11 and V7 Tektronix regression reuse
[the three-phase M5.9.2 procedure](../m592/README.md). Run it **after** terminal
endurance, not while renewing a different service configuration. Stop the actual
observer/bridge before explicitly changing the lab configuration. Keep this
manual-approved device workflow distinct from the supervised endurance result.
Use fresh spool paths and separate capture paths. Require exact byte downloads,
reader positions/EOF and original CPU HALTs before accepting device results.

## Model and sharing

`tutor/questions.json` and `evaluation/claims.json` were frozen before the real
model run. Their hashes are in `results/frozen-evaluation.sha256`. Do not tune
recognition against these qualification inputs. Run the existing evaluator with
`-corpus lab/m512/evaluation/claims.json`; the tutor runner uses the existing fixed
local model. Review whole answers, unsupported assertions and citations separately
from deterministic fragment matches.

The optional sharing rehearsal uses a fresh private clone at the recorded upstream
commit, the current explicit read-only preparation module, four separate private
credentials, loopback TLS and the existing model gateway. With the already verified
supervised V7 attachment, `sharing-browser.mjs` creates a fresh process/attachment/
sole-view binding for the separately compiled `selection-guard`. It requires
actual `pwd` output and a genuine model response. Follow the
[review packet](../../docs/security/M5.12-replicant-review.md); never install the
lab guard as a production identity service or substitute simulated guest text.

## ARM64 package lifecycle

The recorded owned VM is `pidp11-m512`; helpers refuse another hostname or an
active external interface. Set up the original independent simulator, fresh V7
working media and reviewed old/new packages before using `arm64-setup.sh`,
`arm64-guest.py`, `arm64-lifecycle.py` and `arm64-browser.mjs`. They are a rehearsal
sequence, not a one-command public installation path. Normal preflight is expected
to refuse missing Oscar installation programs; do not create dummy replacements.

`memory-readiness.sh` temporarily removes the memory controller from the test
service's slice, requires refusal before HTTPS and restores normal confinement.
It changes only the disposable VM, never boot configuration. `arm64-finalize.py`
requires the known final supervised session, verifies rollback's configuration
compatibility boundary, uninstalls known companion paths, proves both conventional
V7 routes, syncs/quits the guest, checks immutable originals and exports private
evidence. Delete only that owned VM after reviewing the export and shutdown result.

## Checks and publication

Run Go vet/race, TypeScript/unit/transport tests, web build, five modified-app route
tests and 114 three-engine fixtures as described in the development guide. Keep
fixture, real guest, actual model, synthetic transport and host measurements
separate. Public summaries omit credentials, private network configuration, raw
terminal captures and guest images. The same development agent reviewed this work;
independent historical/security acceptance remains outstanding.
