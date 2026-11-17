"""Passive C publisher and eight-observer soak. Fixed network-none laboratory."""
from integration import *
import http.cookiejar,secrets,socket
REPORT='/results/m42-observe.json'
def receiver():
 pathlib.Path('/tmp/observe.sock').unlink(missing_ok=True)
 f=open('/results/m42-observe.log','a');p=subprocess.Popen(['/fixtures/observe-lab-linux-arm64'],stderr=f,stdout=subprocess.DEVNULL);f.close();wait(lambda:pathlib.Path('/tmp/observe.sock').exists());return p
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def login():
 req=urllib.request.Request('http://127.0.0.1:8083/api/v1/login',data=json.dumps({'token':pathlib.Path('/tmp/observe.token').read_text()}).encode(),headers={'Origin':'http://127.0.0.1:8083','Content-Type':'application/json'})
 with client.open(req,timeout=2) as f:assert f.status==200

def snapshot():
 with client.open('http://127.0.0.1:8083/api/v1/observe',timeout=2) as f:return json.load(f)
def span(pid,seconds):
 before=metrics(pid);n=api('/state')['gets'];t=time.monotonic();time.sleep(seconds);after=metrics(pid);elapsed=time.monotonic()-t
 return {'seconds':elapsed,'gets_per_second':(api('/state')['gets']-n)/elapsed,'cpu_percent_one_core':(after['cpu_seconds']-before['cpu_seconds'])/elapsed*100,**after}
def main42():
 assert [p.name for p in pathlib.Path('/sys/class/net').iterdir()]==['lo']
 token=pathlib.Path('/tmp/observe.token');token.write_text(secrets.token_hex(32));token.chmod(0o600)
 report={'scope':'Mac-hosted network-none Linux ARM64; original direct panel route, optional C observation copy; no Pi/GPIO/guest images','cases':{}}
 rpc=subprocess.Popen(['rpcbind','-f','-w'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);server=sim=obs=probe=None
 try:
  time.sleep(.2);server=launch('direct');obs=receiver();login();assert snapshot()['available']==False
  sim=Simh('/opt/observed/pdp11_realcons',{'PIDP11_OBSERVE_SOCKET':'/tmp/observe.sock'})
  for c in ['set cpu 11/70','set cpu 256K','deposit 2000 5200','deposit 2002 776','deposit pc 2000','set realcons host=127.0.0.1','set realcons panel=11/70','set realcons interval=20','set realcons connected']:sim.command(c)
  wait(lambda:snapshot()['fresh']);setinputs(SR=0o123456);polls();wait(lambda:snapshot()['frame']['inputs']['SR']==0o123456)
  # Exact copy of settled input/output banks, including selector feedback and lamps.
  setinputs(SR=0o2000);pulse('LOAD_ADRS');time.sleep(.2);s=snapshot();state=api('/state');assert len(s['frame']['inputs'])==13;assert s['frame']['inputs']=={k:state['inputs'].get(k,0) for k in s['frame']['inputs']}, (s['frame']['inputs'],state['inputs']);assert s['frame']['outputs']==state['outputs'], (s['frame']['outputs'],state['outputs'])
  routing=subprocess.check_output(['rpcinfo','-p','127.0.0.1'],text=True)
  report['cases']['raw_copy']='passed: all 13 inputs and 16 outputs match existing REALCONS RPC banks'
  report['baseline']=span(sim.p.pid,10)
  # Receiver absent and its Unix queue saturated must never stall the consumer.
  stop(obs);obs=None;n=api('/state')['gets'];time.sleep(1);assert api('/state')['gets']>n+20
  with socket.socket(socket.AF_UNIX,socket.SOCK_DGRAM) as slow:
   pathlib.Path('/tmp/observe.sock').unlink(missing_ok=True);slow.bind('/tmp/observe.sock');n=api('/state')['gets'];time.sleep(2);assert api('/state')['gets']>n+50
  obs=receiver();login();wait(lambda:snapshot()['fresh']);assert snapshot()['frame']['publisherDropped']>0
  report['cases']['receiver_absent_and_queue_full']='passed: nonblocking drops, existing RPC continues; receiver restart automatically receives current read-only snapshot'
  os.kill(sim.p.pid,signal.SIGSTOP);time.sleep(.5);assert not snapshot()['fresh'];os.kill(sim.p.pid,signal.SIGCONT);wait(lambda:snapshot()['fresh'])
  report['cases']['consumer_stall']='passed: last state retained but marked stale; fresh only after new consumer cycle'
  # Direct physical-equivalent operations continue with no broker or browser ownership.
  setinputs(HALT=0);pulse('CONT');wait(lambda:snapshot()['frame']['outputs']['RUN']==1);setinputs(HALT=1);wait(lambda:snapshot()['frame']['outputs']['RUN']==0)
  report['cases']['independent_physical_route']='passed: direct CONT/RUN/HALT with observation, no broker/ownership changes'
  probe=subprocess.Popen(['/fixtures/observe-probe-linux-arm64','-seconds','300'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  before={name:metrics(p.pid) for name,p in [('consumer',sim.p),('observer',obs),('panel_server',server)]};n=api('/state')['gets'];start=time.monotonic();samples=[]
  while probe.poll() is None:
   samples.append({name:metrics(p.pid) for name,p in [('consumer',sim.p),('observer',obs),('panel_server',server)]});time.sleep(2)
   if len(samples)%15==0:print('M4.2 observer soak:',round(time.monotonic()-start),'seconds',flush=True)
  out,err=probe.communicate();assert probe.returncode==0,err
  elapsed=time.monotonic()-start;report['eight_observers']=json.loads(out);report['eight_observers']['gets_per_second']=(api('/state')['gets']-n)/elapsed
  for name in before:
   values=[s[name] for s in samples];report['eight_observers'][name]={'cpu_percent_one_core':(values[-1]['cpu_seconds']-before[name]['cpu_seconds'])/elapsed*100,'rss_start_bytes':values[0]['rss_bytes'],'rss_end_bytes':values[-1]['rss_bytes'],'rss_peak_bytes':max(s['rss_bytes'] for s in values),'pss_peak_bytes':max(s['pss_bytes'] for s in values)}
  assert abs(report['eight_observers']['gets_per_second']/report['baseline']['gets_per_second']-1)<.15
  assert subprocess.check_output(['rpcinfo','-p','127.0.0.1'],text=True)==routing
  report['cases']['polling_independence']='passed: eight observers do not increase panel GET frequency or change RPC registrations'
  report['provenance']={'original_sha256':hashlib.sha256(pathlib.Path('/opt/lab/pdp11_realcons').read_bytes()).hexdigest(),'observed_sha256':hashlib.sha256(pathlib.Path('/opt/observed/pdp11_realcons').read_bytes()).hexdigest(),'publisher_sha256':hashlib.sha256(pathlib.Path('/opt/observe/publisher.c').read_bytes()).hexdigest()}
  report['status']='PASS'
 finally:
  if probe and probe.poll() is None:stop(probe)
  if sim:sim.stop();pathlib.Path('/results/m42-observe-simh.log').write_text(sim.log)
  stop(obs);stop(server);stop(rpc);pathlib.Path(REPORT).write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__':main42()
