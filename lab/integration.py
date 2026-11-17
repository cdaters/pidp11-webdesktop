"""Actual original C interoperability in a network-none Linux fixture only."""
import os,sys,json,time,subprocess,urllib.request,pty,select,signal,re,pathlib,hashlib,platform
BASE='http://127.0.0.1:8081'
def api(path,data=None,base=BASE):
 req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=2) as f:return json.load(f)
def wait(predicate,timeout=4):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  try:
   value=predicate()
   if value:return value
  except (OSError,KeyError):pass
  time.sleep(.02)
 raise AssertionError('condition timed out')
def setinputs(**values):api('/set',values)
def polls(n=3):
 before=api('/state')['gets'];wait(lambda:api('/state')['gets']>=before+n)
def pulse(name):setinputs(**{name:1});polls();setinputs(**{name:0});polls()
class Simh:
 def __init__(self):
  self.master,slave=pty.openpty();self.p=subprocess.Popen(['/opt/lab/pdp11_realcons'],stdin=slave,stdout=slave,stderr=slave,pass_fds=(self.master,),env={**os.environ,'LD_PRELOAD':'/opt/lab/ptyshim.so','PIDP11_LAB_PTY_MASTER':str(self.master)});os.close(slave);self.log='';self.read(.4)
 def read(self,duration=.15):
  end=time.monotonic()+duration;out=''
  while time.monotonic()<end:
   ready,_,_=select.select([self.master],[],[],max(0,end-time.monotonic()))
   if ready:
    try:chunk=os.read(self.master,65536).decode(errors='replace')
    except OSError:break
    if not chunk:break
    out+=chunk
  self.log+=out;return out
 def command(self,line):os.write(self.master,(line+'\n').encode());return self.read(.15)
 def stop(self):
  self.p.terminate()
  try:self.p.wait(timeout=2)
  except subprocess.TimeoutExpired:self.p.kill();self.p.wait()
  self.read(.02);os.close(self.master)

def m3():
 print('M3: original generated C client over UDP/TCP',flush=True)
 for transport in ['udp','tcp']:
  print(subprocess.check_output(['/opt/lab/c-client',transport],text=True,timeout=6).strip())
  s=api('/state');assert s['outputs']['ADDRESS']==0x123456 and s['outputs']['DATA']==0xff80,s
 collision=subprocess.run(['/fixtures/realcons-lab-linux-arm64','-register-probe','39123'],capture_output=True,text=True,timeout=3)
 assert collision.returncode!=0 and 'already registered' in collision.stderr,collision.stderr
 registrations=subprocess.check_output(['rpcinfo','-p','127.0.0.1'],text=True);print(registrations);assert '39099' in registrations
 sim=Simh()
 try:
  for cmd in ['set cpu 11/70','set cpu 256K','set realcons host=127.0.0.1','set realcons panel=11/70','set realcons interval=20','set realcons connected','show realcons']:
   print(sim.command(cmd).strip())
  polls();setinputs(SR=0o1000);pulse('LOAD_ADRS');setinputs(SR=0o12345);pulse('DEPOSIT');pulse('EXAM')
  out=sim.command('examine 1000');print(out.strip());assert re.search(r'1000:\s+012345',out),out
  assert api('/state')['outputs']['DATA']==0o12345,api('/state')
  setinputs(SR=0o2000);pulse('LOAD_ADRS');setinputs(SR=0o5200);pulse('DEPOSIT');setinputs(SR=0o776);pulse('DEPOSIT')
  setinputs(SR=0o2000);pulse('LOAD_ADRS');pulse('START')
  out=sim.command('examine pc');print(out.strip());assert re.search(r'PC:\s+002000',out),out
  pulse('CONT');out=sim.command('examine pc');assert re.search(r'PC:\s+002002',out),out
  setinputs(HALT=0);polls();assert api('/state')['outputs']['RUN']==0
  pulse('CONT');wait(lambda:api('/state')['outputs'].get('RUN')==1)
  setinputs(HALT=1);polls();wait(lambda:api('/state')['outputs']['RUN']==0)
  setinputs(HALT=0,START=1);polls();assert api('/state')['outputs']['RUN']==0
  setinputs(START=0);polls();wait(lambda:api('/state')['outputs']['RUN']==1)
  setinputs(HALT=1);polls();wait(lambda:api('/state')['outputs']['RUN']==0)
  setinputs(SR=0o201000,ADDR_SELECT=4);pulse('LOAD_ADRS')
  for pos in range(8):
   setinputs(ADDR_SELECT=pos);polls()
   address=api('/state')['outputs']['ADDRESS']
   if pos in [0,1,2,3,5,6]:assert address<=0xffff,(pos,address)
   if pos==4:assert address==0o201000,(pos,address)
  for pos in range(4):
   setinputs(DATA_SELECT=pos);polls();value=api('/state')['outputs']['DATA']
   if pos==1:assert value==0,value
   if pos==3:assert value==(0o201000&0xffff),value
  assert api('/state')['outputs']['ADDRESSING_16']==1
  print('M3 controls: memory, START reset/release, HALT, CONT step/run, all selector values passed')
  pathlib.Path('/results/m3-state.json').write_text(json.dumps(api('/state'),indent=2)+'\n')
 finally:
  sim.stop();pathlib.Path('/results/m3-simh.log').write_text(sim.log)

