"""30-minute credential-verified passive C + TLS observer workload, network-none."""
from integration import *
import secrets,ssl,http.cookiejar
REPORT='/results/m43-observation.json'
def main43():
 assert [p.name for p in pathlib.Path('/sys/class/net').iterdir()]==['lo']
 subprocess.run(['/fixtures/observe-test-linux-arm64','-test.run','TestKernelPublisherIdentity|TestDifferentUIDPublisher','-test.v'],check=True,timeout=15)
 subprocess.run(['/fixtures/lab-cert-linux-arm64'],check=True)
 token=pathlib.Path('/tmp/observe.token');token.write_text(secrets.token_hex(32));token.chmod(0o600)
 runtime=pathlib.Path('/tmp/pidp43-observe');runtime.mkdir(mode=0o700);sock=str(runtime/'state.sock')
 rpc=subprocess.Popen(['rpcbind','-f','-w'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);server=sim=obs=probe=None;report={'scope':'Mac-hosted Linux ARM64 network-none; pinned C publisher PID/UID/start/executable; TLS1.3 observers; no Pi or GPIO','cases':{}}
 try:
  time.sleep(.2);server=launch('direct');sim=Simh('/opt/observed/pdp11_realcons',{'PIDP11_OBSERVE_SOCKET':sock})
  for c in ['set cpu 11/70','set cpu 256K','deposit 2000 5200','deposit 2002 776','deposit pc 2000','set realcons host=127.0.0.1','set realcons panel=11/70','set realcons interval=20','set realcons connected']:sim.command(c)
  f=open('/results/m43-observer.log','w');obs=subprocess.Popen(['/fixtures/observe-lab-linux-arm64','-socket',sock,'-publisher-pid',str(sim.p.pid),'-publisher-uid','0','-tls-cert','/tmp/observe-cert.pem','-tls-key','/tmp/observe-key.pem'],stdout=subprocess.DEVNULL,stderr=f);f.close();wait(lambda:pathlib.Path(sock).exists())
  ctx=ssl.create_default_context(cafile='/tmp/observe-cert.pem');client=urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
  req=urllib.request.Request('https://127.0.0.1:8443/api/v1/login',data=json.dumps({'token':token.read_text()}).encode(),headers={'Origin':'https://127.0.0.1:8443','Content-Type':'application/json'})
  with client.open(req,timeout=2) as r:assert r.status==200
  def snapshot():
   with client.open('https://127.0.0.1:8443/api/v1/observe',timeout=2) as r:return json.load(r)
  wait(lambda:snapshot()['fresh']);routing=subprocess.check_output(['rpcinfo','-p','127.0.0.1'],text=True)
  # Same UID but different PID cannot inject a valid captured frame.
  import socket
  old=snapshot();payload=json.dumps({**old['frame'],'seq':old['frame']['seq']+100000}).encode()
  with socket.socket(socket.AF_UNIX,socket.SOCK_DGRAM) as attacker:attacker.sendto(payload,sock)
  wait(lambda:snapshot()['rejected']>old['rejected']);assert snapshot()['frame']['seq']<old['frame']['seq']+100000
  report['cases']['publisher_identity']='passed kernel credentials: same UID different PID rejected; separate UID/group transport test passed'
  setinputs(SR=0o2000,DATA_SELECT=0);pulse('LOAD_ADRS');setinputs(HALT=0);pulse('CONT');wait(lambda:api('/state')['outputs']['RUN']==1)
  before_gets=api('/state')['gets'];t=time.monotonic();time.sleep(10);report['baseline_running_gets_hz']=(api('/state')['gets']-before_gets)/(time.monotonic()-t)
  seconds=int(os.getenv('PIDP43_SOAK_SECONDS','1800'));probe=subprocess.Popen(['/fixtures/m43-probe-linux-arm64','-seconds',str(seconds)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  processes={'consumer':sim.p,'observer':obs,'physical_standin':server};start=time.monotonic();before={k:metrics(p.pid) for k,p in processes.items()};samples=[];transitions=[];phase='running';last_gets=api('/state')['gets'];last_time=start
  while probe.poll() is None:
   elapsed=time.monotonic()-start
   # One 60-second halted phase per 5 minutes tests low-activity behavior without
   # changing routing; all transitions are explicit physical-equivalent inputs.
   desired='idle' if int(elapsed)%300>=240 else 'running'
   if desired!=phase:
    setinputs(HALT=1 if desired=='idle' else 0)
    if desired=='running':pulse('CONT')
    phase=desired;transitions.append({'seconds':elapsed,'phase':phase})
   current=api('/state');now=time.monotonic();samples.append({'seconds':round(elapsed,3),'phase':phase,'poll_hz':(current['gets']-last_gets)/(now-last_time),**{k:metrics(p.pid) for k,p in processes.items()}});last_time=now;last_gets=current['gets'];time.sleep(2)
   if len(samples)%30==0:print('M4.3 primary soak',round(time.monotonic()-start),'seconds',phase,flush=True)
  out,err=probe.communicate();assert probe.returncode==0,err;report['stream']=json.loads(out);elapsed=time.monotonic()-start
  for name in processes:
   rows=[s[name] for s in samples];report[name]={'cpu_percent_one_core':(rows[-1]['cpu_seconds']-before[name]['cpu_seconds'])/elapsed*100,'rss_start_bytes':rows[0]['rss_bytes'],'rss_end_bytes':rows[-1]['rss_bytes'],'rss_peak_bytes':max(s['rss_bytes'] for s in rows),'pss_peak_bytes':max(s['pss_bytes'] for s in rows),'rss_first_minute_mean':sum(s['rss_bytes'] for s in rows[:30])/min(30,len(rows)),'rss_last_minute_mean':sum(s['rss_bytes'] for s in rows[-30:])/min(30,len(rows))}
  report['poll_hz_by_phase']={p:sum(s['poll_hz'] for s in samples[1:] if s['phase']==p)/len([s for s in samples[1:] if s['phase']==p]) for p in ['running','idle'] if any(s['phase']==p for s in samples[1:])};report['transitions']=transitions;report['elapsed_seconds']=elapsed
  assert subprocess.check_output(['rpcinfo','-p','127.0.0.1'],text=True)==routing
  assert abs(report['poll_hz_by_phase']['running']/report['baseline_running_gets_hz']-1)<.20
  assert report['observer']['rss_peak_bytes']<64*1024*1024
  report['cases']['polling_route']='unchanged registrations; viewer churn does not increase running physical poll rate'
  report['status']='PASS';pathlib.Path('/results/m43-observation-samples.json').write_text(json.dumps(samples)+'\n')
 finally:
  stop(probe)
  if sim:sim.stop();pathlib.Path('/results/m43-simh.log').write_text(sim.log)
  stop(obs);stop(server);stop(rpc);pathlib.Path(REPORT).write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__':main43()
