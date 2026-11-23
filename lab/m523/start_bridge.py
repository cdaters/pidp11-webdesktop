"""Provision an optional snapshot-only lab observer. No terminal is attached."""
import json,os,subprocess,time
from pathlib import Path
assert os.environ.get('PIDP11_ISOLATED_LAB')=='1'
assert set(os.listdir('/sys/class/net'))=={'lo'}
os.umask(0o077)
root=Path('/work');configdir=Path('/tmp/m523-config');control=Path('/tmp/m523-control');assert not configdir.exists() and not control.exists();control.mkdir(mode=0o700)
binary='/work/runtime/webdesktop-service'
subprocess.run([binary,'provision','-directory',str(configdir),'-listen','127.0.0.1:8449','-origin','https://127.0.0.1:8449'],check=True)
path=configdir/'config.json';config=json.loads(path.read_text());config['control']=str(control/'control.sock')
config['endpoints']=[{'id':'unused','label':'Not attached or observed','address':'127.0.0.1:40100','kind':'raw-guest-line'}]
config['storage_snapshots']=[{'id':'disk','device':'RL0','controller':'RL11','unit':0},{'id':'tape','device':'TM0','controller':'TM11','unit':0}]
path.write_text(json.dumps(config));(root/'writer.token').write_bytes((configdir/'writer.token').read_bytes())
with (root/'bridge.log').open('x') as log:process=subprocess.Popen([binary,'serve','-config',str(path)],stdout=log,stderr=subprocess.STDOUT)
(root/'bridge.pid').write_text(str(process.pid))
for _ in range(50):
 assert process.poll() is None
 status=subprocess.run([binary,'status','-socket',config['control']],capture_output=True)
 if status.returncode==0:break
 time.sleep(.1)
assert status.returncode==0
