#!/bin/sh
set -eu
test ! -e /work/m525
mkdir -p /work/m525/control /work/m525/instrumented
cp -a /upstream /work/m525/control/upstream
cp -a /upstream /work/m525/instrumented/upstream
src=/work/m525/instrumented/upstream/src/02.3_simh/4.x+realcons/src
cp /lab/events.c /lab/events.h "$src/"
python3 /lab/apply.py "$src" "$(sha256sum /upstream/src/02.3_simh/4.x+realcons/src/PDP11/pdp11_tm.c | cut -d' ' -f1)"
for variant in control instrumented; do
 cd "/work/m525/$variant/upstream/src/02.3_simh/4.x+realcons/src"
 make -B -f quickmake NETWORK_OPT= DISPLAY_OPT=-DUSE_DISPLAY LDFLAGS='-lrt -lm -lpthread -ldl -lreadline -ltirpc' "BIN=/work/m525/$variant/bin/" > "/work/$variant-build.log" 2>&1
 sha256sum "/work/m525/$variant/bin/pdp11_realcons"
done
cd /lab
gcc -std=c11 -D_GNU_SOURCE -O2 -Wall -Wextra -Werror ring-test.c -lpthread -o /work/ring-test
/work/ring-test
gcc -std=c11 -D_GNU_SOURCE -g -O1 -fsanitize=address,undefined ring-test.c -lpthread -o /work/ring-asan
/work/ring-asan
gcc --version | head -1
uname -a