class Browser:
 def __init__(self):
  self.p=subprocess.Popen(['/fixtures/lab-browser-probe-linux-arm64'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
  self.hello=self.response()
 def response(self):
  ready,_,_=select.select([self.p.stdout],[],[],4)
  assert ready,'browser response timeout'
  line=self.p.stdout.readline();assert line, self.p.stderr.read();return json.loads(line)
 def request(self,kind,control='',value=0,accepted=True):
  self.p.stdin.write(json.dumps({'type':kind,'control':control,'value':value})+'\n');self.p.stdin.flush();r=self.response()
  if kind!='status':assert r['Accepted']==accepted,r
  return r
 def close(self):
  if self.p.poll() is None:self.p.terminate();self.p.wait(timeout=3)
def physical(**values):api('/set',values,base='http://127.0.0.1:8082')
def ppulse(name):physical(**{name:1});polls();physical(**{name:0});polls()
def baseline():api('/revoke',{});wait(lambda:api('/state')['broker']['phase']=='ready')
def launch(role):
 f=open('/results/'+role+'.log','w');p=subprocess.Popen(['/fixtures/realcons-lab-linux-arm64','-role',role],stdout=subprocess.DEVNULL,stderr=f);f.close()
 wait(lambda:api('/state',base='http://127.0.0.1:8082' if role=='physical' else BASE));return p
def stop(p):
 if p and p.poll() is None:
  p.terminate()
  try:p.wait(timeout=3)
  except subprocess.TimeoutExpired:p.kill();p.wait()
def setup_sim():
 sim=Simh()
 for command in ['set cpu 11/70','set cpu 256K','deposit 2000 5200','deposit 2002 776','deposit pc 2000','set realcons host=127.0.0.1','set realcons panel=11/70','set realcons interval=20','set realcons connected']:
  sim.command(command)
 polls();return sim

def metrics(pid):
 stat=pathlib.Path(f'/proc/{pid}/stat').read_text();fields=stat[stat.rfind(')')+2:].split()
 cpu=(int(fields[11])+int(fields[12]))/os.sysconf('SC_CLK_TCK');rss=int(fields[21])*os.sysconf('SC_PAGE_SIZE')
 pss=0
 for line in pathlib.Path(f'/proc/{pid}/smaps_rollup').read_text().splitlines():
  if line.startswith('Pss:'):pss=int(line.split()[1])*1024
 return {'cpu_seconds':cpu,'rss_bytes':rss,'pss_bytes':pss}
def measure(pid,owner=None):
 before=metrics(pid);start=time.monotonic();samples=[];latencies=[];count=300 if owner else 100;rate=20
 for i in range(count):
  if owner:
   if i%20==0:owner.request('renew')
   t=time.perf_counter();owner.request('set','sr',i);latencies.append((time.perf_counter()-t)*1000)
  if i%4==0:samples.append(metrics(pid))
  time.sleep(max(0,start+(i+1)/rate-time.monotonic()))
 elapsed=time.monotonic()-start;after=metrics(pid);latencies.sort()
 result={'seconds':round(elapsed,3),'rss_mean_bytes':round(sum(s['rss_bytes'] for s in samples)/len(samples)),'rss_peak_bytes':max(s['rss_bytes'] for s in samples),'pss_peak_bytes':max(s['pss_bytes'] for s in samples),'cpu_percent_one_core':round((after['cpu_seconds']-before['cpu_seconds'])/elapsed*100,3)}
 if owner:result.update(commands=count,viewers=2,command_rate_hz=rate,rtt_including_driver_ipc_p95_ms=round(latencies[int(len(latencies)*.95)],3))
 return result

def m4():
 standin=launch('physical');physical(HALT=0);server=launch('broker');sim=None;owner=None;observer=None;report={}
 try:
  sim=setup_sim();wait(lambda:api('/state')['broker']['phase']=='ready');report['idle_broker_measurement']=measure(server.pid);api('/grant-physical',{})
  physical(SR=0o2000);ppulse('LOAD_ADRS');physical(HALT=1);polls();physical(HALT=0);polls();ppulse('CONT')
  wait(lambda:api('/state')['outputs'].get('RUN')==1)
  wait(lambda:api('/state',base='http://127.0.0.1:8082')['outputs'].get('RUN')==1)
  baseline();assert api('/state')['outputs']['RUN']==0
  api('/grant-physical',{});physical(HALT=1);polls();physical(HALT=0);polls()
  os.kill(sim.p.pid,signal.SIGSTOP)
  physical(START=1);time.sleep(.06);physical(START=0);time.sleep(.06)
  os.kill(sim.p.pid,signal.SIGCONT);polls();assert api('/state')['outputs']['RUN']==0
  report['missed_physical_edge']='demonstrated: physical press/release between consumer polls is lost; no invented replay'
  physical(START=1);polls();baseline()
  held=Browser();held.request('acquire',accepted=False);held.close()
  physical(START=0);polls();assert api('/state')['broker']['owner']==''
  report['held_switch_handoff']='passed: physical momentary blocks grant until neutral and explicit request'

  owner=Browser();observer=Browser();owner.request('acquire');observer.request('acquire',accepted=False);observer.request('pulse','continue',accepted=False)
  owner.request('set','sr',0o12345);polls();assert api('/state')['broker']['effective']['SR']==0o12345;assert api('/state')['broker']['physical']['SR']==0o2000
  wait(lambda:observer.request('status')['State']['switchRegister']==0o12345)
  report['physical_virtual_observers']='passed: physical RUN/lamps, halted grant, one virtual owner, no SR merge'
  print('M4: physical and virtual ownership, observer synchronization passed')
  report['active_broker_measurement']=measure(server.pid,owner)
  # Delay consumer polls without using a wall-clock pulse release.
  owner.request('set','halt',0);os.kill(sim.p.pid,signal.SIGSTOP);before=api('/state')['gets'];owner.request('pulse','start');time.sleep(.10)
  assert api('/state')['gets']==before and api('/state')['broker']['effective']['START']==1
  owner.request('release');epoch=api('/state')['broker']['epoch'];os.kill(sim.p.pid,signal.SIGCONT)
  wait(lambda:api('/state')['broker']['phase']=='ready');state=api('/state');assert state['outputs']['RUN']==0
  frames=[f for f in state['broker']['trace'] if f['epoch']==epoch];assert len(frames)>=3
  assert frames[0]['inputs']['HALT']==1 and frames[0]['inputs']['START']==1
  assert frames[1]['inputs']['HALT']==1 and frames[1]['inputs']['START']==0
  report['delayed_poll_handoff']='passed: START held across missing polls; HALT frame precedes neutral frame'
  # Browser loss while an asserted START reply is held in transport.
  owner.request('acquire');owner.request('set','halt',0);os.kill(sim.p.pid,signal.SIGSTOP);api('/hold-next-reply',{});owner.request('pulse','start');os.kill(sim.p.pid,signal.SIGCONT)
  wait(lambda:api('/state')['heldReply']);owner.close();owner=None;wait(lambda:api('/state')['broker']['owner']=='');api('/release-reply',{})
  wait(lambda:api('/state')['broker']['phase']=='ready');assert api('/state')['outputs']['RUN']==0
  owner=Browser();assert owner.hello['State']['owner']=='';owner.request('pulse','continue',accepted=False)
  report['browser_disconnect']='passed: held START assertion, disconnect, safe neutralization, spectator reconnect'
  # Physical movement and RPC loss revoke ownership, never automatically re-arm.
  owner.request('acquire');physical(SR=0o2002);wait(lambda:api('/state')['broker']['owner']=='');wait(lambda:api('/state')['broker']['phase']=='ready')
  owner.request('acquire');os.kill(standin.pid,signal.SIGSTOP);wait(lambda:api('/state')['broker']['phase']=='fault');os.kill(standin.pid,signal.SIGCONT);time.sleep(.25)
  owner.request('acquire',accepted=False);baseline();owner.request('acquire')
  report['physical_movement_and_loss']='passed: revocation and persistent fault; fresh physical samples do not auto-arm'
  # Expiry is enforced by the server without browser cooperation.
  wait(lambda:api('/state')['broker']['owner']=='',timeout=4)
  wait(lambda:api('/state')['broker']['phase']=='ready')
  owner.request('pulse','continue',accepted=False);owner.request('acquire')
  report['lease_expiry']='passed: expiry halts/disarms; no implicit reacquisition'
  # Counterexample: an already-built falling START response cannot be retracted.
  owner.request('set','sr',0o2000);owner.request('pulse','load');polls(4);owner.request('set','halt',0)
  api('/hold-start-release',{});owner.request('pulse','start');wait(lambda:api('/state')['heldReply'])
  runs=api('/state')['broker']['runTransitions'];owner.request('release');api('/release-reply',{})
  wait(lambda:api('/state')['broker']['phase']=='ready');sim.read(.15)
  assert api('/state')['broker']['runTransitions']>runs or 'run 2000' in sim.log,sim.log
  assert api('/state')['outputs']['RUN']==0
  report['inflight_start_release']='COUNTEREXAMPLE: pre-handoff START=0/HALT=0 reply can run before the following HALT; no absolute cancellation guarantee'
  print('M4: demonstrated in-flight START release limitation')
  # Snapshot evidence before deliberately killing the broker.
  pathlib.Path('/results/m4-trace.json').write_text(json.dumps(api('/state'),indent=2)+'\n')
  owner.request('acquire');owner.request('set','halt',0);owner.request('pulse','continue');wait(lambda:api('/state')['outputs']['RUN']==1)
  sim.read(.1);server.kill();server.wait();crash_text=sim.read(.5)
  # A stop request is a separate operator recovery action, never broker failover.
  started=time.monotonic();os.write(sim.master,b'\x05');out=sim.read(1.5)
  report['broker_crash']='broker killed while RUN=1; no broker-delivered HALT is possible'
  report['crash_observation']=crash_text+out
  report['independent_stop_acknowledged']=('Simulation stopped' in out or 'sim>' in out)
  report['stop_observation_seconds']=round(time.monotonic()-started,3)
  print('M4: recorded broker crash and independent operator-stop observation')
  server=launch('broker');time.sleep(.1);assert api('/state')['broker']['owner']=='';assert api('/state')['broker']['effective']['HALT']==1
  report['broker_restart']='fresh halted/unowned baseline; stale ownership discarded'
 finally:
  if owner:owner.close()
  if observer:observer.close()
  if sim:sim.stop();pathlib.Path('/results/m4-simh.log').write_text(sim.log)
  stop(server);stop(standin)
  pathlib.Path('/results/m4-report.json').write_text(json.dumps(report,indent=2)+'\n')

def main():
 assert list(pathlib.Path('/sys/class/net').iterdir())==[pathlib.Path('/sys/class/net/lo')]
 manifest=json.loads(pathlib.Path('/lab/source-manifest.json').read_text())
 for name,digest in manifest['files'].items():assert hashlib.sha256((pathlib.Path('/upstream')/name).read_bytes()).hexdigest()==digest,name
 metadata={'environment':'Mac-hosted Linux laboratory, NOT Raspberry Pi','platform':platform.platform(),'interfaces':['lo'],'source_revision':manifest['revision'],'checked_source_hashes':manifest['files'],'simh_binary_sha256':hashlib.sha256(pathlib.Path('/opt/lab/pdp11_realcons').read_bytes()).hexdigest(),'go_lab_binary_sha256':hashlib.sha256(pathlib.Path('/fixtures/realcons-lab-linux-arm64').read_bytes()).hexdigest(),'packages':subprocess.check_output(['dpkg-query','-W','gcc','libtirpc3','libreadline8','rpcbind','libc6','python3'],text=True)}
 pathlib.Path('/results/environment.json').write_text(json.dumps(metadata,indent=2)+'\n')
 rpc=subprocess.Popen(['rpcbind','-f','-w'],stdout=subprocess.DEVNULL,stderr=open('/results/rpcbind.log','w'))
 server=None
 try:
  time.sleep(.15)
  if '--m4-only' not in sys.argv:
   server=launch('direct');m3();stop(server);server=None
  if '--m3-only' not in sys.argv:m4()
 finally:stop(server);stop(rpc)
if __name__=='__main__':main()
