# M5.9 laboratory reproduction

Mac development and disposable ARM64 Linux only. No script here contacts the physical Pi or needs GPIO. [Results and limits](../../docs/lab/M5.9.md). Preserve prior packages, original archives and immutable base disks; use fresh private working directories.

## Browser and model checks

Run the documented `go vet ./...`, `go test -race ./...`, `npm run check`, `npm test`, `npm run test:integration` and `npm run build:server`. Start Vite with `npm run dev`. The ordinary Playwright suite needs the Go mock artifact server described in [development](../../docs/technical/development.md); otherwise its artifact checks fail before testing the application. `browser-tests/terminal-profiles.spec.ts`, `companion.spec.ts` and `printer-import.spec.ts` use deterministic fixtures. They are not genuine guest acceptance.

## Original V7 terminal and graphics checks

Follow [M5.5.1 preparation](../m551/README.md) and [M5.0 media provenance](../../docs/lab/M5.0-runbook.md). Build a new ARM64 package and prepare an independent V7 working disk with `lab/m50/prepare.py`. In the **Mac shell**, set `PIDP551_WORK` and `PIDP551_PACKAGE` to the fresh absolute paths.

1. Verify local loopback port 8445 and container name `pidp11-m551` are unused. Run `sh lab/m59/run.sh` in a retained foreground process. It uses the original lab image, network-none, read-only root, 512 MiB limit and no GPIO. Wait for the fresh `ready.json`.
2. Run `python3 lab/m551/forward.py` in another retained process. This is a local Docker-exec relay to the named disposable container, not SSH or a Pi connection.
3. Run `node lab/m59/browser.mjs` for VT100, VT52, VT220 and teletype V7 commands across all three engines. `M59_PERSONALITIES=asr33` selects only that personality when investigating a failure. The harness writes results after each passed case. It uses actual guest bytes, not intercepted browser routes.
4. Run `node lab/m59/graphics-browser.mjs` for original V7 `graph` / `plot -Ttek`. It explicitly creates five disposable points, establishes the DC11 session, then uses the independent console to write graphics to that guest tty. The browser receives the genuine stream read-only. `M59_GRAPHICS_ENGINE=chromium` repeats only the capture engine. Review `guest.ini`: its DCO0 7B selection preserves graphics control characters that default 7P output filters. This profile is not installed anywhere else.
5. On failure stop the sequence and inspect private console/frame evidence. Do not turn a failed genuine test into a fixture. Browser contexts bypass only the disposable self-signed certificate; ordinary browser TLS settings are unchanged.
6. Shut down through the existing owned harness. With the same `PIDP551_WORK`, run this **Mac shell** command and preserve its returned console record privately:

   ```sh
   node --input-type=module -e 'import {harness} from "./lab/m59/harness.mjs"; console.log(await harness("shutdown"));'
   ```

   The harness stops the bridge first, syncs the disposable guest three times, interrupts its owned simulator and quits. Confirm the named container exits, stop the exact local relay process and recheck the immutable base hash. Retain the modified disposable disk and evidence; do not overwrite the source archive or base.

The manual printer demonstration captured original V7 `pr /tmp/m59.points` through the console, saved only the listing locally and used **Import text spool**. There is no live LPT transport. Do not substitute that snapshot for printer-device acceptance.

## ARM64 systemd and packaging

Follow [M5.6 systemd rehearsal](../m56/README.md) with a fresh isolated, network-isolated `pidp11-m59` Debian Trixie ARM64 VM. Install lab prerequisites, then take its external interface down. Transfer only the reviewed package to `/tmp/package-final` and public lab scripts to `/tmp/lab`; do not mount personal directories or SSH credentials.

Run the existing setup, credential and lifecycle tests as the VM's root user with `PIDP11_ISOLATED_LAB=1`. The known OrbStack override must be reviewed and the intended package hardening reasserted using the existing lab-only override. `python3 /tmp/lab/m59/readiness.py` requires the exact disposable hostname, ARM64, offline interface and no `/opt/pidp11` tree. It tests missing-original preflight, creates explicit structural stubs, verifies they are untouched, withholds the memory controller in a temporary slice, checks startup refusal, restores the normal slice and removes its stubs. It does not test Oscar installation or edit boot files.

The existing nine-scenario `lab/m551/transportbench` uses synthetic loopback peers. M5.9 used eight seconds per scenario; report duration and host platform alongside values. These are not genuine guest/browser or physical Pi benchmarks.

After reviewing and committing source, the **Mac shell** command `sh packaging/release.sh m5.9-preview.1 /absolute/fresh/output` produces an archive, external checksum, full package manifest, compatibility JSON and matching source release notes. It refuses a dirty working tree or existing destination. This creates no tag or hosted release. Extract and verify that exact archive in the disposable VM, stop the companion, install a new rehearsal version and confirm detached startup with the retained private configuration. Reuse the existing package lifecycle script to test rollback, disablement and removal. Preserve results before deleting only the named disposable VM.
