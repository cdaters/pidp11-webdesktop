"""Record successful M4.2 evidence without replacing accepted earlier records."""
from pathlib import Path
import json,hashlib,subprocess,platform,datetime,gzip
root=Path(__file__).resolve().parent.parent
src=root/'.research/lab-results';dst=root/'docs/lab/m42';dst.mkdir(exist_ok=True)
for name in ['m42-observe.json','m42-recovery.json']:
 assert json.loads((src/name).read_text())['status']=='PASS',name
assert json.loads((src/'m41-report.json').read_text())['status']=='PASS with explicit safety limits'
browser=json.loads((root/'.research/m42-browser-results.json').read_text());assert browser['stats']['unexpected']==0 and browser['stats']['expected']==21
soak=json.loads((root/'.research/m42-browser-soak.json').read_text());assert not soak['errors'] and soak['commands']==300
copies={'m42-observe.json':'observation.json','m42-observe-simh.log':'observation-simh.log','m42-recovery.json':'recovery.json','m42-recovery-simh.log':'recovery-simh.log','m42-instruction-bench.json':'instruction-bench.json','m41-report.json':'m41-regression.json','m41-original-m4-report.json':'m4-regression.json','m41-original-m3-simh.log':'m3-regression.log','m41-disabled-m3-simh.log':'m3-disabled-regression.log','m41-original-environment.json':'original-environment.json','m41-build-metadata.json':'regression-build-metadata.json'}
for name,out in copies.items():(dst/out).write_bytes((src/name).read_bytes())
for name,out in [('m42-browser-soak.json','browser-soak.json'),('m42-observe-fuzz.log','observation-fuzz.txt'),('m42-allocation-bench.txt','allocation-bench.txt'),('m42-go-tests-final.log','go-race-tests.txt'),('m42-browsers-final.log','browser-tests.txt'),('m42-regressions.log','regression-run.txt')]:
 (dst/out).write_bytes((root/'.research'/name).read_bytes())
# Compact browser evidence, excluding absolute paths and trace artifacts.
(dst/'browser-summary.json').write_text(json.dumps({'stats':browser['stats'],'projects':[p['name'] for p in browser['config']['projects']],'native_safari':'not tested: native Mac session locked'},indent=2)+'\n')
artifacts=[]
for p in [*sorted((root/'dist/assets').glob('*')),root/'dist/index.html',root/'dist/prototype.html',root/'bin/webdesktop-linux-arm64',root/'bin/observe-lab-linux-arm64']:
 b=p.read_bytes();artifacts.append({'path':str(p.relative_to(root)),'bytes':len(b),'gzip_bytes':len(gzip.compress(b,mtime=0)),'sha256':hashlib.sha256(b).hexdigest()})
obs=json.loads((dst/'observation.json').read_text());eight=obs['eight_observers'];instruction=json.loads((dst/'instruction-bench.json').read_text())
measurements={'environment':'Mac Apple M4 Pro / network-none OrbStack ARM64; NOT Raspberry Pi','observer':eight,'baseline_panel_gets_per_second':obs['baseline']['gets_per_second'],'browser':soak,'instruction_change_percent':instruction['change_percent'],'artifacts':artifacts}
(dst/'measurements.json').write_text(json.dumps(measurements,indent=2)+'\n')
tracked_source=['lab/observe/publisher.c','lab/observe/apply.py','lab/recovery/apply.py','lab/m42.py','lab/recovery.py','lab/long-bench.py','internal/observe/observe.go','internal/observe/http.go','internal/access/access.go']
metadata={'recorded_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'host':platform.platform(),'go':subprocess.check_output(['go','version'],text=True).strip(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'note':'Evidence captured before the M4.2 checkpoint commit; final source hashes below. Lab regression binary hashes refer to their specific build, not subsequent documentation-only commits. Standalone packaging uses a build-specific style nonce, so HTML hashes vary per build.','source_sha256':{p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in tracked_source}}
(dst/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps({'observer_cpu':eight['observer']['cpu_percent_one_core'],'observer_rss_peak':eight['observer']['rss_peak_bytes'],'poll_rate':eight['gets_per_second'],'browser_heap_retained':soak['js_heap_after_gc_bytes']},indent=2))
