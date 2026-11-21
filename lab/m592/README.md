# Reproducing M5.9.2 in disposable laboratories

These are **Mac development procedures**, using the existing verified original-SIMH laboratory image, authorized public-media archive and installed browser engines. They do not contact a Pi or require GPIO. Read [the report](../../docs/lab/M5.9.2.md), [device contract](../../docs/technical/observed-peripherals.md) and [M5.9.1 prerequisites](../m591/README.md). Never overwrite earlier work directories or original media. Stop at failures and preserve the actual response before deciding whether a repeat is safe.

## Original devices with a real V7 equipment workspace

1. Prepare a new V7 base/working copy with `python3 lab/m50/prepare.py VERIFIED_ARCHIVE FRESH_WORK`. Build into another fresh directory using `sh packaging/build.sh FRESH_PACKAGE`. Export absolute `PIDP551_WORK` and `PIDP551_PACKAGE` paths in the Mac shell. The original image/archive provenance and immutable hashes are recorded in earlier reports; do not substitute physical-machine media.
2. Put this private `service-options.json` in the new work directory. These are container-local paths and a deterministic loopback fixture, not production configuration:

   ```json
   {
     "device_followers": [
       {"id":"live-lp11","kind":"lp11","path":"/work/live-lp11.out"},
       {"id":"live-punch","kind":"pc11-punch","path":"/work/live-punch.bin","reader_path":"/work/live-reader.bin"}
     ],
     "companion": {
       "kind":"ollama","endpoint":"http://127.0.0.1:19191/api/chat",
       "models_endpoint":"http://127.0.0.1:19191/api/tags",
       "models":["historical-fixture"],"fixture":true
     }
   }
   ```

3. Verify the exact lab container name `pidp11-m551` and loopback port 8445 are available. Run `sh lab/m591/run.sh` in a retained foreground session. It checks the package and starts a fresh V7 copy in network-none Linux with a read-only root, dropped capabilities and bounded memory/processes. Wait for `ready.json`. Run `python3 lab/m551/forward.py` in another session; this fixed Docker-exec relay exposes only the lab HTTPS listener on Mac loopback.
4. Run these two commands in separate retained Mac sessions:

   ```sh
   docker exec pidp11-m551 python3 -u /lab/m592/devices-live.py
   docker exec pidp11-m551 python3 -u /lab/m591/provider-fixture.py
   ```

   The first refuses an existing spool, starts a separate diskless original simulator, attaches only fresh test files and approves observation through the private control socket. It creates a 12,288-byte read-only reader image. Wait for `devices-ready.json`; inspect errors immediately. The second is a labeled HTTP fixture, not an AI model. Both are isolated from external networks.
5. Run `node lab/m592/equipment.mjs`. It opens real V7 text and graphics lines, the two approved live observers and the fixture companion. Each engine requests one CPU device phase through private filesystem IPC; no browser monitor route exists. Require all phase HALTs, exact reader positions, observed append counts, final EOF CSR, full file equality and completed downloads. Phase one and two must remain observing with downloads disabled. The Chromium capture is written to the M592 screenshot path; preserve an earlier screenshot before deliberately repeating a capture.
6. Inspect `devices-results.json`, `reader-eof-console.txt`, instruction listings and browser results. A full run yields 20,205 LP11 bytes and 12,288 PC11 bytes. POS is printed in decimal by this original simulator; CSR is octal. The final CSR is `100000`, indicating the extra EOF read. The full-byte reader and punch hashes must match.
7. Finish the owned device producer by atomically writing `devices-request.tmp`, renaming it to `devices-request.json`, and awaiting matching `id` in `devices-response.json`, with `{ "id":"fresh-unique-id", "op":"finish" }`. This operation is accepted only after phase three completes. It quits only the diskless owned simulator. Then call the existing V7 harness `shutdown`: it stops the actual bridge, syncs the guest three times, interrupts its owned simulator and quits. Confirm container exit and stop only the owned loopback relay. Recheck immutable archive/base hashes and retain all modified disposable media privately.

The device IPC accepts only `phase` and `finish`; one request may be outstanding. Responses are published atomically. On timeout do not resend a phase: inspect results and simulator state first. `M592_REUSE_FIRST=1` exists solely for a reviewed failure after phase one; it consumes the already completed first record rather than reexecuting that CPU phase. Do not use it after later phases. `M592_COMPLETED=1` explicitly rechecks already completed retained output without executing any device phase; it still uses genuine V7 terminals. `M592_DEMO_ENGINE` optionally selects one browser. No option is automatic retry or guest discovery.

The twelve-personality regression `lab/m59/browser.mjs` deliberately restarts the bridge. Run it on a separate fresh guest rehearsal before live observation, not in the middle of a producer lease. The IPC reader tolerates incomplete legacy responses without resending guest input; the updated Python harness publishes responses by atomic replacement.

## Expanded BSD acceptance

Follow the original [BSD preparation](../m591/README.md#211bsd-full-screen-application), choosing fresh verified media and a fresh named container. The original RQ/DZ configuration, manual `unix` boot and explicit single-user-to-multiuser transition remain. Wait for each actual prompt; do not assume a control character was consumed during boot.

With the private loopback 8446 service/relay ready and a freshly approved guest line, set `PIDP_BSD_WORK` to the fresh evidence directory. Run `M591_PERSONALITIES=vt220 M592_EXPANDED=1 BSD_RUN=fresh-run-name node lab/m591/bsd-browser.mjs`. `BSD_ENGINE=webkit` isolates the previously missing case; omit it for all three engines. `BSD_SCREENSHOT` selects a separate real capture path. The helper invokes `bsd-expanded.mjs` for reopen, second observer/redraw, explicit handoff, saved readback, more paging and read-only reconnect. New test filenames prevent overwriting interrupted results. Stop the actual bridge, sync through the independent console and finish the owned simulator as documented in M5.9.1.

## Service, browser and resource checks

Use [the normal development commands](../../docs/technical/development.md) for Go vet/race, TypeScript checks, units, build, integration and all browser engines. M592 adds `browser-tests/m592.spec.ts` and extends proposal expiry coverage. The mock artifact service must be a separately owned loopback listener; `PIDP11_TEST_BACKEND` can select port 8081 without disturbing an existing service.

Use a fresh isolated ARM64 Debian Trixie VM with its external interface down for systemd checks. Reuse reviewed M591 lifecycle/memory scripts with only their exact disposable VM/evidence paths changed. `PIDP_ARM_RESULTS` makes the browser approval helper read the current private token/results directory. Keep the service disabled. Verify repeat configuration refusal, protected startup, restart/session revocation, missing-memory-controller refusal, exact archive manifests, two-version rollback, stopped uninstall and private-account purge. Preserve the existing enforcement; never change the physical Pi's kernel or boot configuration.

The existing `lab/m551/transportbench` compiled for ARM64 measures nine six-second synthetic scenarios against the service MainPID. Stop its separately owned fake peer first so the benchmark can own its two loopback listeners. Its figures exclude peer/emulator/browser CPU. The additional M592 live workflow sampled the bridge's `/proc/PID/stat` and `statm` once per second for 40 seconds: service CPU only, maximum sampled RSS, and no translation into physical Pi performance. Retain raw private evidence; do not publish tokens or guest disks.
