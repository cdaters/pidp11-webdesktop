"""Instruction-loop smoke benchmark, no RPC or guest OS; not a Pi acceptance test."""
from integration import Simh
import time,os,pathlib,json,statistics
results={}
for name,binary in [('original','/opt/lab/pdp11_realcons'),('patched_disabled','/opt/fenced/pdp11_realcons')]:
 sim=Simh(binary)
 try:
  for c in ['set cpu 11/70','set cpu 256K','deposit 2000 5200','deposit 2002 776','deposit pc 2000']:sim.command(c)
  samples=[]
  for i in range(4):
   marker=len(sim.log);t=time.monotonic();os.write(sim.master,b'step 100000000\n')
   while 'sim> ' not in sim.log[marker:] and time.monotonic()-t<30:sim.read(.02)
   assert 'Step expired' in sim.log[marker:],sim.log[marker:]
   if i:samples.append(time.monotonic()-t)
  results[name]={'steps_per_sample':100000000,'seconds':samples,'median_seconds':statistics.median(samples)}
 finally:sim.stop()
results['disabled_patch_wall_time_change_percent']=(results['patched_disabled']['median_seconds']/results['original']['median_seconds']-1)*100
results['scope']='3 timed 100M instruction samples after warmup; no RPC, guest OS or physical daemon; Mac-hosted Linux ARM64, not Pi'
pathlib.Path('/results/m41-cpu-bench.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
