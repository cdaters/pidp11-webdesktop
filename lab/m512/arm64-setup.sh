#!/bin/sh
# Disposable VM only: original simulator is a separate operator-owned lab copy.
set -eu
[ "${PIDP11_ISOLATED_LAB-}" = 1 ] && [ "$(hostname)" = pidp11-m512 ]
[ "$(uname -m)" = aarch64 ] && [ "$(cat /sys/class/net/eth0/operstate)" = down ]
cd /root/m512/package-new
sha256sum -c PACKAGE_SHA256SUMS
# This VM deliberately lacks Oscar's installed launcher and physical panel tools.
# Record the real preflight refusal; do not fabricate those programs to pass it.
if sh preflight.sh > /root/m512/preflight.log 2>&1; then exit 1; fi
grep 'Expected readable/executable original file missing' /root/m512/preflight.log
cd /root/m512/package-old
sh install.sh "$PWD" m511
sh configure.sh 127.0.0.1:8447 https://127.0.0.1:8447 127.0.0.1:40100
systemctl is-enabled pidp11-webdesktop.service || true
[ "$(systemctl is-active pidp11-webdesktop.service)" = inactive ]
mkdir -p /etc/systemd/system/pidp11-webdesktop.service.d
# OrbStack has a type-wide weakening override. Restore every distributed guard.
awk '/^NoNewPrivileges=|^PrivateTmp=|^PrivateDevices=|^Protect|^Restrict|^CapabilityBoundingSet=|^AmbientCapabilities=|^InaccessiblePaths=/' pidp11-webdesktop.service > /root/m512/guards
{ printf '[Service]\n'; cat /root/m512/guards; } > /etc/systemd/system/pidp11-webdesktop.service.d/zzzz-m512-hardening.conf
systemctl daemon-reload
sha256sum /root/m512/original/* /root/m512/guest/disk0.base > /root/m512/original-baseline.sha256
mkdir -p /opt/lab
cp /root/m512/original/ptyshim.so /opt/lab/ptyshim.so
systemctl start pidp11-webdesktop.service
systemctl show pidp11-webdesktop.service -p MemoryMax -p MemorySwapMax -p PrivateDevices -p ProtectSystem -p ProtectHome -p NoNewPrivileges -p Restart
