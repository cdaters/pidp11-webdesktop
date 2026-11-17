"""Actual original C interoperability in a network-none Linux fixture only."""
import os,sys,json,time,subprocess,urllib.request,pty,select,signal,re,pathlib
BASE='http://127.0.0.1:8081'
def api(path,data=None):
 req=urllib.request.Request(BASE+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
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

def main():
 assert list(pathlib.Path('/sys/class/net').iterdir())==[pathlib.Path('/sys/class/net/lo')]
 rpc=subprocess.Popen(['rpcbind','-f','-w'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 server=None
 try:
  time.sleep(.15)
  server=subprocess.Popen(['/fixtures/realcons-lab-linux-arm64'],stdout=subprocess.DEVNULL,stderr=open('/results/server.log','w'))
  wait(lambda:api('/state'))
  m3()
 finally:
  if server:server.terminate();server.wait(timeout=3)
  rpc.terminate();rpc.wait(timeout=3)
if __name__=='__main__':main()
