# Reproducing M5.11

Use the Mac and disposable Linux environments only. No command here is a Pi procedure. The [engineering report](../../docs/lab/M5.11.md) identifies implementation commits, observed outcomes, corrected failures and unqualified areas. Private inputs and working disks belong under a fresh ignored directory, never in a public package.

## Prerequisites and checkpoints

1. Read the [development commands](../../docs/technical/development.md) and [original SIMH lab](../../docs/lab/M3.md). Use the pinned original `pidp11-realcons-lab:local` build, not the separately patched fence/observation binaries. M5.11 used the original binary from `/opt/lab/pdp11_realcons` with the existing PTY shim; REALCONS was not connected and no GPIO was available.
2. Verify the previously authorized public archive against [media.json](results/media.json). Extract only named regular members into new read-only base files, verify each hash, and make separate writable copies. Never use production or personal backup media. `lab/m50/prepare.py` performs these checks for V7. No media is distributed here.
3. Build a fresh package with `GOFLAGS=-buildvcs=false sh packaging/build.sh /absolute/fresh/output`. Preserve earlier packages. Record the source revision and executable hash. Start no guest until its base hash and exact container/VM ownership are established.
4. Run guests with the existing network-none, read-only-root, dropped-capability container restrictions, private writable work mount and bounded memory/process limits. Keep the conventional operator PTY independent. The fixed Mac loopback relay transports TLS bytes into only the named lab; it is not deployment architecture.
5. At a failed checkpoint, preserve the output and inspect before sending another command. Never replay an uncertain command or CPU-device phase automatically. Stop the actual bridge before a deliberate guest change. A closed browser is insufficient.

## Guest inventories

`guest-inventory.py rt11|rsx|rsts` owns one original simulator and accepts private filesystem IPC in `/work`. `console` writes only operator-provided ASCII into that simulator's conventional PTY; it is not a public route. `finish` requires `guest_safe:true` and quits the owned simulator. Its caller must first establish the guest-safe checkpoint. Console logging includes asynchronous output between requests.

Profiles use `disk0.work` (and RSTS `disk1.work`): RT-11 boots RL02; RSX uses its independent RQ image with DZ address 17760030/vector 330; RSTS boots the two copied RL01 images. Keep each in a different work mount/container. The historical image clocks and default distribution accounts are not current host configuration.

- **RT-11SJ V05.03:** inspect `SHOW CONFIG`, `SHOW DEVICES`, `DIR LP.SYS` and installed `HELP LOAD`. Stop at the missing DZ configuration; do not call the available SIMH DLI listener browser acceptance. M5.11 performed no handler installation or file-writing application.
- **RSX-11M-PLUS V4.6:** follow the actual startup dialogue, including date entry, without injecting terminal-ID bytes into a later prompt. The image's YZA listing confirms address/vector. Provision a separate service on loopback 8446 with `rsx-dz0` → 40100, start detached and explicitly approve it locally. `rsx-browser.mjs` takes `PIDP_RSX_WORK`; it waits for login completion before HELP/PIP. The optional `PIDP_RSX_LOGGED=1` is only for a manually verified already logged-in line after an inspected failure. Stop the actual bridge before conventional `RUN $SHUTUP`; follow its questions and require final dismount/HALT before `finish`.
- **RSTS/E V7.0-07:** follow the distribution's INIT/date/time/startup prompts. Use the installed HELLO/BASIC/SYSTAT programs and their prompts. M5.11 confirmed BASIC calculation and system status; it did not qualify an additional serial line. Use the distribution's `RUN $SHUTUP`, follow the dialogue, and require its disk dismount/final shutdown and return to INIT before `finish`.

The V7 and BSD procedures remain in [M5.9.1](../m591/README.md). Reuse `lab/m59/browser.mjs` for all 12 V7 engine/personality cases and `lab/m591/bsd-browser.mjs` with `M592_EXPANDED=1` for all nine BSD cases. Give new screenshot and working directories. `graphics-browser.mjs` and `equipment.mjs` here are thin wrappers preserving the earlier milestones' captures. BSD's explicit handoff waits for the server-confirmed release before acquisition.

## Genuine sharing experiment

This is a lab-only composition, not a production manifest writer or installer.

