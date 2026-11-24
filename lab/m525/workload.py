"""Bounded genuine RT-11 comparison. Each mode requires a NEW /work and tape.
No automatic retry: an unexpected prompt/result preserves evidence and stops.
"""
import hashlib,json,os,re,signal,subprocess,sys,time,urllib.request
from pathlib import Path
sys.path.insert(0,'/lab')
from integration import Simh
from verify_tape import verify
assert os.environ.get('PIDP11_ISOLATED_LAB')=='1'
assert set(os.listdir('/sys/class/net'))=={'lo'}
root=Path('/work');mode=sys.argv[1]
assert mode in ['control','disabled','enabled','absent','crash','slow']
assert not (root/'console-private.txt').exists()
binary='/build/m525/'+('control' if mode=='control' else 'instrumented')+'/bin/pdp11_realcons'
sim=Simh(binary=binary,extra_env={'PIDP11_M525_ENABLE':'0' if mode in ['control','disabled'] else '1'})
reader=None;readers=[];durations=[];samples=[];states=[]
def resources(pid):
 p=Path('/proc')/str(pid);v={}
 for line in (p/'status').read_text().splitlines():
  if line.split(':')[0] in ['VmRSS','VmHWM','Threads']:v[line.split(':')[0]]=int(line.split()[1])
 f=(p/'stat').read_text().rsplit(')',1)[1].split();v['ticks']=int(f[11])+int(f[12]);v['fds']=len(list((p/'fd').iterdir()));return v
def status():
 with urllib.request.urlopen('http://127.0.0.1:8450/activity',timeout=2) as response:return json.load(response)
def start_reader(name,approve):
 global reader
 # Dropped UID/GID: observer has no root privilege or simulator-control interface.
 assert os.getuid() != 0, "Run the entire lab as an unprivileged user"
 reader=subprocess.Popen(['/lab/event-reader','-simulator-pid',str(sim.p.pid)],stdin=subprocess.PIPE,stdout=(root/(name+'.json')).open('x'),stderr=(root/(name+'.log')).open('x'),text=True)
 readers.append(reader)
 for _ in range(30):
  assert reader.poll() is None
  try:r=status();break
  except OSError:time.sleep(.05)
 else:raise RuntimeError('Reader unavailable')
 for _ in range(30):
  r=status()
  if r['generation']==1:break
  time.sleep(.05)
 assert r['generation']==1 and r['mode']=='unapproved',r
 states.append(r)
 if approve:
  reader.stdin.write(json.dumps({'instance':r['instance'],'generation':1,'guest':'rt11-v0503-operator-attested','verified':True})+'\n');reader.stdin.flush();time.sleep(.05)
  r=status();assert r['mode']=='approved-lab',r;states.append(r)
def command(text,expected):
 before=time.monotonic();os.write(sim.master,(text+'\r').encode())
 out='';deadline=before+5
 while time.monotonic()<deadline:
  out+=sim.read(.02)
  if re.search(r'(?:^|[\r\n])\.\s*$',out):break
 assert re.search(r'(?:^|[\r\n])\.\s*$',out) and expected in out,(text,out)
 assert '?PIP-F' not in out and '?KMON-F' not in out,(text,out)
 durations.append({'command':text,'seconds':time.monotonic()-before})
 (root/'console-private.txt').write_text(sim.log)
