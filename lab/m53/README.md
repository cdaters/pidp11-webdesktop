# M5.3 terminal pilot helpers

The `cmd/terminal-pilot` executable uses the existing terminal bridge, serves
embedded assets, and accepts only `unix7-dc0` at raw loopback port 40100. HTTPS is
fixed at `https://127.0.0.1:8445`, reached through an operator-owned SSH tunnel for
the Pi pilot. It has no emulator, disk, Screen, GPIO or panel-control API.

The files here are operator/development tools, not part of the deployed server.
`serve.py` owns a disposable lab guest and exposes a private file channel to the
Mac acceptance driver. The browser cannot access that channel. `forward.py` is
the bounded M5.0-style TLS relay with a distinct M5.3 container name. No accepted
M5.0 harness or laboratory isolation guard is replaced.

## Mac laboratory replay

From the repository root, use the [M5.0 prerequisites and verified public media](../../docs/lab/M5.0-runbook.md).
Choose a new destination; never supply a working guest image as the source.

```sh
npm ci
npm run build:server
mkdir -p bin
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/terminal-pilot-linux-arm64 ./cmd/terminal-pilot
python3 lab/m50/prepare.py .research/m50-download/systems.tar.gz .research/m53-new
PIDP53_WORK=.research/m53-new sh lab/m53/run.sh
```

Keep that process running. In a second Mac shell run `python3 lab/m53/forward.py`.
In a third, run `PIDP53_WORK=.research/m53-new node lab/m53/browser.mjs`. Expected
result: genuine commands in Chromium, Firefox and WebKit, observers, explicit
ownership, reconnect, and independent console access during bridge restart.
Screenshots/results remain in the private working directory, not the accepted
gallery. Ports must be unused before starting; do not stop an unrelated service.

Shut down through the independent operator using the existing file-channel helper:

```sh
PIDP50_WORK=.research/m53-new python3 lab/m50/control.py shutdown
```

The differently named variable belongs to the reused M5.0 helper. Expect three
V7 `sync` commands, a SIMH monitor prompt and `Goodbye`, followed by container exit.
Stop only this relay with Ctrl-C. A failed step is a stop point: preserve the disk
and logs and investigate; do not claim clean shutdown from a process exit alone.

## Pi provisioning boundary

`python3 lab/m53/provision.py NEW_PRIVATE_DIRECTORY` runs **on the Mac**, requires
OpenSSL, and creates fresh credentials, fixed endpoint JSON and a one-day ECDSA
loopback certificate. Existing destinations are refused. It installs no trust and
performs no deployment. Keep every generated file private. The acceptance driver
first verifies TLS against that exact certificate, then uses isolated browser
contexts; no OS trust store or personal browser settings are changed.

The actual Pi procedure must first pass Mac checks and fresh readiness checks,
preserve and hash originals, use disposable media and an independent named Screen
console, and perform operator-led cleanup. See the [M5.1 pilot design](../../docs/lab/M5.1-pilot-plan.md)
for these boundaries. A simulator or listener must never be started merely by
opening a browser. Guest socket loss requires an explicit operator restart; the
pilot does not automatically reconnect or replay uncertain input.

For an explicitly prepared pilot, the manual **Pi Linux shell** invocation from
its private working directory is:

```sh
./bin/terminal-pilot-b8e9b74 \
  -config config/terminals.json \
  -token-file config/terminal.token \
  -observer-token-file config/observer.token \
  -tls-cert config/terminal-cert.pem \
  -tls-key config/terminal-key.pem
```

That filename identifies the tested candidate; it is not an installed PATH command.
Start the independently supervised disposable guest and verify its listener first.
Stop this bridge through its identified process with SIGTERM; it never shuts down
the guest. The [M5.3 report](../../docs/lab/M5.3.md) records the actual Screen-based
Pi run, measurements, original-file checks and cleanup. Its completion is not
permission to rerun a pilot on someone else's machine or enable autostart.
