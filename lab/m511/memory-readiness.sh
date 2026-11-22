#!/bin/sh
# Disposable ARM64 administrator shell only; never changes boot configuration.
set -eu
[ "${PIDP11_ISOLATED_LAB-}" = 1 ] && [ "$(hostname)" = pidp11-m511 ]
[ "$(uname -m)" = aarch64 ] && [ "$(cat /sys/class/net/eth0/operstate)" = down ]
unit=pidp11-webdesktop.service
override=/etc/systemd/system/$unit.d/zzzzz-m511-memory.conf
slice=/etc/systemd/system/m511-nomemory.slice
[ ! -e "$override" ] && [ ! -e "$slice" ]
systemctl stop "$unit"
printf '[Slice]\nDisableControllers=memory\n' > "$slice"
printf '[Service]\nSlice=m511-nomemory.slice\n' > "$override"
# Preserve failed-state evidence; restore the normal unit even on assertion failure.
cleanup() {
 systemctl stop "$unit"
 rm -f "$override"
 systemctl stop m511-nomemory.slice
 rm -f "$slice"
 systemctl daemon-reload
 systemctl reset-failed "$unit" || true
}
trap cleanup EXIT
systemctl daemon-reload
systemctl start "$unit" || true
attempt=0
until [ "$(systemctl show "$unit" -p ActiveState --value)" = failed ]; do
 attempt=$((attempt+1)); [ "$attempt" -lt 50 ]; sleep 0.1
done
! ss -lnt | grep -q ':8447'
journalctl -u "$unit" -n 15 --no-pager | grep 'memory containment unavailable'
cleanup
trap - EXIT
systemctl start "$unit"
attempt=0
until /opt/pidp11-webdesktop/current/webdesktop-service status > /tmp/m511-restored-status.json; do
 attempt=$((attempt+1)); [ "$attempt" -lt 30 ]; sleep 0.1
done
cat /tmp/m511-restored-status.json
systemctl show "$unit" -p MemoryMax -p MemorySwapMax -p TasksMax -p Restart
printf '%s\n' 'PASS: missing controller refused before HTTPS; normal protected service restored.'
