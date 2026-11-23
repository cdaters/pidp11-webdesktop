"""Independent, diskless original-SIMH inventory. No REALCONS or media attached."""
import hashlib,json,os,sys
from pathlib import Path
sys.path.insert(0,'/lab')
from integration import Simh
assert os.environ.get('PIDP11_ISOLATED_LAB')=='1'
assert set(os.listdir('/sys/class/net'))=={'lo'}
root=Path('/work')
assert not (root/'inventory.json').exists()
sim=Simh()
try:
 commands=['show version','show configuration']+[f'show {name}' for name in ['RK','RL','HK','RP','RQ','RQB','RQC','RQD','RX','RY','RC','RF','TM','TS','TU','TQ','TA','TC']]
 result={command:sim.command(command) for command in commands}
 result['simulator_sha256']=hashlib.sha256(Path('/opt/lab/pdp11_realcons').read_bytes()).hexdigest()
 (root/'inventory.json').write_text(json.dumps(result,indent=2))
 sim.command('quit');sim.p.wait(timeout=3)
 assert sim.p.returncode==0
finally:
 (root/'console.txt').write_text(sim.log)
 sim.stop()