try:
 for cmd in ['set cpu 11/70 4M','set cpu idle','set dz disabled','set rl0 rl02','attach rl0 /work/disk0.work','set tm enabled','set tm0 locked','attach -r tm0 /work/tape/input.tap']:
  out=sim.command(cmd);assert 'sim> ' in out and 'Error' not in out,out
 sim.command('boot rl0');out=sim.read(.5);assert sim.log.rstrip().endswith('.')
 command('SHOW CONFIG','RT-11SJ (S) V05.03')
 command('REMOVE CT','.')
 command('INSTALL MT','.')
 command('SHOW DEVICES','MT      Installed')
 if mode in ['enabled','crash','slow']:start_reader('reader-first',True)
 baseline=resources(sim.p.pid);begin=time.monotonic()
 command('DIR MT0:','2 Files, 3 Blocks')
 command('COPY/IMAGE MT0:RECA.TXT SY:READA.TXT','.')
 command('COPY/IMAGE MT0:RECB.TXT SY:READB.TXT','.')
 if reader:
  time.sleep(.15);r=status();states.append(r);assert r['mode']=='approved-lab' and r['events']>0,r
 if mode=='crash':
  reader.kill();reader.wait(timeout=2);assert reader.returncode==-9
  # Exact owned dead reader's socket only; no unrelated socket is removed.
  Path('/tmp/m525-events.sock').unlink()
 if mode=='slow':os.kill(reader.pid,signal.SIGSTOP)
 for i in range(20):
  command('DIR MT0:','2 Files, 3 Blocks')
  sample={'simulator':resources(sim.p.pid),'at':time.monotonic()}
  if reader and reader.poll() is None:sample['reader']=resources(reader.pid)
  samples.append(sample)
 if mode=='slow':
  os.kill(reader.pid,signal.SIGCONT);time.sleep(.4);r=status();states.append(r);assert r['mode']=='retired' and r['activity']=='unknown',r
 if mode=='crash':
  start_reader('reader-restarted',False);assert status()['mode']=='unapproved'
  command('DIR MT0:','2 Files, 3 Blocks');assert status()['events']==0
  if os.environ.get('M525_REAPPROVE')=='1':
   command('SHOW CONFIG','RT-11SJ (S) V05.03') # Independent guest re-verification.
   time.sleep(.15);r=status();states.append(r)
   reader.stdin.write(json.dumps({'instance':r['instance'],'generation':r['generation'],'guest':'rt11-v0503-reverified','verified':True})+'\n');reader.stdin.flush();time.sleep(.05)
   assert status()['mode']=='approved-lab'
   command('DIR MT0:','2 Files, 3 Blocks');time.sleep(.15);r=status();states.append(r)
   assert r['mode']=='approved-lab' and r['events']>0,r
 if mode=='absent' and os.environ.get('M525_LATE_PROBE')=='1':
  start_reader('reader-late-unapproved',False);r=status();states.append(r)
  assert r['mode']=='unapproved' and r['events']==0 and r['lost']>0,r
 if mode=='enabled':
  time.sleep(.15);r=status();states.append(r);assert r['mode']=='approved-lab' and r['lost']==0,r
 # Stop the actual optional process before checking independent console access.
 for p in readers:
  if p.poll() is None:p.terminate();p.wait(timeout=3);assert p.returncode==0
 command('TYPE READA.TXT','M5.24 AUTHORED RECA.TXT')
 ending=resources(sim.p.pid);elapsed=time.monotonic()-begin
 sim.p.send_signal(signal.SIGINT);out=sim.read(.3);assert 'Simulation stopped' in out
 facts={cmd:sim.command(cmd) for cmd in ['show realcons','examine tm mts,mtc,mtbrc,mtcma,ust[0],pos[0]']}
 matched=verify(root)
 sim.command('quit');sim.p.wait(timeout=3);assert sim.p.returncode==0
 report={'mode':mode,'binary_sha256':hashlib.sha256(Path(binary).read_bytes()).hexdigest(),'guest':'RT-11SJ (S) V05.03','commands':durations,'states':states,'facts':facts,'byte_verification':matched,'baseline':baseline,'ending':ending,'samples':samples,'elapsed':elapsed,'cpu_ticks':ending['ticks']-baseline['ticks'],'clock_hz':os.sysconf('SC_CLK_TCK'),'guest_exit':sim.p.returncode,'original_console_after_reader_stop':True}
 (root/'result.json').write_text(json.dumps(report,indent=2));print(json.dumps({'mode':mode,'elapsed':elapsed,'cpu_ticks':report['cpu_ticks'],'ending':ending,'verified':True}),flush=True)
finally:
 for p in readers:
  if p.poll() is None:
   os.kill(p.pid,signal.SIGCONT);p.terminate();p.wait(timeout=3)
 (root/'console-private.txt').write_text(sim.log)
 sim.stop()
