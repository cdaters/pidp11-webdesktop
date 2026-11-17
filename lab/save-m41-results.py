"""Record successful new M4.1 evidence, never overwrite historical M3/M4 files."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];source=root/'.research/lab-results';dest=root/'docs/lab'
report=json.loads((source/'m41-report.json').read_text())
assert report['status']=='PASS with explicit safety limits'
required=['m41-report.json','m41-simh.log','m41-build-metadata.json','m41-cpu-bench.json',
'm41-original-m3-simh.log','m41-original-m3-state.json','m41-original-m4-simh.log','m41-original-m4-report.json','m41-original-environment.json','m41-disabled-m3-simh.log','m41-disabled-m3-state.json']
assert 'COUNTEREXAMPLE' in json.loads((source/'m41-original-m4-report.json').read_text())['inflight_start_release']
for name in required:
 text=(source/name).read_text().replace('\r','')
 (dest/name).write_text('\n'.join(line.rstrip() for line in text.splitlines())+'\n')
