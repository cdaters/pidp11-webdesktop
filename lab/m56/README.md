# M5.6 repeatable checks

Mac development and disposable ARM64 Linux only. No script here requires SSH or physical GPIO. Use fresh private evidence/media/package directories; preserve accepted M5.5.1 artifacts. [Results and limits](../../docs/lab/M5.6.md).

## Local tests

Run the repository's ordinary vet, race, TypeScript, unit, integration and build commands. With `npm run dev` running, execute `browser-tests/guest.spec.ts` and `browser-tests/terminal-profiles.spec.ts` in all configured engines. Those routes are intercepted conformance fixtures. Desktop/printer regressions remain separate. The unchanged original scanner oracle is `python3 lab/m551/scanner-oracle.py .research/lab-source` after verified source preparation; it links fake GPIO functions only.

## Real systemd

Follow [M5.5.1 lab setup](../m551/README.md#real-systemdpackage-lifecycle) with a fresh `pidp11-m56` OrbStack machine. Transfer only the reviewed package to `/tmp/package-final` and the required public lab scripts to `/tmp/lab`. Bring the disposable environment's external interface down after installing prerequisites. As its root user, with `PIDP11_ISOLATED_LAB=1`, run:

1. `sh /tmp/lab/m56/setup-systemd.sh`: full-package verification, install, first-run configuration, refusal to overwrite private files, second rehearsal release, effective unit hardening and detached manual startup.
2. `python3 /tmp/lab/m56/credentials.py`: wrong credential rejection and both role credentials over certificate-verified HTTPS.
3. `python3 /tmp/lab/m551/systemd-lifecycle.py`: unchanged attachment/EOF/restart/crash/session/no-auto-redial checks.
4. On the Mac, `node lab/m56/detached-browser.mjs`: actual installed desktop with no guest, no intercepted routes. The script targets only the named disposable VM and loopback 8445.
5. `sh /tmp/lab/m551/package-lifecycle.sh`: unchanged rollback, detached restart, disablement and complete purge. Its `m551-a/b` directory names are local rehearsal labels, not published releases.

OrbStack's type-wide override required reasserting the distributed protection settings with a known lab-only unit override. Inspect effective properties, not only the unit text. Delete that known lab override and the disposable VM after retaining evidence. No production unit is weakened. The six-second nine-scenario benchmark reuses `lab/m551/transportbench`, with two synthetic loopback endpoints and the current service MainPID. It measures only that Linux service process; its echo times exclude browser rendering and genuine guest execution.

## Genuine V7, both personalities

Prepare a new disk through `lab/m50/prepare.py` from the established verified public archive. Build a fresh optional package. Set `PIDP551_WORK` and `PIDP551_PACKAGE` to their absolute paths, run unchanged `lab/m551/run.sh`, and wait for `ready.json`. Run unchanged `lab/m551/forward.py` on the Mac only after checking local8445 is free. Then:

```sh
PIDP551_WORK=/absolute/path/to/fresh-work node lab/m56/browser.mjs
```

The test runs VT100 and VT52 ordinary guest I/O in Chromium, Firefox and WebKit. It now waits for recognizable login/shell prompts rather than assuming the guest is ready after 500 ms. It verifies independent console/DC11 access, generation rejection and service interruption as before. It does not claim a full-screen application or Tektronix guest test. Certificates are bypassed only within these disposable Playwright contexts, not personal browsers.

Stop using the existing private harness `shutdown` request after tests. It stops the bridge first, syncs the disposable guest, interrupts only its owned simulator and quits. Preserve the private transcript and modified disposable disk. Stop the forwarding process, remove the named disposable lab environment and leave all unrelated containers alone. See M5.5.1's runbook for the exact private request schema. Never publish tokens, media, guest transcripts or host configuration.
