"""Start only the optional bridge for an already inspected disposable guest.

Original SIMH and its console remain independently owned by another harness.
This helper cannot start a guest, and refuses absent explicit operator approval.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('guest', choices=['bsd', 'rsx', 'rt11'])
parser.add_argument('--guest-and-line-verified', action='store_true', required=True)
args = parser.parse_args()
assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
assert Path('/work/ready.json').is_file()
os.umask(0o077)
port, identifier = {'bsd': (8446, 'guest-dc0'), 'rsx': (8449, 'rsx-dz0'), 'rt11': (8448, 'rt11-dz0')}[args.guest]
binary = '/fixtures/webdesktop-service'
folder = Path('/tmp/m516-config')
control = Path('/tmp/m516-control')
control.mkdir(mode=0o700)
subprocess.run([binary,'provision','-directory',str(folder),'-listen',f'127.0.0.1:{port}',
                '-origin',f'https://127.0.0.1:{port}'],check=True)
config_path = folder / 'config.json'
config = json.loads(config_path.read_text())
config['control'] = str(control / 'control.sock')
config['endpoints'] = [{'id':identifier,'label':f'Disposable {args.guest} application line',
                        'address':'127.0.0.1:40100','kind':'raw-guest-line'}]
config_path.write_text(json.dumps(config))
Path('/work/writer.token').write_bytes((folder / 'writer.token').read_bytes())
with Path('/work/bridge.log').open('x') as log:
    process = subprocess.Popen([binary,'serve','-config',str(config_path)],stdout=log,stderr=subprocess.STDOUT)
Path('/work/bridge.pid').write_text(str(process.pid))
try:
    for _ in range(50):
        assert process.poll() is None, 'Bridge exited; inspect retained log'
        status = subprocess.run([binary,'status','-socket',config['control']],capture_output=True)
        if status.returncode == 0:
            break
        time.sleep(.1)
    assert status.returncode == 0, 'Status timeout; do not retry attachment'
    value = json.loads(status.stdout)
    line = value['lines'][0]
    assert line['state'] == 'detached'
    subprocess.run([binary,'attach','-socket',config['control'],'-instance',value['instance'],
                    '-id',identifier,'-revision',str(line['revision']),'-guest-and-line-verified'],
                   check=True,stdout=subprocess.DEVNULL)
except BaseException:
    process.terminate()
    process.wait(timeout=10)
    raise
print('Previously inspected guest line approved; original console remains independent')
