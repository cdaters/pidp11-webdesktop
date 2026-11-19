#!/bin/sh
# Linux administrator shell; first-run companion configuration only. Does not
# start services, alter the original installation or contact the guest endpoint.
set -eu
[ "$(id -u)" = 0 ] || { echo 'Run as administrator after reviewing the settings.' >&2; exit 1; }
[ "$#" = 3 ] || { echo 'Usage: configure.sh bind-IP:port https://browser-name:port loopback-guest-IP:port' >&2; exit 1; }
[ -f /opt/pidp11-webdesktop/.managed-companion ] || { echo 'Install the companion package first.' >&2; exit 1; }
if systemctl is-active --quiet pidp11-webdesktop.service; then echo 'Stop the companion before configuration.' >&2; exit 1; fi
private=/etc/pidp11-webdesktop
[ ! -e "$private" ] && [ ! -L "$private" ] || { echo 'Configuration already exists; retain it and review changes manually.' >&2; exit 1; }
exe=/opt/pidp11-webdesktop/current/webdesktop-service
"$exe" provision -directory "$private" -listen "$1" -origin "$2" -endpoint "$3"
# Explicit known files, no recursive ownership changes or wildcard chmod.
chown root:pidp11-webdesktop "$private"
chmod 0750 "$private"
for name in config.json certificate.pem key.pem writer.token observer.token; do
 chown root:pidp11-webdesktop "$private/$name"
 chmod 0640 "$private/$name"
done
runuser -u pidp11-webdesktop -- "$exe" check -config "$private/config.json"
echo 'Configuration ready; service remains stopped. Review certificate trust and token handling before manual start.'
