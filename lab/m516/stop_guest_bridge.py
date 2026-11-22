"""Stop only the recorded optional bridge; never signal the original emulator."""
import argparse
import os
from pathlib import Path
import signal
import socket
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('guest', choices=['bsd','rsx','rt11'])
args = parser.parse_args()
assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
pid = int(Path('/work/bridge.pid').read_text())
assert Path(f'/proc/{pid}/exe').resolve() == Path('/fixtures/webdesktop-service')
port = {'bsd':8446,'rsx':8449,'rt11':8448}[args.guest]
os.kill(pid, signal.SIGTERM)
for _ in range(100):
    status = Path(f'/proc/{pid}/stat')
    stopped = not status.exists() or status.read_text().split(') ')[1].startswith('Z ')
    with socket.socket() as probe:
        closed = probe.connect_ex(('127.0.0.1',port)) != 0
    if stopped and closed:
        break
    time.sleep(.1)
else:
    raise RuntimeError('Owned bridge did not stop; do not switch or stop guest')
assert not Path('/tmp/m516-control/control.sock').exists()
print('Recorded bridge stopped, HTTPS closed, control socket removed; guest untouched')
