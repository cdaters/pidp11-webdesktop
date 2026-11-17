"""M4.1 consumer-authority tests. Network-none only; no OS images or GPIO."""
from integration import *
import socket
SOCKET='/tmp/consumer.sock'
class Cases(dict):
 def __setitem__(self,key,value):
  super().__setitem__(key,value);print('M4.1 case:',key,flush=True)
def fence(command='STATUS'):
 with socket.socket(socket.AF_UNIX,socket.SOCK_SEQPACKET) as s:
  s.settimeout(1);s.connect(SOCKET);s.sendall(command.encode());return json.loads(s.recv(1024))
def fsim():
 pathlib.Path(SOCKET).unlink(missing_ok=True)
 sim=Simh('/opt/fenced/pdp11_realcons',{'PIDP11_FENCE_SOCKET':SOCKET})
 for c in ['set cpu 11/70','set cpu 256K','deposit 2000 5200','deposit 2002 776','deposit pc 2000','set realcons host=127.0.0.1','set realcons panel=11/70','set realcons interval=20','set realcons connected']:
  sim.command(c)
 wait(lambda:pathlib.Path(SOCKET).exists());polls();return sim

def broker_launch():
 f=open('/results/m41-broker.log','a');p=subprocess.Popen(['/fixtures/realcons-lab-linux-arm64','-role','broker','-consumer-fence',SOCKET],stdout=subprocess.DEVNULL,stderr=f);f.close();wait(lambda:api('/state'));return p

