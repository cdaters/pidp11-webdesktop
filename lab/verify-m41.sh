#!/bin/sh
# Complete safe local oracle sequence. Build image first; never addresses the Pi.
set -eu
cd "$(dirname "$0")/.."
sh lab/run.sh
python3 - <<'PY'
from pathlib import Path
r=Path('.research/lab-results')
for n in ['m3-simh.log','m3-state.json','m4-simh.log','m4-report.json','environment.json']:
 (r/('m41-original-'+n)).write_bytes((r/n).read_bytes())
PY
sh lab/run.sh --m3-only --fence-disabled
python3 - <<'PY'
from pathlib import Path
r=Path('.research/lab-results')
for n in ['m3-simh.log','m3-state.json']:
 (r/('m41-disabled-'+n)).write_bytes((r/n).read_bytes())
PY
sh lab/run.sh --m41
python3 - <<'PY'
from pathlib import Path
r=Path('.research/lab-results')
(r/'m41-build-metadata.json').write_bytes((r/'build-metadata.json').read_bytes())
PY
sh lab/run.sh --cpu-bench
