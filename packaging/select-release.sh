#!/bin/sh
# Explicit upgrade/rollback selection; does not start the service.
set -eu
[ "$(id -u)" = 0 ] && [ "$#" = 1 ] || exit 1
case "$1" in ''|*[!a-zA-Z0-9._-]*|.*) exit 1;; esac
root=/opt/pidp11-webdesktop
[ -f "$root/.managed-companion" ] && [ ! -L "$root" ] || exit 1
if systemctl is-active --quiet pidp11-webdesktop.service; then echo 'Stop companion first.' >&2; exit 1; fi
release="$root/releases/$1"
[ -d "$release" ] && [ ! -L "$release" ] || exit 1
(cd "$release" && sha256sum -c SHA256SUMS)
install -m 0644 "$release/pidp11-webdesktop.service" /etc/systemd/system/pidp11-webdesktop.service
ln -s "releases/$1" "$root/current.new"
mv -Tf "$root/current.new" "$root/current"
systemctl daemon-reload
echo 'Release selected; still stopped. Configuration is unchanged; restore its private backup separately if needed.'
