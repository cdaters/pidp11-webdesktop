#!/bin/sh
# Mac development helper: requires npm dependencies and Go on PATH. Replaces
# generated dist/, embedded frontend assets and bin/ outputs; never deploys them.
set -eu
cd "$(dirname "$0")/.."
npm run build:server
mkdir -p bin
CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o bin/webdesktop-macos ./cmd/webdesktop
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o bin/webdesktop-linux-arm64 ./cmd/webdesktop
