#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
result_dir=${PIDP43_RESULTS_DIR:-.research/m43-results}
mkdir -p bin "$result_dir"
for name in observe-lab observe-probe m43-probe lab-cert realcons-lab lab-browser-probe; do
 CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o "bin/$name-linux-arm64" "./cmd/$name"
done
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go test -c -o bin/observe-test-linux-arm64 ./internal/observe
docker --context orbstack run --rm --network none --read-only --cap-drop ALL --cap-add SETUID --cap-add SETGID --cap-add KILL --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=128m --tmpfs /run:rw,size=8m -e PIDP11_ISOLATED_LAB=1 -e "PIDP43_SOAK_SECONDS=${PIDP43_SOAK_SECONDS:-1800}" -v "$PWD/bin:/fixtures:ro" -v "$PWD/lab:/lab:ro" -v "$PWD/$result_dir:/results" pidp11-realcons-lab:local python3 -u /lab/m43.py
