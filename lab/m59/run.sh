#!/bin/sh
# Mac shell: foreground original-SIMH fixture with a fresh disposable V7 copy.
# No published ports, network, GPIO, or original guest paths inside the container.
set -eu
cd "$(dirname "$0")/../.."
: "${PIDP551_WORK:?Fresh lab/m50/prepare.py destination required}"
: "${PIDP551_PACKAGE:?Reviewed packaging/build.sh output required}"
work=$(cd "$PIDP551_WORK" && pwd)
package=$(cd "$PIDP551_PACKAGE" && pwd)
[ ! -e "$work/ready.json" ] || { echo 'Already booted; prepare another disposable copy.' >&2; exit 1; }
python3 - "$work" <<'PY'
import hashlib,pathlib,sys
root=pathlib.Path(sys.argv[1]);base=root/'disk0.base.hp';disk=root/'disk0.hp'
assert base.stat().st_ino!=disk.stat().st_ino
for p in [base,disk]:
 with p.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()=='fc04dab1e7f2fbf3ea4b44603ed2c9d6ba15f4f86c702d4a27a1dac725966f39'
PY
(cd "$package" && shasum -a 256 -c SHA256SUMS)
exec docker run --rm --name pidp11-m551 --network none --read-only --cap-drop ALL --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=64m -e PIDP11_ISOLATED_LAB=1 -v "$PWD/lab:/lab:ro" -v "$package:/fixtures:ro" -v "$work:/work" pidp11-realcons-lab:local python3 -u /lab/m551/serve.py /lab/m59/guest.ini
