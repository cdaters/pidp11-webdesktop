#!/bin/sh
# Mac shell: reviewed network-none lab with genuine V7, completed device exports
# and an explicitly labeled deterministic provider. No model installation.
set -eu
cd "$(dirname "$0")/../.."
: "${PIDP551_WORK:?fresh private working disk required}"
: "${PIDP551_PACKAGE:?reviewed package required}"
work=$(cd "$PIDP551_WORK" && pwd)
package=$(cd "$PIDP551_PACKAGE" && pwd)
[ ! -e "$work/ready.json" ] || { echo 'Use a fresh unbooted directory.' >&2; exit 1; }
(cd "$package" && shasum -a 256 -c PACKAGE_SHA256SUMS)
exec docker run --rm --name pidp11-m551 --network none --read-only --cap-drop ALL --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=64m -e PIDP11_ISOLATED_LAB=1 -v "$PWD/lab:/lab:ro" -v "$package:/fixtures:ro" -v "$work:/work" pidp11-realcons-lab:local python3 -u /lab/m551/serve.py /lab/m59/guest.ini /work/service-options.json
