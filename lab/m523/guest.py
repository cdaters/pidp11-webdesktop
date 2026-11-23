"""Independent RT-11/RL02 lab console; fixed capture only at operator-verified idle.
No browser endpoint exists. Pausing/resuming belongs to this isolated experiment.
"""
import datetime,hashlib,json,os,signal,sys,time
from pathlib import Path
sys.path.insert(0,'/lab')
from integration import Simh
assert os.environ.get('PIDP11_ISOLATED_LAB')=='1'
assert set(os.listdir('/sys/class/net'))=={'lo'}
root=Path('/work');assert not (root/'ready.json').exists()
sim=Simh();paused=False
try:
 for command in ['set cpu 11/70 4M','set cpu idle','set dz disabled','set rl0 rl02','attach rl0 /work/disk0.work','boot rl0']:
  sim.command(command)
 (root/'ready.json').write_text(json.dumps({'simh_pid':sim.p.pid}))
 while sim.p.poll() is None:
  path=root/'request.json'
  if not path.exists():sim.read(.05);continue
  request=json.loads(path.read_text());path.unlink();op=request['op'];output=''
  if op=='console' and not paused:
   assert len(request['data'])<=256
   os.write(sim.master,request['data'].encode('ascii'));output=sim.read(request.get('wait',.4))
  elif op=='capture' and request.get('guest_idle_verified') is True and not paused:
   sim.p.send_signal(signal.SIGINT);output=sim.read(.5);assert 'Simulation stopped' in output
   paused=True
   commands=['show rl','show rl0','examine rl rlcs,rlda,rlba,rlmp']
   facts={c:sim.command(c) for c in commands}
   assert all('sim> ' in value for value in facts.values())
   media=root/'disk0.work';before=media.stat();digest=hashlib.sha256(media.read_bytes()).hexdigest();after=media.stat()
   assert (before.st_size,before.st_mtime_ns)==(after.st_size,after.st_mtime_ns)
   capture={'captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),'facts':facts,'sha256':digest,'size':after.st_size,'mtime_ns':after.st_mtime_ns,'inode':after.st_ino}
   (root/'capture.json').write_text(json.dumps(capture,indent=2));output+='\n'.join(facts.values())
  elif op=='continue' and paused:
   output=sim.command('continue');paused=False
  elif op=='finish' and request.get('guest_idle_verified') is True:
   if not paused:sim.p.send_signal(signal.SIGINT);output=sim.read(.5)
   output+=sim.command('quit');sim.p.wait(timeout=3);assert sim.p.returncode==0
  else:raise ValueError('Unexpected or unconfirmed lab request')
  (root/'console-private.txt').write_text(sim.log)
  temp=root/'response.tmp';temp.write_text(json.dumps({'id':request['id'],'output':output}));temp.replace(root/'response.json')
  if op=='finish':break
finally:
 (root/'console-private.txt').write_text(sim.log);sim.stop()
