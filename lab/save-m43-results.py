"""Archive M4.3 evidence, including superseded failures, without touching earlier milestone records."""
from pathlib import Path
import json,shutil,hashlib,subprocess,gzip
root=Path(__file__).resolve().parents[1];r=root/'.research/m43-results';out=root/'docs/lab/m43';out.mkdir(exist_ok=True)
def load(p):return json.loads(p.read_text())
a=load(r/'m43-observation.json');b=load(r/'browser-soak.json');reg=load(r/'final-regression/m41-report.json')
assert a['status']=='PASS' and a['elapsed_seconds']>=1800
assert b['status']=='PASS' and b['seconds']>=1800 and not b['errors']
assert b['dom_end']<=b['dom_start']+2000 and b['heap_after_gc']<=64*1024*1024
assert load(r/'browser-retention.json')['status']=='PASS' and load(r/'browser-plateau.json')['status']=='PASS'
assert reg['status'].startswith('PASS') and len(reg['cases'])==19
for p in ['budget/m43-budget.json','extra/m43-security.json','extra/m43-sequence.json','final-smoke/m43-observation.json']:assert load(r/p)['status']=='PASS'
files={
 'observation.json':r/'m43-observation.json','observation-samples.json':r/'m43-observation-samples.json',
 'browser-soak-initial.json':r/'browser-soak-initial.json','browser-soak-raw.json':r/'browser-soak-raw.json','browser-retention.json':r/'browser-retention.json','browser-baseline.json':r/'browser-baseline.json',
 'browser-heap-summary.json':r/'browser-heap-summary.json','browser-plateau.json':r/'browser-plateau.json','browser-plateau-initial.json':r/'browser-plateau-initial.json',
 'artifact-final-tests.txt':root/'.research/m43-artifacts-final.log',
 'browser-soak.json':r/'browser-soak.json','budget.json':r/'budget/m43-budget.json','budget-get.log':r/'budget/m43-budget-GET.log','budget-lamp.log':r/'budget/m43-budget-lamp_parameter.log',
 'sequence.json':r/'extra/m43-sequence.json','sequence.log':r/'extra/m43-sequence.log','security.json':r/'extra/m43-security.json','native-safari.json':r/'native-safari.json','browser-versions.json':r/'browser-versions.json',
 'final-smoke.json':r/'final-smoke/m43-observation.json','instruction-bench.json':r/'performance/m42-instruction-bench.json','m41-regression.json':r/'final-regression/m41-report.json',
 'm4-regression.json':r/'final-regression/m4-report.json','m3-regression.log':r/'final-regression/m41-original-m3-simh.log','m3-disabled-regression.log':r/'final-regression/m41-disabled-m3-simh.log',
 'original-environment.json':r/'final-regression/environment.json','regression-build.json':r/'final-regression/m41-build-metadata.json',
 'browser-tests.txt':root/'.research/m43-browser-tests.log','go-race-tests.txt':root/'.research/m43-go-race.log','ts-tests.txt':root/'.research/m43-ts-tests.log','ts-integration.txt':root/'.research/m43-ts-integration.log',
 'allocation-bench.txt':root/'.research/m43-benchmarks.txt','xdr-fuzz.txt':root/'.research/m43-fuzz-xdr.log','rpc-fuzz.txt':root/'.research/m43-fuzz-rpc.log','observation-fuzz.txt':root/'.research/m43-fuzz-observe.log',
 'regression-run.txt':root/'.research/m43-final-regression.log','budget-run.txt':root/'.research/m43-budget-tests.log',
 'primary-process-provenance.json':r/'primary-process-provenance.json','primary-running-binaries.json':r/'primary-running-binaries.json',
}
for name,p in files.items():shutil.copyfile(p,out/name)
# Preserve the observed earlier failure; do not present only the passing rerun.
shutil.copyfile(r/'failed-regression/m41-report.json',out/'initial-terminal-fixture-failure.json')
report=load(root/'.research/m43-browser-results.json');summary={'projects':[]}
for suite in report['suites']:
 for spec in suite.get('specs',[]):
  for t in spec.get('tests',[]):summary['projects'].append({'title':spec['title'],'project':t['projectName'],'status':t['status']})
assert len(summary['projects'])==30 and all(t['status']=='expected' for t in summary['projects'])
(out/'browser-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
artifact=root/'bin/webdesktop-linux-arm64'
assets={str(p.relative_to(root/'dist')):{'bytes':p.stat().st_size,'gzip_bytes':len(gzip.compress(p.read_bytes()))} for p in (root/'dist').rglob('*') if p.is_file() and p.name!='prototype.html'}
metadata={'scope':'Mac and network-none Linux ARM64 only; no Pi/GPIO','go':subprocess.check_output(['go','version'],text=True).strip(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'base_checkpoint':'checkpoint/m4.2','base_commit':'1491994401cf847aaeda88d05ce4a2d2792fd455','version':'0.4.3','browser_measurement_note':'Final browser run occurred after the primary observer run, not simultaneously; the old raw template label is corrected in the report while raw output is preserved. Initial unprimed 30-minute run failed +2000 DOM-node growth by 11 nodes; preserved. Lazy mounting did not explain it. Native browser undo retained nodes, with cleanup and accelerated plateau evidence. Final timed run follows 40 documented warm-up commands without changing either memory threshold.','arm64_bytes':artifact.stat().st_size,'arm64_sha256':hashlib.sha256(artifact.read_bytes()).hexdigest(),'assets':assets,'source_sha256':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for folder in ['src','internal','cmd','lab','scripts','tests','browser-tests'] for p in (root/folder).rglob('*') if p.is_file() and p.suffix in ['.go','.ts','.css','.c','.h','.py','.sh','.mjs'] and '__pycache__' not in p.parts},'primary_rss_source':'/proc/PID/stat resident estimate; PSS from smaps_rollup','final_smoke_rss_source':'smaps_rollup Rss and Pss','soak_revision_note':'Primary observation soak began during M4.3 development; the final browser soak used final embedded assets after all UI changes. Final incremental changes include credential-file checks, stale-stream reconnect, simultaneous observed controls, native-button keyboard handling and cosmetic highlights/labels/device indicators; these have focused and final regression validation, plus a full final browser soak; the observer did not receive a second 30-minute soak. Runtime shared bind-mounted Go executables were rebuilt after process start; deleted mappings cannot all be hashed through this host filesystem. Available live C/probe hashes and process paths are retained.'}
(out/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
print('Archived M4.3 evidence:',len(files),'records plus metadata and summary')
