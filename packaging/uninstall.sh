#!/bin/sh
# Removes only managed companion releases/unit. Retains private configuration and
# account for explicit review, so unknown owner files are never silently deleted.
set -eu
[ "$(id -u)" = 0 ] || exit 1
purge=false
case "${1-}" in --purge-private-config-and-account) purge=true;; '') :;; *) echo 'Unknown option.' >&2; exit 1;; esac
root=/opt/pidp11-webdesktop
[ -f "$root/.managed-companion" ] && [ ! -L "$root" ] || exit 1
if systemctl is-active --quiet pidp11-webdesktop.service || systemctl is-enabled --quiet pidp11-webdesktop.service 2>/dev/null; then echo 'Stop and disable companion first.' >&2; exit 1; fi
if pgrep -u pidp11-webdesktop >/dev/null; then echo 'Service identity still has processes; stop.' >&2; exit 1; fi
# Refuse unexpected contents. Do not follow any release directory symlinks.
[ "$(find "$root" -type l ! -path "$root/current" | wc -l)" -eq 0 ] || exit 1
find "$root" -type f | while IFS= read -r file; do
 case "$file" in "$root/.managed-companion"|"$root"/releases/*/webdesktop-service|"$root"/releases/*/LICENSE|"$root"/releases/*/THIRD_PARTY_NOTICES.md|"$root"/releases/*/SHA256SUMS|"$root"/releases/*/pidp11-webdesktop.service) :;; *) echo 'Unknown retained file; stop.' >&2; exit 1;; esac
done
if "$purge"; then
 [ ! -L /etc/pidp11-webdesktop ] || exit 1
 for file in /etc/pidp11-webdesktop/* /etc/pidp11-webdesktop/.[!.]*; do
  [ -e "$file" ] || [ -L "$file" ] || continue
  [ -f "$file" ] && [ ! -L "$file" ] || { echo 'Unknown private content; retain and review.' >&2; exit 1; }
  case "$file" in /etc/pidp11-webdesktop/config.json|/etc/pidp11-webdesktop/certificate.pem|/etc/pidp11-webdesktop/key.pem|/etc/pidp11-webdesktop/writer.token|/etc/pidp11-webdesktop/observer.token) :;; *) echo 'Unknown private file; retain and review.' >&2; exit 1;; esac
 done
 [ "$(id -Gn pidp11-webdesktop)" = pidp11-webdesktop ] || { echo 'Additional account groups; review first.' >&2; exit 1; }
 [ -z "$(getent group pidp11-webdesktop | cut -d: -f4)" ] || { echo 'Group has other members; review first.' >&2; exit 1; }
fi
rm /etc/systemd/system/pidp11-webdesktop.service
rm -r -- "$root"
systemctl daemon-reload
if "$purge"; then
 rm -f -- /etc/pidp11-webdesktop/config.json /etc/pidp11-webdesktop/certificate.pem /etc/pidp11-webdesktop/key.pem /etc/pidp11-webdesktop/writer.token /etc/pidp11-webdesktop/observer.token
 rmdir /etc/pidp11-webdesktop
 userdel pidp11-webdesktop
 if getent group pidp11-webdesktop >/dev/null; then groupdel pidp11-webdesktop; fi
 echo 'Companion, known private inputs, and dedicated account removed. No guest or original installation paths touched.'
 exit 0
fi
echo 'Companion removed. Private /etc/pidp11-webdesktop and inactive account retained for owner review; see uninstall guide.'
