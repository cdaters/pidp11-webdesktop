#!/bin/sh
# Linux owner/administrator shell: read-only companion readiness inspection.
# Does not execute Oscar's programs, open media, bind sockets or change settings.
# An optional private config path is checked by this package's executable.
set -eu
failed=0
pass() { printf 'PASS: %s\n' "$1"; }
block() { printf 'BLOCKED: %s\n' "$1"; failed=1; }
[ "$#" -le 1 ] || { echo 'Usage: preflight.sh [private-config.json]' >&2; exit 2; }
if [ "$(uname -s)" = Linux ] && [ "$(uname -m)" = aarch64 ]; then
 pass 'Linux ARM64 platform'
else
 block 'Linux ARM64 is required for this package'
fi
for tool in systemctl getent useradd groupadd install sha256sum openssl; do
 if command -v "$tool" >/dev/null 2>&1; then pass "Required tool: $tool"; else block "Missing tool: $tool (check the administrator PATH)"; fi
done
if [ -r /sys/fs/cgroup/cgroup.controllers ] && tr ' ' '\n' < /sys/fs/cgroup/cgroup.controllers | grep -qx memory; then
 pass 'Kernel exposes the memory controller; effective service limits still require startup verification'
else
 block 'Kernel memory controller unavailable; no boot configuration is changed by this check'
fi
for original in /opt/pidp11/bin/client11 /opt/pidp11/bin/server11 /opt/pidp11/bin/scansw; do
 if [ -f "$original" ] && [ -r "$original" ] && [ -x "$original" ]; then
  pass "Original executable present (not run): $original"
 else block "Expected readable/executable original file missing: $original"; fi
done
if [ -r /opt/pidp11/systems/selections ]; then pass 'Original selection map readable (not changed)'; else block 'Original selection map unavailable'; fi
if getent passwd pidp11-webdesktop >/dev/null; then
 groups=$(id -nG pidp11-webdesktop)
 for group in $groups; do
  [ "$group" = pidp11-webdesktop ] || block "Companion identity has unexpected group: $group"
 done
 shell=$(getent passwd pidp11-webdesktop | cut -d: -f7)
 case "$shell" in */nologin|*/false) pass 'Companion account has no login shell';; *) block 'Companion account has a login shell';; esac
else
 pass 'Companion identity absent; installer will create its dedicated account'
fi
if [ "$#" = 1 ]; then
 package=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
 if "$package/webdesktop-service" check -config "$1"; then pass 'Private configuration, credentials, certificate and configured guest-line syntax'; else block 'Private configuration check failed'; fi
else
 printf '%s\n' 'MANUAL: Configure HTTPS origin, certificate trust, distinct tokens and reserved guest-only lines before startup.'
fi
printf '%s\n' 'MANUAL: Independently verify original physical/console operation and guest-line identity. No network reachability, listener ownership or guest compatibility was inferred.'
printf '%s\n' 'No files, services, guests, GPIO or boot settings were changed. Passing preflight is not deployment or attachment approval.'
exit "$failed"
