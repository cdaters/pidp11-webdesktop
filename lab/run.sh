#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
result_dir=${PIDP11_RESULTS_DIR:-.research/lab-results}
mkdir -p bin "$result_dir"
npm run build:server
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/realcons-lab-linux-arm64 ./cmd/realcons-lab
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/lab-browser-probe-linux-arm64 ./cmd/lab-browser-probe
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go test -c -o bin/consumer-test-linux-arm64 ./internal/consumer
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/observe-lab-linux-arm64 ./cmd/observe-lab
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/observe-probe-linux-arm64 ./cmd/observe-probe
python3 lab/build-metadata.py
script=integration.py
if [ "${1:-}" = "--instruction-bench" ]; then script=long-bench.py; shift; fi
if [ "${1:-}" = "--recovery" ]; then script=recovery.py; shift; fi
if [ "${1:-}" = "--m42" ]; then script=m42.py; shift; fi
if [ "${1:-}" = "--m41" ]; then script=m41.py; shift; fi
if [ "${1:-}" = "--terminal" ]; then script=terminal.py; shift; fi
if [ "${1:-}" = "--cpu-bench" ]; then script=cpu-bench.py; shift; fi
docker --context orbstack run --rm --network none --read-only --cap-drop ALL --cap-add SETUID --cap-add SETGID --cap-add KILL --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=128m --tmpfs /run:rw,size=8m -e PIDP11_ISOLATED_LAB=1 -v "$PWD/bin:/fixtures:ro" -v "$PWD/lab:/lab:ro" -v "$PWD/$result_dir:/results" pidp11-realcons-lab:local python3 -u "/lab/$script" "$@"
