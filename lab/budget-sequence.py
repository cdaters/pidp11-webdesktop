"""Aggregate attach budget: many individually responsive descriptor RPCs."""
from integration import *
BINARY='/opt/budgeted/pdp11_realcons'
assert [p.name for p in pathlib.Path('/sys/class/net').iterdir()]==['lo']
rpc=subprocess.Popen(['rpcbind','-f','-w']);server=sim=None;report={}
try:
 time.sleep(.2);server=launch('direct');api('/delay-replies',{})
 sim=Simh(BINARY,{"PIDP11_RPC_TRACE":"1"})
 for c in ['set cpu 11/70','set cpu 256K','set realcons host=127.0.0.1','set realcons panel=11/70']:sim.command(c)
 marker=len(sim.log);start=time.monotonic();os.write(sim.master,b'set realcons connected\n')
 while 'sim> ' not in sim.log[marker:] and time.monotonic()-start<3:sim.read(.01)
 elapsed=(time.monotonic()-start)*1000
 assert 'sim> ' in sim.log[marker:],sim.log[marker:]
 assert 1800<elapsed<2400,elapsed
 status=sim.command('show realcons');assert 'disconnected' in status,status
 report={'status':'PASS','attach_ms':elapsed,'per_response_delay_ms':75,'sequence_budget_ms':2000,'result':'partial descriptor enumeration rejected; consumer remains disconnected; no execution requested','scope':'optional loopback UDP copy; scheduler tolerance is a test bound, not a production deadline'}
finally:
 if sim:sim.stop();pathlib.Path('/results/m43-sequence.log').write_text(sim.log)
 stop(server);stop(rpc);pathlib.Path('/results/m43-sequence.json').write_text(json.dumps(report,indent=2)+'\n')
