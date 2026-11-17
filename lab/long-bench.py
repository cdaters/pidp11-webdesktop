"""Alternating instruction throughput sample; no RPC, images or GPIO."""
from integration import *
import statistics
binaries={'original':'/opt/lab/pdp11_realcons','fenced_disabled':'/opt/fenced/pdp11_realcons','observed_disabled':'/opt/observed/pdp11_realcons'}
results={name:[] for name in binaries};sims={}
def steps(sim,count):
 marker=len(sim.log);before=metrics(sim.p.pid)['cpu_seconds'];start=time.monotonic();os.write(sim.master,('step '+str(count)+'\n').encode())
 while 'sim> ' not in sim.log[marker:] and time.monotonic()-start<45:sim.read(.01)
 assert 'Step expired' in sim.log[marker:]
 return {'wall_seconds':time.monotonic()-start,'process_cpu_seconds':metrics(sim.p.pid)['cpu_seconds']-before}
try:
 for name,path in binaries.items():
  sim=sims[name]=Simh(path)
  for c in ['set cpu 11/70','set cpu 256K','deposit 2000 5200','deposit 2002 776','deposit pc 2000']:sim.command(c)
  steps(sim,100000000)
 for run in range(7):
  order=list(binaries);order=order[run%3:]+order[:run%3]
  for name in order:results[name].append(steps(sims[name],1000000000))
  print('Instruction benchmark round',run+1,flush=True)
 report={'scope':'Mac-hosted Linux ARM64; 7 alternating 1-billion-instruction samples per variant after 100M warmup; no RPC/guest/physical hardware','samples':results,'medians':{name:{k:statistics.median(s[k] for s in values) for k in ['wall_seconds','process_cpu_seconds']} for name,values in results.items()}}
 report['change_percent']={name:{k:(v/report['medians']['original'][k]-1)*100 for k,v in m.items()} for name,m in report['medians'].items() if name!='original'}
 pathlib.Path('/results/m42-instruction-bench.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report['change_percent']))
finally:
 for sim in sims.values():sim.stop()
