"""M4.3 bounded-copy experiments; original C and M4.1 fence remain separate."""
from m41 import *
import threading
REPORT='/results/m43-budget.json'
BINARY='/opt/budgeted/pdp11_realcons'
def configure(sim,connect=True):
 for c in ['set cpu 11/70','set cpu 256K','deposit 2000 5200','deposit 2002 776','deposit pc 2000','set realcons host=127.0.0.1','set realcons panel=11/70','set realcons interval=20']+(['set realcons connected'] if connect else []):sim.command(c)
def attach(sim):
 marker=len(sim.log);t=time.monotonic();os.write(sim.master,b'set realcons connected\n')
 while 'sim> ' not in sim.log[marker:] and time.monotonic()-t<3:sim.read(.01)
 assert 'sim> ' in sim.log[marker:],sim.log[marker:]
 return (time.monotonic()-t)*1000

def main():
 assert [p.name for p in pathlib.Path('/sys/class/net').iterdir()]==['lo']
 report={'scope':'Optional budgeted C copy; IPv4-loopback UDP only, Mac Linux ARM64; no production guarantee','cases':{}}
 rpc=server=standin=sim=owner=None
 try:
  # No daemon: bounded no-registration failure. Then silent rpcbind black hole.
  sim=Simh(BINARY);configure(sim,False);report['no_rpcbind_attach_ms']=attach(sim);assert report['no_rpcbind_attach_ms']<500
  blackhole=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);blackhole.bind(('127.0.0.1',111))
  report['silent_rpcbind_attach_ms']=attach(sim);assert 150<report['silent_rpcbind_attach_ms']<500;blackhole.close();sim.stop();sim=None
  report['cases']['discovery']='passed absent and silent rpcbind; no DNS lookup or implicit port discovery'
  rpc=subprocess.Popen(['rpcbind','-f','-w']);time.sleep(.2);server=launch('direct')
  sim=Simh(BINARY);configure(sim,False);report['normal_attach_ms']=attach(sim);polls()
  # Descriptor schema semantics via full original M3 suite on optional copy.
  sim.stop();sim=None
  import integration
  original=integration.Simh;integration.Simh=lambda *a,**k:original(BINARY)
  integration.m3();integration.Simh=original
  stop(server);server=None;stop(rpc);rpc=None
  report['cases']['m3_compatibility']='passed original generated C UDP/TCP oracle and actual REALCONS semantic suite with optional UDP budgeted consumer'
  for name,hook,control in [('GET','/hold-next-reply',None),('lamp_parameter','/hold-parameter-reply','lamp-test')]:
   rpc=subprocess.Popen(['rpcbind','-f','-w']);time.sleep(.2)
   pathlib.Path(SOCKET).unlink(missing_ok=True)
   standin=launch('physical');physical(HALT=0);server=broker_launch();sim=Simh(BINARY,{'PIDP11_FENCE_SOCKET':SOCKET});configure(sim);polls();baseline();owner=Browser();owner.request('acquire');owner.request('set','sr',0o2000);owner.request('pulse','load');polls(4);owner.request('set','halt',0);owner.request('pulse','continue');wait(lambda:fence()['running']==1);polls(4)
   if control:
    owner.request('set','halt',1);polls(4);wait(lambda:fence()['quiescent']==1);baseline();owner.request('acquire');polls(4);assert fence()['armed']==1
   api(hook,{})
   if control:os.write(sim.master,b'set realcons test\n')
   wait(lambda:api('/held-reply')['held']);t=time.monotonic();server.kill();server.wait();server=None
   wait(lambda:fence()['armed']==0,3);wait(lambda:fence()['quiescent']==1,3)
   report[name+'_quiescence_ms']=(time.monotonic()-t)*1000;assert report[name+'_quiescence_ms']<800
   report[name+'_status']=fence();owner.close();owner=None
   server=broker_launch();time.sleep(.4);assert fence()['armed']==0 and fence()['quiescent']==1 and api('/state')['broker']['owner']==''
   report['cases'][name]='passed lost reply and broker crash; confirmed consumer quiescence; restart does not rearm or resume' if not control else 'passed held actual controller lamp-test parameter RPC during stopped/armed state; bounded watchdog acknowledgement, no rearm or resume (not a running-CPU stop test)'
   sim.stop();pathlib.Path('/results/m43-budget-'+name+'.log').write_text(sim.log);sim=None;stop(server);server=None;stop(standin);standin=None;stop(rpc);rpc=None
  report['status']='PASS'
 finally:
  if owner:owner.close()
  if sim:sim.stop();pathlib.Path('/results/m43-budget-failure.log').write_text(sim.log)
  stop(server);stop(standin);stop(rpc);pathlib.Path(REPORT).write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__':main()
