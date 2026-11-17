#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Public source fetch only. Never invokes the PiDP installation scripts.
revision=26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75
mkdir -p .research/lab-source
if [ ! -f .research/pidp11-full.tar.gz ]; then
  curl -fL "https://codeload.github.com/obsolescence/pidp11/tar.gz/$revision" -o .research/pidp11-full.tar.gz
fi
printf '%s  %s\n' '3f857439ec9ab63de1f227dc7779c5c69df99d050f90e52209359330a6d9c070' '.research/pidp11-full.tar.gz' | shasum -a 256 -c -
tar -xzf .research/pidp11-full.tar.gz -C .research/lab-source --strip-components=1
docker --context orbstack build -f lab/Dockerfile -t pidp11-realcons-lab:local .
