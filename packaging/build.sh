#!/bin/sh
# Mac/developer shell. Fresh output directory only; no installation or network use.
set -eu
cd "$(dirname "$0")/.."
[ "$#" = 1 ] && [ ! -e "$1" ] || { echo 'Provide a fresh output directory.' >&2; exit 1; }
npm run build:server
mkdir -p "$1"
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o "$1/webdesktop-service" ./cmd/webdesktop-service
cp LICENSE THIRD_PARTY_NOTICES.md packaging/pidp11-webdesktop.service "$1/"
(cd "$1" && shasum -a 256 webdesktop-service LICENSE THIRD_PARTY_NOTICES.md pidp11-webdesktop.service > SHA256SUMS)
cp packaging/install.sh packaging/select-release.sh packaging/uninstall.sh "$1/"
echo 'Package built; inspect and verify it before any separately authorized deployment.'
