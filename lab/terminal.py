"""Original SIMH DZ11 transport smoke test; no guest OS and no browser broker."""
from integration import Simh
import socket,re,time,os,json,pathlib,signal

def terminal_probe(sim):
 # This RAM-only transport fixture starts a fresh device epoch; do not inherit
 # calibrated/co-scheduled timer state from the preceding RUN/HALT fault tests.
 # No guest image is attached. Retain the original 3 s socket deadline.
 sim.command('reset all')
 for c in ['set dz enabled','set dz lines=8','attach dz 127.0.0.1:40100']:sim.command(c)
 dev=sim.command('examine dz devaddr');match=re.search(r'DEVADDR:\s+([0-7]+)',dev);assert match,dev
 csr=int(match.group(1),8)&0xffff
 # Execute MOV #40,@#CSR (enable master scanner), then branch to self.
 for c in ['deposit 3000 12737','deposit 3002 40',f'deposit 3004 {csr:o}','deposit 3006 777','deposit pc 3000']:sim.command(c)
 first=socket.create_connection(('127.0.0.1',40100),timeout=3);second=socket.create_connection(('127.0.0.1',40100),timeout=3)
 try:
  sim.command('continue')
  banners=[first.recv(1024).hex(),second.recv(1024).hex()]
  first.sendall(b'first\r');second.sendall(b'second\r')
  marker=len(sim.log);sim.p.send_signal(signal.SIGINT);deadline=time.monotonic()+4
  while 'sim> ' not in sim.log[marker:] and time.monotonic()<deadline:sim.read(.1)
  assert 'sim> ' in sim.log[marker:],sim.log[marker:]
  connections=sim.command('show dz connections')
  assert 'line 0:' in connections.lower() and 'line 1:' in connections.lower(),connections
  assert re.search(r'PC:\s+[0-7]+',sim.command('examine pc'))
  return {'connections':connections,'telnet_banners_hex':banners,'stop_method':'SIGINT to original SIMH signal handler, then independent PTY monitor', 'scope':'two independent original DZ11 transport lines and direct PTY monitor; no guest OS login/driver test'}
 finally:first.close();second.close();sim.command('detach dz')

if __name__=='__main__':
 sim=Simh()
 try:
  sim.command('set cpu 11/70');sim.command('set cpu 256K')
  result=terminal_probe(sim);print(json.dumps(result,indent=2));pathlib.Path('/results/m41-terminal.json').write_text(json.dumps(result,indent=2)+'\n')
 finally:sim.stop();pathlib.Path('/results/m41-terminal.log').write_text(sim.log)
