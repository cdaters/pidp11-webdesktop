# Reproducing M5.9.1 locally

These are **Mac development procedures**, using the already established original-SIMH image and authorized local media archive. No helper contacts the physical Pi or uses GPIO. Do not download a model, install prerequisites or use a private external provider implicitly. Read [the results and interruptions](../../docs/lab/M5.9.1.md) before interpreting a capture as acceptance. Use fresh private directories; never overwrite a base, checkpoint or earlier run.

## Genuine CPU peripherals

1. Verify the existing image `pidp11-realcons-lab:local` and source provenance from [M3](../../docs/lab/M3.md). The unchanged upstream device implementations are `PDP11/pdp11_lp.c` and `PDP11/pdp11_pt.c` in the pinned original SIMH tree. Create a fresh private directory, then run the following in the **Mac shell**, replacing the output path with that fresh directory:

   ```sh
   docker run --rm --name pidp11-m591-devices --network none --read-only \
     --cap-drop ALL --security-opt no-new-privileges --memory 512m --cpus 2 \
     --pids-limit 128 --tmpfs /tmp:rw,size=64m -e PIDP11_ISOLATED_LAB=1 \
     -v "$PWD/lab:/lab:ro" -v "/absolute/fresh/device-output:/work" \
     pidp11-realcons-lab:local python3 -u /lab/m591/devices.py
   ```

2. Require successful HALTs, byte equality and the checksums recorded in the report. Inspect the retained octal instruction listings and device register/position captures. A host comparison alone is not the claim: `go 1000` actually executes the deposited PDP-11 program against original devices. The script detaches the files and quits its owned simulator.
3. Keep `lp11.out`, `punch.bin` and raw evidence private. PC11 input includes both high-bit values and control bytes. No disk is attached. Failure stops the sequence; preserve evidence rather than substituting expected bytes.

## V7 equipment workflow

Prepare a new V7 working copy with `lab/m50/prepare.py` as described in [M5.9](../m59/README.md), and build a fresh package with `packaging/build.sh`. Set `PIDP551_WORK` and `PIDP551_PACKAGE` to those absolute directories in the **Mac shell**. Copy only the verified completed `lp11.out` and `punch.bin` from the previous test into the fresh work directory. They remain separately identified CPU-test exports, not V7 driver output.

Create private `service-options.json` in that directory:

```json
{
  "device_exports": [
    {"id":"lp11","kind":"lp11","path":"/work/lp11.out"},
    {"id":"punch","kind":"pc11-punch","path":"/work/punch.bin"}
  ],
  "companion": {
    "kind":"ollama",
    "endpoint":"http://127.0.0.1:19191/api/chat",
    "models_endpoint":"http://127.0.0.1:19191/api/tags",
    "models":["historical-fixture"],
    "fixture":true
  }
}
```

1. Confirm the named container and local port 8445 are unused. Run `sh lab/m591/run.sh` in a retained foreground session. It requires a fresh working directory without `ready.json`, verifies the package manifest and runs original SIMH without networking or GPIO. Wait for readiness; the service starts detached.
2. In another retained session run `python3 lab/m551/forward.py`. This fixed loopback test relay uses Docker exec, not SSH. Run `node lab/m59/browser.mjs` for twelve genuine text-personality cases. Stop on failure. This regression deliberately restarts the service, so publish completed exports **after** it finishes.
3. Run `docker exec pidp11-m551 python3 /lab/m591/publish.py`. It independently checks the two known hashes and submits fresh private publication approvals. Run `docker exec pidp11-m551 python3 -u /lab/m591/provider-fixture.py` in a retained session. The fixture is not a model.
4. Run `node lab/m591/demo.mjs`. It uses real HTTPS/WebSockets, the actual V7 guest, explicit keyboard leases and an independent console. Text uses tty02; graphics uses the reviewed DCO0 7B line/tty00. Three engines verify a real plot, exact printer download and fixture response. Chromium captures the normal four-window application. `M591_DEMO_ENGINE=chromium` repeats only that capture when needed. The capture changes no guest bytes or UI source labels.
5. Stop the bridge and shut down through the owned harness:

   ```sh
   node --input-type=module -e 'import {harness} from "./lab/m59/harness.mjs"; console.log(await harness("shutdown"));'
   ```

   Preserve the response: bridge stop, three guest syncs, owned simulator interrupt and quit. Confirm the container exits, stop only the owned relay and verify immutable source/base hashes. Retain disposable media. Do not call an interrupted mount loss a clean shutdown.

