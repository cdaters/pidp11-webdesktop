#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p bin .research/lab-results
npm run build:server
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/realcons-lab-linux-arm64 ./cmd/realcons-lab
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/lab-browser-probe-linux-arm64 ./cmd/lab-browser-probe
python3 lab/build-metadata.py
docker --context orbstack run --rm --network none --read-only --cap-drop ALL --cap-add SETUID --cap-add SETGID --cap-add KILL --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=128m --tmpfs /run:rw,size=8m -e PIDP11_ISOLATED_LAB=1 -v "$PWD/bin:/fixtures:ro" -v "$PWD/lab:/lab:ro" -v "$PWD/.research/lab-results:/results" pidp11-realcons-lab:local python3 -u /lab/integration.py "$@"
