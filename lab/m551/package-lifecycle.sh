#!/bin/sh
# Run only as root in the disposable ARM64 lab after systemd-lifecycle.py.
# Both m551-a and m551-b are rehearsal versions of the candidate, not releases.
set -eu
[ "${PIDP11_ISOLATED_LAB-}" = 1 ] || exit 1
[ "$(cat /sys/class/net/eth0/operstate)" = down ] || exit 1
[ -f /opt/pidp11-webdesktop/.managed-companion ] || exit 1
systemctl stop pidp11-webdesktop.service
/tmp/package-final/select-release.sh m551-a
[ "$(readlink /opt/pidp11-webdesktop/current)" = releases/m551-a ]
systemctl start pidp11-webdesktop.service
# Bound readiness wait; starting the unit does not mean HTTPS is already bound.
attempt=0
until /opt/pidp11-webdesktop/current/webdesktop-service status > /tmp/m551-rollback-status.json; do
 attempt=$((attempt+1)); [ "$attempt" -lt 30 ] || exit 1; sleep 0.1
done
python3 -c 'import json; assert all(l["state"]=="detached" for l in json.load(open("/tmp/m551-rollback-status.json"))["lines"])'
systemctl stop pidp11-webdesktop.service
/tmp/package-final/select-release.sh m551-b
systemctl start pidp11-webdesktop.service
systemctl disable --now pidp11-webdesktop.service
if systemctl is-active --quiet pidp11-webdesktop.service; then exit 1; fi
if systemctl is-enabled --quiet pidp11-webdesktop.service; then exit 1; fi
/tmp/package-final/uninstall.sh --purge-private-config-and-account
[ ! -e /opt/pidp11-webdesktop ]
[ ! -e /etc/pidp11-webdesktop ]
[ ! -e /run/pidp11-webdesktop ]
[ ! -e /etc/systemd/system/pidp11-webdesktop.service ]
if getent passwd pidp11-webdesktop; then exit 1; fi
if getent group pidp11-webdesktop; then exit 1; fi
printf '%s\n' 'PASS: upgrade, rollback, detached restart, disabled stop, complete companion uninstall.'
