#!/bin/sh
# Mac/OrbStack ARM64 lab only. Requires a fresh disk from lab/m50/prepare.py.
# Uses the already built pilot binary; no Pi access or published container ports.
set -eu
cd "$(dirname "$0")/../.."
: "${PIDP53_WORK:?Set PIDP53_WORK to a fresh prepared private lab directory}"
work=$(cd "$PIDP53_WORK" && pwd)
test -f "$work/disk0.hp"
test -f bin/terminal-pilot-linux-arm64
if test -e "$work/ready.json"; then
  echo 'Already booted: prepare a fresh disposable lab directory.' >&2
  exit 1
fi
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/terminal-cert-linux-arm64 lab/m50/certificate.go
docker --context orbstack run --rm --name pidp11-m53 --network none --read-only --cap-drop ALL --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=64m -v "$PWD/lab:/lab:ro" -v "$PWD/bin:/fixtures:ro" -v "$work:/work" pidp11-realcons-lab:local python3 -u /lab/m53/serve.py
