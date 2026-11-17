"""Copy successful lab evidence into repository docs; normalize terminal text only."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'.research/lab-results';dest=root/'docs/lab'
for name in ['m3-state.json','m4-report.json','m4-trace.json','environment.json','build-metadata.json']:
 (dest/name).write_bytes((source/name).read_bytes())
for name in ['m3-simh.log','m4-simh.log']:
 text=(source/name).read_text().replace('\r','')
 (dest/name).write_text('\n'.join(line.rstrip() for line in text.splitlines())+'\n')
