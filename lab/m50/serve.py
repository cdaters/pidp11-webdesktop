"""Disposable guest and fixed terminal service; never part of deployment."""
import os,sys,time,pathlib,subprocess,json,secrets,socket,signal,select,hashlib
sys.path.insert(0,'/lab')
from integration import Simh
root=pathlib.Path('/work');os.umask(0o077)
sim=Simh();bridge=None;traditional=None

def console(data,wait=.6):
 os.write(sim.master,data.encode('ascii'));return sim.read(wait)
def receive(sock,wait=.6):
 end=time.monotonic()+wait;data=b''
 while time.monotonic()<end:
  ready,_,_=select.select([sock],[],[],max(0,end-time.monotonic()))
  if ready:
   chunk=sock.recv(65536)
   if not chunk:break
   data+=chunk
 return data.decode('ascii',errors='replace')
def start_bridge():
 return subprocess.Popen(['/fixtures/terminal-lab-linux-arm64','-config','/tmp/terminals.json','-token-file','/tmp/terminal.token','-observer-token-file','/tmp/observer.token','-tls-cert','/tmp/observe-cert.pem','-tls-key','/tmp/observe-key.pem'],stdout=subprocess.DEVNULL,stderr=open('/work/bridge.log','a'))
def stop_bridge():
 global bridge
 if bridge:bridge.terminate();bridge.wait(timeout=3);bridge=None
try:
 config=pathlib.Path('/lab/m50/guest.ini').read_text()
 for line in config.splitlines():
  if line and not line.startswith(';'):sim.command(line)
 console('boot\r',1);console('hp(0,0)unix\r',2)
 assert '# ' in sim.log[-1000:],sim.log[-1000:]
 # This disposable fixture file is created by the genuine guest shell and emitted
 # later by the genuine guest cat. It tests transport/rendering, not a mock shell.
 fixture='\x1b[2J\x1b[HREAL UNIX V7 / VT100 TRANSPORT\r\n\x1b[7mREVERSE VIDEO\x1b[0m\r\n\x1b(0lqqqqqqk\r\nx      x\r\nmqqqqqqj\x1b(B\r\n'
 console('\x04',2)
 # Operator console login is independent of all browser and bridge ownership.
 console('dmr\r',1);operator=console('echo M50_OPERATOR_READY\r',.8)
 assert 'M50_OPERATOR_READY' in operator and '$ ' in operator,operator
 console('cat > m50.vt\r',.4);console(fixture.replace('\r\n','\n'),1);console('\x04',1)
 traditional=socket.create_connection(('127.0.0.1',40101),timeout=3)
 receive(traditional);traditional.sendall(b'\r');receive(traditional);traditional.sendall(b'dmr\r');out=receive(traditional)
 assert '$ ' in out,out
 for name in ['terminal','observer']:
  token=secrets.token_hex(32);pathlib.Path('/tmp/'+name+'.token').write_text(token);(root/(name+'.token')).write_text(token)
 configs=[{'id':'v7-dc0','label':'UNIX V7 · DC11 tty00','address':'127.0.0.1:40100','kind':'raw-guest-line'},{'id':'v7-dc2','label':'UNIX V7 · DC11 tty02','address':'127.0.0.1:40102','kind':'raw-guest-line'}]
 pathlib.Path('/tmp/terminals.json').write_text(json.dumps(configs))
 subprocess.run(['/fixtures/terminal-cert-linux-arm64'],check=True,stdout=subprocess.DEVNULL)
 bridge=start_bridge();time.sleep(.5);assert bridge.poll() is None
 (root/'ready.json').write_text(json.dumps({'guest':'Research UNIX Seventh Edition','simh_pid':sim.p.pid,'bridge_pid':bridge.pid,'upstream':'26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75','config':config,'original_binary_sha256':hashlib.sha256(pathlib.Path('/opt/lab/pdp11_realcons').read_bytes()).hexdigest()}))
 print('Isolated UNIX V7 guest, independent operator/DC11 line, and terminal bridge ready',flush=True)
 while True:
  sim.read(.05)
  req=root/'request.json'
  if not req.exists():continue
  message=json.loads(req.read_text());req.unlink();op=message['op'];out=''
  if op=='console':out=console(message['data'],message.get('wait',.7))
  elif op=='traditional':traditional.sendall(message['data'].encode('ascii'));out=receive(traditional,message.get('wait',.7))
  elif op=='bridge-stop':stop_bridge();out='bridge stopped; simulator remains running'
  elif op=='bridge-start':bridge=start_bridge();time.sleep(.5);out='bridge restarted';assert bridge.poll() is None
  elif op=='measure':
   # Only server process telemetry; never token or terminal-content logging.
   out=pathlib.Path(f'/proc/{bridge.pid}/stat').read_text()+'\n'+pathlib.Path(f'/proc/{bridge.pid}/status').read_text()
  elif op=='shutdown':
   stop_bridge();traditional.close();traditional=None
   out=console('sync\r',.5)+console('sync\r',.5)+console('sync\r',1)
   sim.p.send_signal(signal.SIGINT);out+=sim.read(.7);assert 'sim> ' in out,out
   out+=sim.command('quit');(root/'response.json').write_text(json.dumps({'id':message['id'],'output':out}));break
  else:raise ValueError('unknown local harness operation')
  (root/'response.json').write_text(json.dumps({'id':message['id'],'output':out}))
finally:
 stop_bridge()
 if traditional:traditional.close()
 sim.stop()
 (root/'operator-private.log').write_text(sim.log)
