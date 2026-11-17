"""Measure only a child mock server on this Mac, with fixed loopback load. No remote target option."""
import subprocess,time,json,platform,pathlib,statistics,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
def sample(pid):
 text=subprocess.check_output(['ps','-p',str(pid),'-o','rss=','-o','time='],text=True).strip().split()
 parts=text[1].split(':');seconds=0
 for p in parts:seconds=seconds*60+float(p)
 return int(text[0])*1024,seconds
server=subprocess.Popen([str(root/'bin/webdesktop-macos'),'-listen','127.0.0.1:18770'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
try:
 assert 'Mock-only' in server.stderr.readline()
 time.sleep(1)
 def phase(duration,load=None):
  before=sample(server.pid);start=time.monotonic();rss=[]
  while time.monotonic()-start<duration and (load is None or load.poll() is None):
   rss.append(sample(server.pid)[0]);time.sleep(.2)
  after=sample(server.pid);elapsed=time.monotonic()-start
  return {'elapsed_seconds':round(elapsed,3),'rss_mean_bytes':round(statistics.mean(rss)),'rss_peak_bytes':max(rss),'cpu_percent_one_core':round((after[1]-before[1])/elapsed*100,3)}
 idle=phase(10)
 load=subprocess.Popen([str(root/'bin/mockbench-macos')],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 active=phase(18,load);out,err=load.communicate(timeout=5)
 if load.returncode:raise RuntimeError(err)
 result={'scope':'Mac measurements; NOT Raspberry Pi measurements','platform':platform.platform(),'go':subprocess.check_output(['go','version'],text=True).strip(),'idle':idle,'active':active,'websocket':json.loads(out),'binary_bytes':{p.name:p.stat().st_size for p in (root/'bin').glob('webdesktop-*')},'binary_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'bin').glob('webdesktop-*')}}
 (root/'docs/performance-mac.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
finally:
 server.terminate();server.wait(timeout=5)
