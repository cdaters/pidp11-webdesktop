# M5.4 isolated lifecycle acceptance

This reuses the original M5.3 **Mac-hosted network-none Linux lab**, with new
candidate binaries and a new disposable public V7 disk. It does not run the
normal launcher, REALCONS or GPIO. The M5.4 addition replaces the original
simulator's DC11 listener on the same port and checks that the old browser stays
disconnected. It then tests explicit operator recovery with a fresh bridge and
fresh authentication. The private operator channel remains outside the web API.

Use the [M5.0 prerequisites/media checks](../../docs/lab/M5.0-runbook.md). The
following Mac-shell recipe preserves the accepted M5.3 binary in `bin/`.
Choose a new `m54-replay` destination for every replay; do not reuse a working disk.
Stop at a failed checkpoint and retain the disk/logs for inspection.

```sh
npm run build:server
mkdir -p .research/m54-replay/bin
chmod 700 .research/m54-replay
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o .research/m54-replay/bin/terminal-pilot-linux-arm64 ./cmd/terminal-pilot
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o .research/m54-replay/bin/terminal-cert-linux-arm64 lab/m50/certificate.go
python3 lab/m50/prepare.py .research/m50-download/systems.tar.gz .research/m54-replay/guest
```

Check that the `pidp11-m53` lab container name and Mac port 8445 are unused. Do not
stop another workload to obtain them. The retained M5.3 harness/relay uses that
container name even when testing M5.4 candidate bytes. Start the lab:

```sh
docker --context orbstack run --rm --name pidp11-m53 --network none --read-only --cap-drop ALL --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=64m -v "$PWD/lab:/lab:ro" -v "$PWD/.research/m54-replay/bin:/fixtures:ro" -v "$PWD/.research/m54-replay/guest:/work" pidp11-realcons-lab:local python3 -u /lab/m53/serve.py
```

Wait for the lab-ready message. In a second Mac shell start
`python3 lab/m53/forward.py`. In a third, run the existing genuine three-engine
acceptance followed by the new Chromium lifecycle check:

```sh
PIDP53_WORK=.research/m54-replay/guest node lab/m53/browser.mjs
PIDP54_WORK=.research/m54-replay/guest node lab/m54/lifecycle.mjs
```

The new script requires the lab environment marker and verifies the exact private
fixture TLS certificate. Its independent operator enters the SIMH monitor,
detaches/recreates DCI, and continues the same disposable guest. It uses the private supervisor's SIGINT monitor operation because this harness PTY does not deliver Ctrl-E as an interrupt. It inspects only the named network-none container's socket table and waits up to 90 seconds for the old line's `TIME_WAIT` state to clear before reattachment; it never probes the port by connecting or changes TCP settings. Expected results:
old browser loses input, the bridge stays detached during the two-second check,
a fresh console echo works, and manual bridge restart invalidates old web
sessions and returns new viewers read-only. It does not demonstrate guest reboot
identity inside an unchanged socket or physical-panel coexistence. Script failure
does not automatically resume, shut down or restart the guest.

After success, use the independent operator for clean shutdown:

```sh
PIDP50_WORK=.research/m54-replay/guest python3 lab/m50/control.py shutdown
```

Verify three V7 `sync` operations, SIMH monitor entry and `Goodbye`, then container
exit. Stop only this relay with Ctrl-C. Evidence and captures stay in the private
work directory; no accepted screenshot or milestone evidence is overwritten.
[Report and actual results](../../docs/lab/M5.4.md).
