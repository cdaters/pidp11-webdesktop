"""Isolated operator setup of a device observer, never a simulator launcher.
Must follow independent guest/device inspection. No terminal line is auto-attached.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
assert sys.argv[1:] in [['rsx', '--guest-and-devices-verified'], ['rt11', '--guest-and-devices-verified']]
guest = sys.argv[1]
os.umask(0o077)
root = Path('/work')
folder = Path('/tmp/m522-config')
control = Path('/tmp/m522-control')
assert not folder.exists() and not control.exists()
control.mkdir(mode=0o700)
binary = '/work/runtime/webdesktop-service'
subprocess.run([binary, 'provision', '-directory', str(folder), '-listen', '127.0.0.1:8449', '-origin', 'https://127.0.0.1:8449'], check=True)
path = folder / 'config.json'
config = json.loads(path.read_text())
config['control'] = str(control / 'control.sock')
config['endpoints'] = [{'id': 'console-observer', 'label': 'Independent guest line (not attached)', 'address': '127.0.0.1:40100', 'kind': 'raw-guest-line'}]
config['device_exports'] = []
config['device_followers'] = []
media = json.loads((root / 'reader1.json').read_text())
for identifier, kind, filename in [('lp', 'lp11', 'lp1.out'), ('punch', 'pc11-punch', 'punch1.bin')]:
    item = {'id': identifier, 'kind': kind, 'path': '/work/' + filename}
    config['device_exports'].append(dict(item))
    item['session'] = {'device': 'LP0' if kind == 'lp11' else 'PC11', 'label': guest.upper() + ' original device — operator attested'}
    if kind == 'pc11-punch':
        item['reader_path'] = '/work/reader1.bin'
        item['session']['reader'] = {'name': guest.upper() + ' disposable input', **{k: media[k] for k in ['format', 'provenance', 'sha256']}}
    config['device_followers'].append(item)
path.write_text(json.dumps(config))
(root / 'writer.token').write_bytes((folder / 'writer.token').read_bytes())
with (root / 'bridge.log').open('x') as log:
    process = subprocess.Popen([binary, 'serve', '-config', str(path)], stdout=log, stderr=subprocess.STDOUT)
(root / 'bridge.pid').write_text(str(process.pid))
for _ in range(50):
    assert process.poll() is None, 'Bridge exited; inspect without restart'
    status = subprocess.run([binary, 'status', '-socket', config['control']], capture_output=True)
    if status.returncode == 0:
        break
    time.sleep(.1)
assert status.returncode == 0
(root / 'records-config.json').write_text(json.dumps({'socket': config['control'], 'archive_directory': '/work/archive'}))
