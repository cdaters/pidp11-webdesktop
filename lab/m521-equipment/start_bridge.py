"""Provision an optional observer for an independently booted, verified RSX lab.
No simulator lifecycle or media operations. Fixed four job slots bound history.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
assert sys.argv[1:] == ['--guest-and-line-verified']
os.umask(0o077)
root = Path('/work')
assert (root / 'ready.json').is_file()
folder = Path('/tmp/m521-config')
control = Path('/tmp/m521-control')
assert not folder.exists() and not control.exists()
control.mkdir(mode=0o700)
binary = '/work/runtime/webdesktop-service'
subprocess.run([binary, 'provision', '-directory', str(folder), '-listen', '127.0.0.1:8449', '-origin', 'https://127.0.0.1:8449'], check=True)
path = folder / 'config.json'
config = json.loads(path.read_text())
config['control'] = str(control / 'control.sock')
config['endpoints'] = [{'id': 'rsx-dz0', 'label': 'Verified disposable RSX line', 'address': '127.0.0.1:40100', 'kind': 'raw-guest-line'}]
config['device_followers'] = []
config['device_exports'] = []
for number in (1, 2):
    media = json.loads((root / f'reader{number}.json').read_text())
    for identifier, kind, filename in [(f'lp{number}', 'lp11', f'lp{number}.out'), (f'punch{number}', 'pc11-punch', f'punch{number}.bin')]:
        item = {'id': identifier, 'kind': kind, 'path': f'/work/{filename}'}
        config['device_exports'].append(dict(item))
        item['session'] = {'device': 'LP0' if kind == 'lp11' else 'PC11', 'label': 'RSX-11M-PLUS V4.6 — operator attested'}
        if kind == 'pc11-punch':
            item['reader_path'] = f'/work/reader{number}.bin'
            item['session']['reader'] = {'name': f'RSX disposable tape {number}', 'format': media['format'], 'provenance': media['provenance'], 'sha256': media['sha256']}
        config['device_followers'].append(item)
path.write_text(json.dumps(config))
(root / 'writer.token').write_bytes((folder / 'writer.token').read_bytes())
with (root / 'bridge.log').open('x') as log:
    process = subprocess.Popen([binary, 'serve', '-config', str(path)], stdout=log, stderr=subprocess.STDOUT)
(root / 'bridge.pid').write_text(str(process.pid))
for _ in range(50):
    assert process.poll() is None, 'Bridge exited; preserve log'
    status = subprocess.run([binary, 'status', '-socket', config['control']], capture_output=True)
    if status.returncode == 0:
        break
    time.sleep(.1)
assert status.returncode == 0
value = json.loads(status.stdout)
line = value['lines'][0]
assert line['state'] == 'detached'
subprocess.run([binary, 'attach', '-socket', config['control'], '-instance', value['instance'], '-id', 'rsx-dz0', '-revision', str(line['revision']), '-guest-and-line-verified'], check=True)
