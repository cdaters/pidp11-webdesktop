#!/bin/sh
# Mac shell. A foreground disposable environment; stop through control.py shutdown.
set -eu
cd "$(dirname "$0")/../.."
: "${PIDP50_WORK:?Set PIDP50_WORK to the fresh prepared laboratory directory}"
work=$(cd "$PIDP50_WORK" && pwd)
test -f "$work/disk0.hp"
if test -e "$work/ready.json"; then
  echo 'This directory has already been booted. Prepare a fresh directory for a reproducible run.' >&2
  exit 1
fi
npm run build:server
mkdir -p bin
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/terminal-lab-linux-arm64 ./cmd/terminal-lab
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/terminal-cert-linux-arm64 lab/m50/certificate.go
docker --context orbstack run --rm --name pidp11-m50 --network none --read-only --cap-drop ALL --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=64m -e PIDP11_ISOLATED_LAB=1 -v "$PWD/lab:/lab:ro" -v "$PWD/bin:/fixtures:ro" -v "$work:/work" pidp11-realcons-lab:local python3 -u /lab/m50/serve.py
