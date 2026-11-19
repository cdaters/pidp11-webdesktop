# M5.5.1 reproducible laboratory checks

All commands here are for the **Mac development host or disposable Linux environment**, never the physical Pi. No SSH command is used. Preserve earlier evidence; choose fresh work/package directories rather than overwriting them. Actual results and limitations are in [the milestone report](../../docs/lab/M5.5.1.md).

## Scanner and selection fixtures

From the repository on the Mac:

```sh
go test -race ./internal/switchdiag ./cmd/switchdiag
python3 lab/m551/scanner-oracle.py .research/lab-source
```

The second command requires the verified source extraction from the existing [lab build](../build-image.sh). It checks the scanner source hash before compiling an unchanged copy with fake GPIO functions. No real GPIO library is linked. Run `resolver-oracle.py` inside the existing `pidp11-realcons-lab:local` image with `--network none`, mounting original `bin/getsel.sh` read-only at `/fixtures/getsel.sh` and `internal/switchdiag/testdata/selections` read-only at `/opt/pidp11/systems/selections`. It runs the original resolver against a synthetic map, not the launcher.

## Genuine guest/browser rehearsal

1. Use `python3 lab/m50/prepare.py VERIFIED_PUBLIC_ARCHIVE FRESH_WORK_DIRECTORY` to verify the established public archive and create independent base/working images. See [M5.0](../../docs/lab/M5.0.md) for media provenance. Do not substitute any physical-machine image.
2. Build a fresh package with `sh packaging/build.sh FRESH_PACKAGE_DIRECTORY`. Set `PIDP551_WORK` and `PIDP551_PACKAGE` to those absolute directories. Run `sh lab/m551/run.sh` in a foreground Mac shell. The wrapper verifies fresh image hashes and package checksums, then starts network-none Linux. The guest belongs to the lab harness, not the tested desktop service.
3. Wait for `ready.json`. Run `python3 lab/m551/forward.py` in another Mac shell. It forwards only local port8445 through `docker exec` to this named fixture. If another listener already owns the port, stop and inspect it; do not kill unrelated processes. No Docker ports are published.
4. With the same `PIDP551_WORK`, run `node lab/m551/browser.mjs`. Chromium, Firefox and WebKit must be installed through the existing Playwright development setup. This script uses actual V7 commands and actual service routes, without response interception. Its certificate bypass is confined to the disposable browser contexts; it is not a deployment setting.
5. Request the harness's `shutdown` operation through a fresh private `request.json` with a unique `id`; await the same ID in `response.json`. The harness stops the service, syncs V7 three times, interrupts the simulator through its owned lab PTY and quits. It preserves the transcript in the private work directory. Stop the local forwarding helper. Retain evidence and the modified disposable disk; never copy them into Git.

The private request schema is `{id, op, data?, wait?}`. Write `request.tmp`, then rename it atomically to `request.json`; allow only one outstanding request. Supported operations are status, attach/detach (data is an approved endpoint ID), console, traditional, bridge-stop/start and shutdown. This is test supervision, not an application API. Do not expose the harness directory to browsers.

## Real systemd/package lifecycle

Create a new isolated ARM64 Debian Trixie environment. The actual run used OrbStack:

```sh
orbctl create -a arm64 --isolated --isolate-network \
  --memory 1G --cpus 2 --disk 4G --user lab debian:trixie pidp11-m551
```

Inside that disposable environment only, install Python3/OpenSSL/curl prerequisites, then bring its external `eth0` interface down before the service tests. Transfer only the reviewed package and test scripts using tar over `orbctl run` standard input; do not mount the host home directory or forward SSH credentials. The Linux environment shares OrbStack's kernel; its `/proc/meminfo` is not a Raspberry Pi's available-memory measurement.

Install two distinct rehearsal version directories, provision private loopback configuration, and keep the unit disabled. `systemd-lifecycle.py` tests HTTPS, local attachment, EOF, restart/crash, session revocation and an independent synthetic peer. `detached-browser.mjs` opens the actual installed desktop without a guest listener. `package-lifecycle.sh` tests release selection, rollback, disabled stop and explicit private-config/account purge. These scripts require the specific disposable environment and `PIDP11_ISOLATED_LAB=1`; inspect their setup paths before use.

Inspect effective systemd properties, not just the unit file. The actual environment supplied a type-wide `zzz-lxc-service.conf` override weakening isolation. A lab-only `pidp11-webdesktop.service.d/zzzz-m551-hardening.conf` reasserted the package's protection directives. The hardened service then passed the lifecycle checks. Remove that known lab-only override after uninstall; it is not part of the package. Do not weaken the production unit to accommodate a test host.

The first purge rehearsal found that Debian's `userdel` had already removed the empty private group. The corrected script checks for the group's continued existence before `groupdel`. A fresh install/upgrade/rollback/purge cycle subsequently passed. Readiness polling can briefly see a missing control socket immediately after `systemctl start`; the harness waits with a bounded deadline rather than treating process creation as listener readiness.

## Performance

Mac allocation microbenchmarks:

```sh
go test ./internal/access ./internal/terminalbridge -run '^$' \
  -bench 'Benchmark(Fanout|TrustedRequest)' -benchmem -count=3
```

Cross-build `./lab/m551/transportbench` with `CGO_ENABLED=0 GOOS=linux GOARCH=arm64`. In the isolated Linux systemd rehearsal, configure two loopback endpoints at40100/40102 and start the service detached. Run the harness as the lab administrator with `PIDP11_ISOLATED_LAB=1`, `-pid` set to this unit's freshly queried MainPID, and `-duration 30s`. It creates synthetic loopback peers, performs fresh local approvals, authenticates over validated TLS, and exercises all nine scenarios. It never starts an emulator or issues actual guest commands. The harness assumes Linux USER_HZ=100 and records only the specified service process's CPU/RSS; its own load is excluded.

The benchmark leaves both service lines detached and closes its listeners. Do not translate its Apple-hosted ARM64 timings into Pi performance claims. Zero echo latency in its raw JSON means “not measured for this scenario,” not a zero-latency transport.
