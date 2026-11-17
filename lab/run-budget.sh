#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p .research/m43-results/budget
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/realcons-lab-linux-arm64 ./cmd/realcons-lab
docker --context orbstack run --rm --network none --read-only --cap-drop ALL --cap-add KILL --cap-add SETUID --cap-add SETGID --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=128m --tmpfs /run:rw,size=8m -e PIDP11_ISOLATED_LAB=1 -v "$PWD/bin:/fixtures:ro" -v "$PWD/lab:/lab:ro" -v "$PWD/.research/m43-results/budget:/results" pidp11-m43-budget:local python3 -u /lab/budget-tests.py
