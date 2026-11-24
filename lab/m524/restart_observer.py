"""Explicit operator-requested observer restart; never reattaches a guest line.
Saved record recovery is a separate deliberate operation, not startup behavior.
"""
import http.client
import json
import os
from pathlib import Path
import socket
import subprocess
import time

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
root = Path('/work')
control = '/tmp/m524-control/control.sock'
assert not Path(control).exists(), 'Old observer must be independently stopped first'
with (root / 'bridge-restarted.log').open('x') as log:
    process = subprocess.Popen(['/work/runtime/webdesktop-service', 'serve', '-config', '/tmp/m524-config/config.json'], stdout=log, stderr=subprocess.STDOUT)
(root / 'bridge.pid').write_text(str(process.pid))
for _ in range(50):
    assert process.poll() is None
    if Path(control).exists():
        break
    time.sleep(.1)

class Local(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX)
        self.sock.settimeout(2)
        self.sock.connect(control)

def get(path):
    connection = Local('local', timeout=2)
    connection.request('GET', path)
    response = connection.getresponse()
    assert response.status == 200
    data = json.loads(response.read())
    connection.close()
    return data

history = get('/streams/history')
views = get('/streams/views')
assert history == []
assert all(row['state'] == 'detached' and row['generation'] == '' for row in views)
status = json.loads(subprocess.check_output(['/work/runtime/webdesktop-service', 'status', '-socket', control]))
assert all(line['state'] == 'detached' for line in status['lines'])
(root / 'observer-restart.json').write_text(json.dumps({'history_empty': True, 'device_views': views, 'terminal_lines_detached': True, 'automatic_recovery': False}, indent=2))
print('Restarted detached; no history or authority restored')
