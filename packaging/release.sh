#!/bin/sh
# Mac/developer shell. Creates a fresh candidate archive, not a GitHub release.
# Requires a clean committed source tree so the manifest identifies the build.
set -eu
cd "$(dirname "$0")/.."
[ "$#" = 2 ] || { echo 'Usage: release.sh version fresh-output-directory' >&2; exit 1; }
version=$1
case "$version" in ''|*[!a-zA-Z0-9._-]*|.*) echo 'Invalid version' >&2; exit 1;; esac
[ ! -e "$2" ] || { echo 'Output already exists; preserve it.' >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo 'Commit/review source changes before preparing a candidate archive.' >&2; exit 1; }
mkdir -p "$2"
out=$(cd "$2" && pwd)
name=pidp11-webdesktop-$version-linux-arm64
sh packaging/build.sh "$out/$name"
revision=$(git rev-parse HEAD)
printf '{"version":"%s","source_revision":"%s","platform":"linux-arm64","status":"laboratory candidate; not physical deployment acceptance","requires":"cgroup v2 memory controller; HTTPS; explicit guest-line approval"}\n' "$version" "$revision" > "$out/$name/COMPATIBILITY.json"
cp packaging/CANDIDATE-README.md "$out/$name/README.md"
cp docs/lab/M5.9.1.md "$out/$name/RELEASE-NOTES.md"
(cd "$out/$name" && shasum -a 256 COMPATIBILITY.json README.md RELEASE-NOTES.md >> PACKAGE_SHA256SUMS)
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$out/$name.tar.gz" -C "$out" "$name"
(cd "$out" && shasum -a 256 "$name.tar.gz" > SHA256SUMS)
printf '%s\n' 'Versioned candidate archive and checksum prepared. No GitHub release or installation performed.'