def m41():
 assert list(pathlib.Path('/sys/class/net').iterdir())==[pathlib.Path('/sys/class/net/lo')]
 report={'environment':'Mac-hosted isolated Linux ARM64; no Raspberry Pi, GPIO, guest images or production network', 'cases':Cases()}
 report['provenance']={'kernel':platform.platform(),'interfaces':[p.name for p in pathlib.Path('/sys/class/net').iterdir()],'source_revision':json.loads(pathlib.Path('/lab/source-manifest.json').read_text())['revision'],'sha256':{p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in ['/opt/lab/pdp11_realcons','/opt/fenced/pdp11_realcons','/opt/interlock/wd_fence.c','/opt/interlock/wd_fence.h','/opt/interlock/apply.py','/fixtures/realcons-lab-linux-arm64']}}
 cases=report['cases'];standin=launch('physical');physical(HALT=0);server=broker_launch();sim=None;owner=None;observer=None;logs=[]
 def fresh():
  baseline();owner.request('acquire')
 def load():
  owner.request('set','sr',0o2000);owner.request('pulse','load');polls(4)
 def run():
  owner.request('set','halt',0);owner.request('pulse','continue');wait(lambda:fence()['running']==1)
 try:
  sim=fsim();baseline();owner=Browser();observer=Browser()
  # Observe does not acquire authority, alter effective controls, or consume tickets.
  before=api('/state')['broker']['effective'];accepted=fence()['accepted']
  for _ in range(10):observer.request('status')
  assert api('/state')['broker']['effective']==before and fence()['accepted']==accepted
  observer.request('pulse','start',accepted=False)
  cases['observers']='passed: snapshots and rejected spectator controls do not alter controls/tickets'
  metrics_before=metrics(sim.p.pid);started=time.monotonic()
  report['idle_broker_measurement']=measure(server.pid)
  report['idle_consumer_measurement']={**metrics(sim.p.pid),'cpu_percent_one_core':round((metrics(sim.p.pid)['cpu_seconds']-metrics_before['cpu_seconds'])/(time.monotonic()-started)*100,3)}
  owner.request('acquire');observer.request('acquire',accepted=False)
  metrics_before=metrics(sim.p.pid);started=time.monotonic()
  report['active_broker_measurement']=measure(server.pid,owner)
  report['active_consumer_measurement']={**metrics(sim.p.pid),'cpu_percent_one_core':round((metrics(sim.p.pid)['cpu_seconds']-metrics_before['cpu_seconds'])/(time.monotonic()-started)*100,3)}
  # Original REALCONS operations still execute when granted.
  owner.request('set','sr',0o1000);owner.request('pulse','load');polls(4)
  owner.request('set','sr',0o12345);owner.request('pulse','deposit');polls(4)
  owner.request('pulse','examine');polls(4)
  assert re.search(r'1000:\s+012345',sim.command('examine 1000'))
  load();owner.request('pulse','start');polls(4) # RESET while HALT
  owner.request('pulse','continue');polls(4) # STEP
  assert re.search(r'PC:\s+002002',sim.command('examine pc'))
  cases['authorized_semantics']='passed: LOAD/DEP/EXAM, START reset, CONT step via original controller and fenced dispatch'
  # Same held falling-edge reply as permanent original M4 counterexample.
  load();owner.request('set','halt',0);api('/hold-start-release',{});owner.request('pulse','start');wait(lambda:api('/state')['heldReply'])
  runs=api('/state')['broker']['runTransitions'];a=fence()['accepted'];owner.request('release');generation=fence()['generation'];api('/release-reply',{})
  wait(lambda:api('/state')['broker']['phase']=='ready');assert fence()['quiescent']==1
  assert api('/state')['broker']['runTransitions']==runs and fence()['accepted']==a
  cases['inflight_start_release']='mitigated: exact held reply delivered after consumer revoke; no dispatch or RUN transition'
  print('M4.1: held START-release rejected at consumer')
  # Commands in the SIMH terminal queue, stopped immediately before dispatch.
  for name in ['start','continue','deposit','examine']:
   fresh();load()
   # START with HALT queues RESET; CONT with ENABLE queues CONT; others mutate/read CPU.
   if name=='continue':owner.request('set','halt',0)
   fence('HOLD');owner.request('pulse',name);wait(lambda:fence()['waiting']==1)
   old=fence();owner.request('release');revoked=fence();assert revoked['generation']!=old['generation']
   fence('RELEASE');wait(lambda:fence()['rejected']>old['rejected']);wait(lambda:api('/state')['broker']['phase']=='ready')
   assert fence()['accepted']==old['accepted'] and fence()['quiescent']==1
  cases['queued_commands']='passed: RESET(START), CONT, DEP, EXAM rejected at dispatch after revoke'
  # LOAD changes controller registers directly, so fence its RPC/service boundary.
  fresh();load();before_address=api('/state')['outputs']['ADDRESS']
  owner.request('set','sr',0o3000);api('/hold-load',{});owner.request('pulse','load')
  wait(lambda:api('/state')['heldReply']);owner.request('release');api('/release-reply',{});wait(lambda:api('/state')['broker']['phase']=='ready')
  assert api('/state')['outputs']['ADDRESS']==before_address
  cases['inflight_load']='passed: direct REALCONS LOAD mutation fenced at service boundary'
  # A queued RUN from START falling edge is also rejected.
  fresh();load();owner.request('set','halt',0);fence('HOLD');owner.request('pulse','start');wait(lambda:fence()['waiting']==1)
  old=fence();owner.request('release');fence('RELEASE');wait(lambda:fence()['rejected']>old['rejected']);wait(lambda:api('/state')['broker']['phase']=='ready')
  assert fence()['accepted']==old['accepted'];cases['queued_run']='passed: START-release RUN ticket rejected before SIMH action'
  # Duplicate consumed command ticket cannot execute again (even in same epoch).
  fresh();load();sim.read(.1);tickets=re.findall(r'@WD (\d+) (\d+)',sim.log);assert tickets
  token,seq=tickets[-1];old=fence();sim.command('@WD '+token+' '+seq)
  assert fence()['rejected']>old['rejected'] and fence()['accepted']==old['accepted']
  cases['duplicate_consumed_ticket']='passed: replay of already consumed ticket rejected'
  # Revocation cannot undo an operation that already committed.
  owner.request('set','sr',0o1002);owner.request('pulse','load');polls(4);owner.request('set','sr',0o54321);owner.request('pulse','deposit');polls(4);owner.request('release');baseline()
  assert re.search(r'1002:\s+054321',sim.command('examine 1002'))
  cases['already_committed']='EXPECTED LIMIT: committed DEP persists after revoke; fencing is not rollback'
  # Reordered generations never renew or arm current ownership.
  assert fence('PING '+str(generation))['ok']==0
  cases['stale_generation']='passed: stale PING does not renew current consumer lease'
  # Physical handoff, held switch interlock, physical movement and HALT priority.
  api('/grant-physical',{});physical(SR=0o2000);ppulse('LOAD_ADRS');physical(HALT=1);polls();physical(HALT=0);polls();ppulse('CONT');wait(lambda:fence()['running']==1)
  physical(HALT=1);wait(lambda:fence()['quiescent']==1);baseline();physical(START=1,HALT=0);polls();owner.request('acquire',accepted=False);physical(START=0);polls();owner.request('acquire');load();run()
  physical(HALT=1);wait(lambda:api('/state')['broker']['owner']=='');wait(lambda:fence()['quiescent']==1);physical(HALT=0);baseline()
  cases['physical_handoffs']='passed: physical RUN/HALT, held START blocks grant, physical HALT revokes virtual RUN'
  # Browser loss, expiry, temporary consumer stall all require explicit re-arm.
  owner.request('acquire');load();run();owner.close();owner=None
  wait(lambda:fence()['quiescent']==1);wait(lambda:api('/state')['broker']['phase']=='ready');owner=Browser();owner.request('pulse','continue',accepted=False)
  fresh();load();run();wait(lambda:api('/state')['broker']['owner']=='',4);wait(lambda:fence()['quiescent']==1)
  cases['browser_disconnect_and_expiry']='passed: consumer quiescence after loss/lease expiry; reconnect remains spectator'
  fresh();load();run();os.kill(sim.p.pid,signal.SIGSTOP);time.sleep(.5)
  # No consumer ack while stopped: broker must not grant. Then recover without resume command.
  owner.request('release',accepted=False);owner.request('acquire',accepted=False);os.kill(sim.p.pid,signal.SIGCONT)
  wait(lambda:fence()['armed']==0);wait(lambda:fence()['quiescent']==1);baseline()
  cases['consumer_stall']='passed: no false quiescence/grant while SIGSTOP; lease expires on recovery; explicit rearm'
  # Physical daemon failure/restart while running, no automatic ownership recovery.
  fresh();load();run();standin.kill();standin.wait();wait(lambda:api('/state')['broker']['phase']=='fault');wait(lambda:fence()['quiescent']==1)
  standin=launch('physical');physical(HALT=0);time.sleep(.3);owner.request('acquire',accepted=False);baseline()
  cases['physical_restart']='passed: fault inhibits, restart does not rearm, explicit baseline required'
  # Independent consumer watchdog, while RPC remains responsive and broker sends no revoke.
  fresh();load();run();api('/pause-heartbeat',{});t=time.monotonic()
  wait(lambda:fence()['armed']==0);wait(lambda:fence()['quiescent']==1)
  report['responsive_rpc_watchdog_stop_ms']=round((time.monotonic()-t)*1000,3)
  assert api('/state')['broker']['owner']!='' # proves this stop did not depend on broker revocation
  api('/resume-heartbeat',{});wait(lambda:api('/state')['broker']['phase']=='fault');baseline()
  cases['independent_watchdog']='passed: heartbeat loss with working RPC stops managed CPU, independently of broker revoke; no automatic resume'
  # Lost RPC response: withhold GET, kill broker; CPU may be blocked in original RPC.
  fresh();load();run();api('/hold-next-reply',{});wait(lambda:api('/state')['heldReply'])
  t=time.monotonic();server.kill();server.wait();wait(lambda:fence()['armed']==0)
  status=fence();report['watchdog_disarm_ms']=round((time.monotonic()-t)*1000,3)
  report['blocked_rpc_status']=status
  assert status['armed']==0
  cases['broker_crash_lost_rpc']='consumer lease disarmed independently; blocked original C RPC may delay quiescence (recorded separately)'
  # Kill stalled consumer as explicit laboratory supervisor fallback; never resume it.
  sim.p.kill();sim.p.wait();sim.read(.05);logs.append(sim.log);sim.stop();sim=None
  server=broker_launch();assert api('/state')['broker']['owner']==''
  sim=fsim();baseline();newgen=fence()['generation'];assert newgen!=status['generation'];assert fence('PING '+str(status['generation']))['ok']==0
  cases['broker_consumer_restart']='passed: fresh consumer boot generation, stale lease rejected, unowned/neutral restart'
  owner.close();owner=Browser()
  # Abrupt host/power-loss analogue: kill all integration processes, restart disarmed.
  owner.request('acquire');load();run();server.kill();server.wait();sim.p.kill();sim.p.wait();sim.read(.05);logs.append(sim.log);sim.stop();sim=None
  standin.kill();standin.wait();owner.close();owner=None;observer.close();observer=None
  standin=launch('physical');physical(HALT=0);server=broker_launch();sim=fsim();baseline()
  assert fence()['armed']==0 and api('/state')['broker']['owner']==''
  cases['abrupt_process_loss']='passed: all lab processes killed/restarted, no persisted owner or automatic execution; not a real power/storage test'
  # Browserless rollback: stop consumer + broker, re-register stand-in, original binary only.
  sim.stop();logs.append(sim.log);sim=None;stop(server);server=None
  subprocess.run(['rpcinfo','-d','99','1'],check=True,capture_output=True)
  subprocess.run(['/fixtures/realcons-lab-linux-arm64','-register-probe','39100'],check=True,capture_output=True)
  sim=Simh()
  for c in ['set cpu 11/70','set cpu 256K','deposit 2000 5200','deposit 2002 776','deposit pc 2000','set realcons host=127.0.0.1','set realcons panel=11/70','set realcons connected'] :sim.command(c)
  def pget():return api('/state',base='http://127.0.0.1:8082')
  wait(lambda:pget()['gets']>5);physical(HALT=1,SR=0o2000);time.sleep(.1);physical(LOAD_ADRS=1);time.sleep(.1);physical(LOAD_ADRS=0);time.sleep(.1);physical(HALT=0,CONT=1);time.sleep(.1);physical(CONT=0)
  wait(lambda:pget()['outputs']['RUN']==1);physical(HALT=1);wait(lambda:pget()['outputs']['RUN']==0)
  assert re.search(r'PC:\s+[0-7]+',sim.command('examine pc'))
  from terminal import terminal_probe
  # Wait for actual consumer reads of ENABLE, rather than a 100 ms guess.
  physical(HALT=0);enabled_gets=pget()['gets'];wait(lambda:pget()['gets']>=enabled_gets+3)
  report['independent_terminals']=terminal_probe(sim)
  physical(HALT=1)
  cases['independent_terminal_transports']='passed: two original DZ11 TCP/Telnet lines and local monitor coexist without broker/browser; no guest login/driver validation'
  cases['physical_only_rollback']='passed: no broker/browser/fence, RPC program99 routes to stand-in39100, unchanged SIMH performs physical RUN/HALT and direct monitor works'
  report['registration_after_rollback']=subprocess.check_output(['rpcinfo','-p','127.0.0.1'],text=True)
  report['status']='PASS with explicit safety limits'
  print('M4.1: queued tickets, faults, watchdog, restart and browserless rollback passed')
 finally:
  fence_path=pathlib.Path(SOCKET)
  if owner:owner.close()
  if observer:observer.close()
  if sim:sim.stop();logs.append(sim.log)
  stop(server);stop(standin)
  pathlib.Path('/results/m41-simh.log').write_text('\n--- consumer instance ---\n'.join(logs))
  pathlib.Path('/results/m41-report.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':
 subprocess.run(['/fixtures/consumer-test-linux-arm64','-test.v'],check=True,timeout=10)
 subprocess.run(['/opt/lab/fence-unit'],check=True,timeout=10)
 manifest=json.loads(pathlib.Path('/lab/source-manifest.json').read_text())
 for name,digest in manifest['files'].items():assert hashlib.sha256((pathlib.Path('/upstream')/name).read_bytes()).hexdigest()==digest,name
 rpc=subprocess.Popen(['rpcbind','-f','-w'],stdout=subprocess.DEVNULL,stderr=open('/results/m41-rpcbind.log','w'))
 try:time.sleep(.15);m41()
 finally:stop(rpc)
