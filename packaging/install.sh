#!/bin/sh
# Linux administrator shell. Installs this companion only, stopped and disabled.
set -eu
umask 077
[ "$(id -u)" = 0 ] || { echo 'Run as administrator after review.' >&2; exit 1; }
[ "$(uname -m)" = aarch64 ] || { echo 'Linux ARM64 required.' >&2; exit 1; }
[ "$#" = 2 ] || { echo 'Usage: install.sh package-directory version' >&2; exit 1; }
package=$(cd "$1" && pwd)
version=$2
case "$version" in ''|*[!a-zA-Z0-9._-]*|.*) echo 'Invalid version.' >&2; exit 1;; esac
root=/opt/pidp11-webdesktop
unit=/etc/systemd/system/pidp11-webdesktop.service
if systemctl is-active --quiet pidp11-webdesktop.service; then echo 'Stop the companion before installing.' >&2; exit 1; fi
if systemctl is-enabled --quiet pidp11-webdesktop.service 2>/dev/null; then echo 'Disable companion autostart before installing.' >&2; exit 1; fi
(cd "$package" && sha256sum -c SHA256SUMS)
for path in "$root" "$root/releases" /etc/pidp11-webdesktop "$unit"; do
 [ ! -L "$path" ] || { echo 'Unexpected symlink; stop.' >&2; exit 1; }
done
if [ -e "$root" ]; then
 [ -f "$root/.managed-companion" ] || { echo 'Unmanaged destination; stop.' >&2; exit 1; }
else
 [ ! -e "$unit" ] || { echo 'Unmanaged service unit; stop.' >&2; exit 1; }
 if getent passwd pidp11-webdesktop >/dev/null || getent group pidp11-webdesktop >/dev/null; then echo 'Existing service identity requires review.' >&2; exit 1; fi
 groupadd --system pidp11-webdesktop
 useradd --system --gid pidp11-webdesktop --home-dir /nonexistent --no-create-home --shell /usr/sbin/nologin pidp11-webdesktop
 install -d -m 0755 "$root" "$root/releases"
 printf '%s\n' 'pidp11-webdesktop package v1' > "$root/.managed-companion"
fi
[ ! -e "$root/releases/$version" ] || { echo 'Release already exists; never overwrite it.' >&2; exit 1; }
install -d -m 0755 "$root/releases/$version"
install -m 0755 "$package/webdesktop-service" "$root/releases/$version/"
install -m 0644 "$package/LICENSE" "$package/THIRD_PARTY_NOTICES.md" "$package/SHA256SUMS" "$package/pidp11-webdesktop.service" "$root/releases/$version/"
install -m 0644 "$package/pidp11-webdesktop.service" "$unit"
ln -s "releases/$version" "$root/current.new"
mv -Tf "$root/current.new" "$root/current"
systemctl daemon-reload
printf '%s\n' 'Installed. Service remains stopped and disabled. Provision configuration before manual start.'
