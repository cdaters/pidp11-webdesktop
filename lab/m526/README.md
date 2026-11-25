# Isolated communications laboratory

This development-only lab uses original SIMH/REALCONS and a disposable Research
UNIX V7 disk. It is not an installer or a physical Pi runbook. Read the
[M5.26 report](../../docs/lab/M5.26.md) before reproducing it, especially the
observed line echo, LF requirement and unqualified modem result.

## Files and boundaries

- `guest.py` owns the independent original simulator console and fresh working
  disk. Its private request files are operator orchestration, never browser APIs.
- `peer.py` owns one fixed DC11 loopback connection and at most 64 KiB of received
  bytes. Connect/reconnect are explicit; a failed request is never replayed.
- `request.py` sends one bounded command with a unique ID. An unresolved request
  must be investigated before any further input.
- `v7files.py` reads only bounded direct/single-indirect V7 root files. It never
  writes media and must not be used to assert live filesystem consistency.
- `modem/` is an in-process ASCII command personality with no network API.
  `modem-peer/` is its one-shot, 60-second, 16 KiB, fixed-loopback test adapter.
  Neither is included in the ordinary desktop executable.
- `forward.py` exposes only the lab's TLS service at Mac loopback port 8445 through
  `docker exec`; it does not give the guest a network route. It inherits the
  earlier bounded 32-connection test relay.
- `browser.mjs` runs **actual** guest/bridge tests in three engines. It requires
  the verified guest `cu` process and separately approved supervised service.
  `browser-tests/m526-communications.spec.ts` instead uses intercepted fixtures.
- `results/` contains sanitized measurements, utility/source hashes and limits,
  not guest software, disks, credentials or private console transcripts.

## Preparing a fresh run

**Mac shell.** Use the legitimate retained V7 base whose hash appears in the report
and the original lab build described in [the original lab](../../docs/lab/M3.md).
`prepare.py` requires a new destination and verifies the base/copy hash. Keep the
original out of the container's writable mounts. The following wrapper is a
reconstructed convenience path, syntax-checked; the recorded run used equivalent
individual commands, initially 128 MiB for the guest-only trials, then tightened
to 96 MiB before starting the optional service.

```sh
python3 lab/m526/prepare.py "$V7_ORIGINAL_BASE" .research/m526-new/v7
M526_WORK=.research/m526-new/v7 sh lab/m526/run.sh
```

The container has only loopback, no published ports, 96 MiB memory, zero swap,
two CPU quota, 128 processes, no capabilities and a read-only root. `guest.py`
checks the exact original executable hash, configures DC11 and boots V7
single-user. Wait for a fresh `ready.json`; inspect the console evidence and
confirm the root prompt before continuing. Stop on unexpected output. Do not
start another scanner, launcher, original installation or hardware process.

**Mac shell, separate terminal.** The peer must be started once in this lab:

```sh
docker --context orbstack exec -e PIDP11_ISOLATED_LAB=1 \
  pidp11-m526-v7 python3 /lab/m526/peer.py
```

Then explicitly connect via `request.py` using the fresh directory and `peer`
channel. The configured destination is fixed in source, not supplied by a browser.
The actual guest command used for later tests was:

```text
cu 0 -l /dev/tty03 -a /dev/null -s 300
```

Send that through the independent guest console only after verifying the peer
connection and single-user state. `/dev/null` is an explicitly disclosed laboratory
substitute for the absent calling unit. `Connected` may arrive asynchronously;
check `console-private.txt`, not just the immediate response. Use new distinctive
ASCII text and check the exact peer bytes. A peer line needs LF in the observed
canonical guest state. Verify guest receipt independently at the original console;
a returned line echo alone is not proof. Record CR/LF translations explicitly.

A peer disconnect may print `Lost carrier` while the parent `cu` remains active.
Use its guest-side `~.` escape at the beginning of a line to return to the console;
verify `Disconnected` and the root prompt before issuing shell commands. A fresh
peer connection requires explicit approval and a fresh `cu` invocation. Do not
replay an uncertain line or automatically attach to a reused socket.

## Browser/service trial

Build browser assets and the ARM64 optional service from the reviewed tree. Place
only the executable in the writable private work directory; credentials stay
private. Provision a local TLS configuration inside the lab with the existing
`webdesktop-service provision` command, and use endpoint ID `v7-cu`, raw socket
`127.0.0.1:40103`, supervision required, and a `serial` profile matching the
[session contract](../../docs/technical/serial-communications.md). Keep the private
control socket under an owner-only directory. The existing service runbook explains
provisioning and token handling; do not copy tokens into command history or reports.

Start `serve -require-memory-limit` with `GOMEMLIMIT=72MiB`, `GOMAXPROCS=2`.
Verify all lines are detached. Only after independently verifying the original
SIMH PID, guest, line and lack of a competing peer, run
`lab/m512/supervisor.py` with that explicit PID, fixed address, control socket,
endpoint, a new operator epoch and the guest-and-line confirmation. It pins
process/socket lifetime; it does not infer guest OS identity. Never run the raw
peer and bridge against the same line at once.

The recorded browser script uses `.research/m526/v7`, port 8445 and the container
name above. For another run, review and adjust its fixed lab paths in a separate
copy; do not overwrite the accepted evidence. Start the fixed relay, then invoke
`node lab/m526/browser.mjs` only when the original console independently confirms
`cu` is connected. The script signs in through the real HTTPS service, opens
Communications, connects read-only, acquires input explicitly and uses
**Workstation → Line feed**. It verifies a different guest-produced message at
both the WebSocket and visible terminal, then disconnects/reconnects read-only.
It never configures SIMH through the browser.

Before an intentional guest change or restart, stop the actual bridge and observer.
A browser window close is insufficient. Verify an optional-service restart is
fully detached and has a new service instance before any new approval.

## Ending a run

Stop owned peers, supervisor and actual bridge; confirm the independent guest
console still answers. Exit `cu` if necessary. At an idle root prompt, the recorded
finish request issued three `sync` commands, then independently stopped SIMH and
issued `quit`, requiring exit 0. Preserve failed attempts and the working disk.
Rehash and compare original size/mode/mtime against `base.json`, inspect container
exit/resource evidence, and remove only the named stopped lab container. Stop the
owned relay and previews. Compare prior container states and accepted Git tags.

## Portable checks

**Mac development shell:**

```sh
go vet ./...
go test -race -count=1 ./...
npm run check
npm test
npm run build:server
python3 -m unittest discover -s lab/m526 -p 'test_*.py'
```

Run the frontend browser suite with both the Vite preview and embedded Go preview
available; `PIDP11_TEST_BACKEND` selects the latter's dedicated loopback URL.
Absent embedded preview caused six connection-refused failures in the first
M5.26 campaign; the dedicated artifact rerun passed. These checks require no disk
image and do not constitute genuine guest evidence.
