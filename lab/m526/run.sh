#!/bin/sh
# Mac shell. A development-only, network-none guest; never a production launcher.
set -eu
cd "$(dirname "$0")/../.."
: "${M526_WORK:?Set a fresh prepare.py destination}"
work=$(cd "$M526_WORK" && pwd)
[ ! -e "$work/ready.json" ] || { echo 'Previously booted; use a fresh copy.' >&2; exit 1; }
# Original binary hash is checked by guest.py before starting the emulator.
exec docker --context orbstack run --name pidp11-m526-v7 --network none \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --user "$(id -u):$(id -g)" --memory 96m --memory-swap 96m --cpus 2 \
  --pids-limit 128 --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -e PIDP11_ISOLATED_LAB=1 -v "$PWD/lab:/lab:ro" -v "$work:/work" \
  pidp11-realcons-lab:local python3 -u /lab/m526/guest.py