## 2.11BSD full-screen application

The existing authorized archive contains `systems/211bsd/2.11BSD_rq.dsk` (1,000,089,600 bytes). Verify the archive hash in the report, extract only that regular member into a new private base, verify its recorded hash, mark it read-only and make an independent `disk.work`. Do not use a production disk or change original source.

`bsd-inventory.py` is the bounded conventional-console harness, run with the same network-none/read-only/cap-drop container protections and a fresh work mount. It selects CPU 11/70, RAUSER=1000, original RQ disk, DZ vector 310 and a seven-bit localhost listener. At the boot prompt send `unix` plus Return through its private `console` IPC; after the single-user prompt, send Ctrl-D to boot multiuser and mount `/usr`. Verify `/usr/ucb/vi` and the actual termcap entries before testing. Network daemons may report unreachable in this intentionally offline environment.

Provision a separate private lab service configuration on port 8446, with endpoint `guest-dc0` pointing to the verified first DZ line at port 40100 and private control socket under `/tmp`. Start the copied ARM64 service, inspect its fresh status and explicitly approve the line with the existing CLI. Keep writer/observer tokens private. Use a separately reviewed fixed relay to that named container/8446; do not reuse a production tunnel or listener. The laboratory DZ listener pools eight lines, but this test opens one bridge connection; it is not a deployment recipe for deterministic line selection.

`bsd-browser.mjs` expects the private working directory `.research/m591/bsd` and localhost 8446. It sets actual TERM and runs vi in VT100, VT52 and VT220 across the three engines. It writes each result after success; a missing ninth result cannot be inferred from earlier successes. `M591_PERSONALITIES=vt220` narrows an investigation. Stop the bridge, sync through the conventional console, then use the harness's `finish` action to interrupt/quit. Record any abnormal shutdown instead of hiding it.

## ARM64 service and fake-peer checks

Use only the exact disposable `pidp11-m591` ARM64 Debian Trixie VM, isolated with its external interface down, no original installation and no personal directory mounts. M5.9.1 used existing system tools and a compiled Go peer; no Python/package installation in the VM was needed.

- The existing `lab/m56/setup-systemd.sh` procedure was reproduced with its Python-generated hardening override replaced by an equivalent `awk` filter. Install the verified candidate as rehearsal versions `m551-a` and `m551-b`; repeat setup must refuse without changing private files. Preserve the distributed service restrictions and manually start detached. Never enable autostart.
- `peer/main.go` is a bounded fake guest at loopback 40100 and deterministic Ollama-shaped fixture at 19191. Build it for Linux ARM64 on the Mac. It requires `PIDP11_ISOLATED_LAB=1`. Its `relay` mode connects only to VM loopback 8447 through standard input/output. The Mac relay uses the same bounded 32-connection forwarding pattern as `lab/m551/forward.py`, substituting the exact VM/peer command and port 8447.
- Configure the lab service's listen/origin as localhost 8447, the fake guest line as `guest-dc0`, the fixture provider as above, and `allow_readonly_command_proposals: true`. Copy its writer token privately to `.research/m591/arm64-writer.token`. Start detached and explicitly approve the fake line. `node lab/m591/approval-browser.mjs` tests exact review, separate approval, cancellation, read-only reconnect, discovery and fixture chat in all engines. No genuine guest command or model inference is involved.
- Run `lifecycle.py` on the **Mac** with the fixed lab relay active. It verifies changed service instance, detached restart and old-session rejection.
- Run `memory-readiness.sh` as the **disposable VM's administrator** with the lab opt-in. It temporarily withholds the memory controller using a slice, requires refusal before HTTPS, removes its exact override and restores protected detached operation. It never changes boot configuration.
- Stop only the fake peer, provide a second approved configuration entry on loopback 40102, then run the existing ARM64 `lab/m551/transportbench` against the service MainPID with `-duration 6s`. It owns its synthetic listeners. Preserve all nine scenarios; do not present these as Pi or real-guest latency.
- Test the exact clean-source archive separately, then roll back between the two managed versions, start detached, stop/disable and use the explicit managed purge option. Remove only the known lab hardening override after stopping. Preserve evidence before deleting the disposable VM. Extra provider-token files require separate review; never broaden the uninstaller's allowlist to remove unknown content.

The package record gives the exact source revision, checksum and final lifecycle outcome. Interrupted or failed checks are recorded separately from successful fresh repeats.