1. Build `selection-guard` for Linux ARM64. Use a fresh disposable checkout of the pinned Hacker Replicant revision and apply `integrations/hacker-replicant/prepare.py`. Keep the original clone and notices unchanged. Its Node runtime is a development/model-host component, not a Pi deployment dependency.
2. Generate short-lived lab TLS inputs and four separate private credentials: companion login, adapter read, adapter publication and model gateway. Use fixed loopback endpoints, exact origins and explicit certificate trust. The model gateway connects only to the already installed local Gemma runner; do not download a different model.
3. Start the actual V7 service and conventional guest first. `sharing-browser.mjs` expects `PIDP551_WORK`, `.research/m511/sharing` and the named network-none `pidp11-m551` lab. It creates a genuine `pwd` passage and binds exactly one view using private local status. The guard is separate from both browser applications. Its binding includes Linux PID/start time/boot/namespace identity, service instance, endpoint/revision and viewer-membership revision.
4. Run the modified app on `https://localhost:8510`, distinct from the desktop's `https://127.0.0.1:8445`; use the authenticated adapter at port 19002 and model gateway at 11436. The fixed test relay does not carry plaintext credentials. The harness approves visible text, asks a real model, and checks revoke, expiry, changed publication, disconnect, replacement view and malformed chat. Browser certificate bypasses are confined to these generated lab certificates; server-to-server validation stays enabled.
5. Stop only the owned processes. No Screen hardcopy, host shell, monitor, keys route or physical panel access is part of the adapter. Already sent data is not recoverable by revocation. A surviving process/stream can hide an OS change, so that case remains unqualified.

`restart-browser.mjs` requires explicit old/new work paths and a package. It checks real guest line echo settings, stops the bridge, synchronizes/quits the first guest, starts a fresh copy on the same endpoint, and rejects old browser approval. It uses only the owned private harness, not a public emulator-control API.

`crash-browser.mjs` requires a fresh `v7-crash` work directory and the original `lab/m551/run.sh` harness. It verifies the exact owned bridge executable before SIGKILL, checks both conventional paths, and confirms that a stale private socket blocks restart. Only after the child is reaped and its socket refuses connections does the test remove that exact companion socket. Restart remains detached; fresh approval yields read-only access. The test synchronizes/quits V7 at completion.

## ARM64 service workflow

Create a uniquely named disposable ARM64 Trixie VM with 1 GiB memory and a two-core CPU-time quota. Install required development tools before taking its external interface down. Transfer task-owned inputs through VM control, not personal SSH credentials or shared home directories. The scripts assert hostname `pidp11-m511` and the down interface.

`arm64-setup.sh` expects `/root/m511/package-old`, `package-new`, `original`, and `guest/disk0.base`. The old package is the real accepted Phase D runtime; the new package is the current candidate. The original directory holds the unchanged lab SIMH binary, PTY shim and `integration.py`. It records the real preflight refusal caused by absent Oscar launcher/panel files; do not fabricate an installation to hide this limitation. It installs stopped/disabled, provisions private inputs, restores the distributed hardening against the VM platform's type-wide overrides, and starts detached.

Start `arm64-guest.py` independently through the VM control channel with the explicit lab opt-in. It verifies/copies the base, owns the conventional PTY and separate traditional line, and never grants the service ownership of the process or media. `arm64-lifecycle.py` and `arm64-browser.mjs` test genuine use, stop/upgrade, restart and actual older-binary rollback. The VM platform's observed loopback port forwarding was used; verify the lab certificate and exact VM identity before browser access.

`memory-readiness.sh` temporarily withholds the memory controller, requires failure before HTTPS opens, and restores the ordinary unit. It does not change boot configuration. For resource tests, use the existing `lab/m551/transportbench` with two explicitly synthetic ports distinct from genuine guest ports; stop the companion before changing/restoring its configuration. Preserve all nine scenarios and label these as six-second loopback measurements.

Finally stop the companion, explicitly remove its known private configuration/account using the managed uninstaller, and verify the original V7 console still answers. Remove only the task-owned hardening override. Synchronize/quit the owned guest afterward, compare original executable/base hashes, retain working media/evidence, then remove the disposable VM. No fresh-card or physical acceptance follows from this rehearsal.

## Tutor and ordinary tests

`PIDP11_LOCAL_MODEL_TEST=1 go run ./lab/m511/tutor` asks the frozen selected-source questions using installed Gemma. Capture JSONL privately; review answers against the named sources before publishing sanitized results. The claim corpus is separate: `go run ./lab/m593d/evaluation -corpus lab/m511/evaluation/claims.json`. Rules were not tuned to these cases. Same-author source review is not independent expert acceptance.

Run Go vet/race, TypeScript/unit/build, transport integration and `npm run test:replicant`. For the 114 browser fixtures, first start Vite and the mock Go server as documented; these are not real guest results. The process-identity test is Linux-only and was executed as a cross-compiled Go test in the disposable VM. [Published evidence](results/) omits tokens, private bindings, raw captures and guest disks.
