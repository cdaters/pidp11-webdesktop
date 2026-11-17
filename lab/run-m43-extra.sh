#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
case "${1:-}" in security43.py|budget-sequence.py|m43-rollback-check.py) script=$1;; *) exit 2;; esac
mkdir -p .research/m43-results/extra
for name in observe-lab realcons-lab lab-cert; do
 CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o "bin/$name-linux-arm64" "./cmd/$name"
done
docker --context orbstack run --rm --network none --read-only --cap-drop ALL --cap-add KILL --cap-add SETUID --cap-add SETGID --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=128m --tmpfs /run:rw,size=8m -e PIDP11_ISOLATED_LAB=1 -v "$PWD/bin:/fixtures:ro" -v "$PWD/lab:/lab:ro" -v "$PWD/.research/m43-results/extra:/results" pidp11-m43-budget:local python3 -u "/lab/$script"
