#!/bin/sh
# Disposable ARM64 Linux administrator shell ONLY. Package at /tmp/package-final;
# external interface already DOWN. This script does not run on the physical Pi.
set -eu
[ "${PIDP11_ISOLATED_LAB-}" = 1 ] || exit 1
[ "$(uname -m)" = aarch64 ] || exit 1
[ "$(cat /sys/class/net/eth0/operstate)" = down ] || exit 1
cd /tmp/package-final
sha256sum -c PACKAGE_SHA256SUMS
sh install.sh /tmp/package-final m551-a
sh configure.sh 127.0.0.1:8445 https://127.0.0.1:8445 127.0.0.1:40100
# Repeated setup must refuse without changing private data.
sha256sum /etc/pidp11-webdesktop/* > /tmp/m56-private-before
if sh configure.sh 127.0.0.1:8445 https://127.0.0.1:8445 127.0.0.1:40100; then exit 1; fi
sha256sum -c /tmp/m56-private-before
sh install.sh /tmp/package-final m551-b
# OrbStack's type-wide LXC override weakens isolation. Reassert the distributed
# unit's directives locally, without weakening or editing the package unit.
mkdir -p /etc/systemd/system/pidp11-webdesktop.service.d
python3 - <<'PY'
from pathlib import Path
unit=Path('/tmp/package-final/pidp11-webdesktop.service').read_text()
keys=('NoNewPrivileges=','PrivateTmp=','PrivateDevices=','Protect','Restrict','CapabilityBoundingSet=','AmbientCapabilities=','InaccessiblePaths=')
Path('/etc/systemd/system/pidp11-webdesktop.service.d/zzzz-m56-hardening.conf').write_text('[Service]\n'+'\n'.join(line for line in unit.splitlines() if line.startswith(keys))+'\n')
PY
systemctl daemon-reload
systemctl start pidp11-webdesktop.service
systemctl show pidp11-webdesktop.service -p PrivateDevices -p ProtectSystem -p ProtectHome -p NoNewPrivileges -p MemoryMax -p Restart
