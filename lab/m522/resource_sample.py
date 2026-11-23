"""Read-only bounded Linux process samples during one explicitly started lab job."""
import json
import os
from pathlib import Path
import sys
import time

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
root = Path('/work')
name = sys.argv[1]
assert name in ('active-one', 'active-two', 'after-recovery')
paths = {'observer': 'bridge.pid', 'supervisor': 'supervisor.pid'}
pids = {key: int((root / value).read_text()) for key, value in paths.items()}
expected = {'observer': '/work/runtime/webdesktop-service', 'supervisor': '/work/runtime/equipment-supervisor'}
for key, pid in pids.items():
    assert os.readlink(f'/proc/{pid}/exe') == expected[key]
samples = []
for _ in range(100):
    row = {'monotonic': time.monotonic(), 'wall_seconds': time.time(), 'processes': {}, 'spool_bytes': (root / 'punch1.bin').stat().st_size}
    for key, pid in pids.items():
        path = Path('/proc') / str(pid)
        fields = (path / 'stat').read_text().rsplit(')', 1)[1].split()
        status = {}
        for line in (path / 'status').read_text().splitlines():
            if line.split(':', 1)[0] in ('VmRSS', 'VmHWM', 'Threads'):
                status[line.split(':', 1)[0]] = int(line.split()[1])
        row['processes'][key] = {'cpu_ticks': int(fields[11]) + int(fields[12]), 'fds': len(list((path / 'fd').iterdir())), **status}
    samples.append(row)
    time.sleep(.1)
(root / f'{name}-resources.json').write_text(json.dumps({'clock_ticks': os.sysconf('SC_CLK_TCK'), 'samples': samples}, indent=2))
