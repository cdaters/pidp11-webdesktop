#!/bin/sh
# Isolated Linux build, verified upstream source mounted read-only at /upstream.
# No packages, downloads, source edits, PCAP or SLIRP. Output is a fresh /work tree.
set -eu
[ "$PIDP11_ISOLATED_LAB" = 1 ]
[ ! -e /work/build-a ]
export SOURCE_DATE_EPOCH=1775779200
mkdir /work/build-a /work/build-b
cd /upstream/src/02.3_simh/4.x+realcons/src
for directory in /work/build-a/ /work/build-b/; do
  make -B -f quickmake NETWORK_OPT='-DUSE_NETWORK -DHAVE_TAP_NETWORK' \
    DISPLAY_OPT=-DUSE_DISPLAY \
    LDFLAGS='-lrt -lm -lpthread -ldl -lreadline -ltirpc' BIN="$directory"
done
cmp /work/build-a/pdp11_realcons /work/build-b/pdp11_realcons
cp /work/build-a/pdp11_realcons /work/pdp11-ethernet
sha256sum /work/pdp11-ethernet /opt/lab/pdp11_realcons
ldd /work/pdp11-ethernet
gcc --version
ld --version
uname -a
dpkg-query -W gcc libc6-dev libtirpc-dev libreadline-dev
