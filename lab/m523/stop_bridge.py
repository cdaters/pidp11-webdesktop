"""Stop only the exact owned optional bridge, without touching the original guest."""
import json
import os
from pathlib import Path
import signal
import time

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
root = Path('/work')
pid = int((root / 'bridge.pid').read_text())
assert os.readlink(f'/proc/{pid}/exe') == '/work/runtime/webdesktop-service'
os.kill(pid, signal.SIGTERM)
for _ in range(60):
    stat = Path(f'/proc/{pid}/stat')
    if not stat.exists() or stat.read_text().rsplit(')', 1)[1].split()[0] == 'Z':
        break
    time.sleep(.1)
else:
    raise RuntimeError('Bridge has not stopped; preserve guest and inspect')
assert not Path('/tmp/m523-control/control.sock').exists()
print(json.dumps({'exact_bridge_stopped': True, 'control_socket_removed': True, 'simulator_signalled': False}))
