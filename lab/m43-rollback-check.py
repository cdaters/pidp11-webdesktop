from integration import *
from terminal import terminal_probe
rpc=subprocess.Popen(['rpcbind','-f','-w']);standin=sim=None
try:
 time.sleep(.2);standin=launch('physical');physical(HALT=0)
 subprocess.run(['/fixtures/realcons-lab-linux-arm64','-register-probe','39100'],check=True)
 sim=Simh()
 for c in ['set cpu 11/70','set cpu 256K','deposit 2000 5200','deposit 2002 776','deposit pc 2000','set realcons host=127.0.0.1','set realcons panel=11/70','set realcons connected']:sim.command(c)
 def pget():return api('/state',base='http://127.0.0.1:8082')
 wait(lambda:pget()['gets']>5);physical(HALT=1,SR=0o2000);time.sleep(.1);physical(LOAD_ADRS=1);time.sleep(.1);physical(LOAD_ADRS=0);time.sleep(.1);physical(HALT=0,CONT=1);time.sleep(.1);physical(CONT=0)
 wait(lambda:pget()['outputs']['RUN']==1);physical(HALT=1);wait(lambda:pget()['outputs']['RUN']==0)
 physical(HALT=0);n=pget()['gets'];wait(lambda:pget()['gets']>=n+3)
 print('physical state',pget(),flush=True)
 print(terminal_probe(sim),flush=True)
finally:
 if sim:sim.stop();pathlib.Path('/results/m43-rollback-debug.log').write_text(sim.log)
 stop(standin);stop(rpc)
