"""Private IPC for an independent 2.11BSD copy; no GPIO or external network.
The conventional console remains harness-owned, never exposed to a browser.
"""
import json
import os
import pathlib
import signal
import sys

sys.path.insert(0, '/lab')
from integration import Simh

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
root = pathlib.Path('/work')
sim = Simh()
try:
    commands = [
        'set cpu 11/70 4096K fpp', 'set tto 7b', 'set rq enabled',
        'set rq0 rauser=1000', 'attach rq0 /work/disk.work',
        'set dz enabled', 'set dz lines=8', 'set dz 7b',
        'attach dz 127.0.0.1:40100;notelnet', 'set dz vector=310', 'boot rq0',
    ]
    for command in commands:
        print(sim.command(command), flush=True)
    print(sim.read(8), flush=True)
    (root / 'ready.json').write_text('{}')
    while True:
        sim.read(.05)
        request = root / 'request.json'
        if not request.exists():
            continue
        data = json.loads(request.read_text())
        request.unlink()
        if data['op'] == 'console':
            os.write(sim.master, data.get('data', '').encode('ascii'))
            output = sim.read(data.get('wait', 1))
        elif data['op'] == 'finish':
            sim.p.send_signal(signal.SIGINT)
            output = sim.read(.5) + sim.command('quit')
        else:
            raise ValueError('unknown inventory action')
        (root / 'response.json').write_text(json.dumps({'id': data['id'], 'output': output}))
        if data['op'] == 'finish':
            break
finally:
    try:
        (root / 'console-private.txt').write_text(sim.log)
    finally:
        sim.stop()
