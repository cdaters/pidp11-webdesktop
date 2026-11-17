"""Bounded UDP call experiment. No automatic reconnect/rearm/resume."""
from m41 import *
def recovery():
 assert [p.name for p in pathlib.Path('/sys/class/net').iterdir()]==['lo']
 report={'scope':'Optional isolated per-call timeout experiment; no production safety claim','cases':{}};rpc=subprocess.Popen(['rpcbind','-f','-w']);standin=server=sim=owner=None
 try:
  time.sleep(.2);standin=launch('physical');physical(HALT=0);server=broker_launch()
  sim=Simh('/opt/bounded/pdp11_realcons',{'PIDP11_FENCE_SOCKET':SOCKET})
  for c in ['set cpu 11/70','set cpu 256K','deposit 2000 5200','deposit 2002 776','deposit pc 2000','set realcons host=127.0.0.1','set realcons panel=11/70','set realcons interval=20','set realcons connected']:sim.command(c)
  polls();baseline();owner=Browser();owner.request('acquire');owner.request('set','sr',0o2000);owner.request('pulse','load');polls(4);owner.request('set','halt',0);owner.request('pulse','continue');wait(lambda:fence()['running']==1)
  api('/hold-next-reply',{});wait(lambda:api('/state')['heldReply']);t=time.monotonic();server.kill();server.wait();wait(lambda:fence()['armed']==0,5);wait(lambda:fence()['quiescent']==1,5)
  report['confirmed_quiescence_ms']=(time.monotonic()-t)*1000;report['status_after_loss']=fence();report['cases']['lost_reply_broker_crash']='passed: bounded calls return, consumer watchdog confirms quiescence; no new execution command'
  server=broker_launch();time.sleep(.5);assert fence()['armed']==0 and fence()['quiescent']==1 and api('/state')['broker']['owner']==''
  report['cases']['restart']='passed: broker restart leaves consumer disarmed/quiescent; no automatic rearm/resume'
  report['limits']=['200 ms per call is not an end-to-end stop deadline','clnt_create/rpcbind discovery remains separately blocking','scheduler/process stalls and physical GPIO unproven','no cancellation or rollback of commands already committed','UDP only; TCP timeout/reconnect recovery not validated']
  report['status']='PASS'
 finally:
  if owner:owner.close()
  if sim:sim.stop();pathlib.Path('/results/m42-recovery-simh.log').write_text(sim.log)
  stop(server);stop(standin);stop(rpc);pathlib.Path('/results/m42-recovery.json').write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__':recovery()
