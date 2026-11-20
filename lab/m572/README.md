# Diskless REALCONS lamp rehearsal

This Mac-hosted ARM64 Linux fixture checks original REALCONS behavior with synthetic switches. It does not operate a physical Pi, prove electrical behavior or authorize a hardware session. [M5.7.2 findings and limitations](../../docs/lab/M5.7.2.md).

`lamp-rehearsal.py` uses the unchanged `/opt/lab/pdp11_realcons` binary and retained laboratory PTY shim from the [existing lab image](../build-image.sh). It starts rpcbind and the Go stand-in, runs the verified original IDLED profile, halts, selects CONS PHY and compares LOAD ADRS with SR inputs 0, 1, 0, 2, 0. Each original-console SR examination must match without changing the ADDRESS output. The script requests graceful simulator exit and terminates only its own remaining lab children on exit.

Prerequisites: the existing ARM64 `pidp11-realcons-lab:local` Docker image, pinned source extracted by `lab/build-image.sh`, Go and the Mac OrbStack Docker context. Building that image separately fetches public source and build dependencies; the test itself has no external network. No guest image is needed. The minimal image lacks `column`, so the original profile's menu-formatting command reports an error; the recorded result covers memory deposition, execution, switch/display comparisons and exit, not successful menu formatting.

The following reconstructed reproduction commands use a **Mac shell at the repository root**. The actual completed run used equivalent private fixture paths. A fresh directory keeps earlier evidence intact:

```sh
m572_replay=$(mktemp -d "$PWD/.research/m572-replay.XXXXXX")
mkdir "$m572_replay/bin" "$m572_replay/work"
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build \
  -o "$m572_replay/bin/realcons-lab" ./cmd/realcons-lab
cp .research/lab-source/systems/idled/boot.ini \
  "$m572_replay/work/idled-original.ini"
docker --context orbstack run --rm --network none --read-only \
  --cap-drop ALL --cap-add SETUID --cap-add SETGID --cap-add KILL \
  --security-opt no-new-privileges --memory 256m --cpus 1 --pids-limit 64 \
  --tmpfs /tmp:rw,size=32m --tmpfs /run:rw,size=8m \
  -e PIDP11_ISOLATED_LAB=1 \
  -v "$PWD/lab:/lab:ro" \
  -v "$m572_replay/bin:/fixtures:ro" \
  -v "$m572_replay/work:/work" \
  pidp11-realcons-lab:local python3 -u /lab/m572/lamp-rehearsal.py
```

The harness requires the isolation flag, only loopback in its network namespace and the exact profile SHA-256. Do not weaken those checks or mount hardware, host media or the Pi installation. It writes `results.json`, the console transcript and child logs only inside the fresh work directory. A failed assertion is a failed checkpoint; preserve its logs rather than retrying a hardware operation. The container is removed on exit, while that local evidence directory remains for inspection.

The committed [rehearsal result](../../docs/lab/m572/rehearsal.json) is from the completed run. Shell syntax checking of the reproduction block is separate from that run; no further lab replay was needed for the final report edits.
