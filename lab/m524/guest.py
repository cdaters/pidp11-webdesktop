"""Original guest and independent console, network-none disposable M5.24 lab only.
Fixed named-register captures require a separately verified idle guest. The
snapshot collector never invokes this harness or operates SIMH. No retry on error.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import sys

sys.path.insert(0, '/lab')
from integration import Simh

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
root = Path('/work')
guest = sys.argv[1]
assert guest in ('rt11', 'v7')
assert not (root / 'ready.json').exists()
profiles = {
    'rt11': ['set cpu 11/70 4M', 'set cpu idle', 'set dz disabled',
             'set rl0 rl02', 'attach rl0 /work/disk0.work',
             'set tm enabled', 'set tm0 locked', 'attach -r tm0 /work/tape/input.tap',
             'show tm', 'show tm0', 'boot rl0'],
    'v7': ['set cpu 11/70 1M', 'set cpu idle', 'set rp0 rp06',
           'attach rp0 /work/disk0.work', 'boot rp0'],
}
captures = {
    'rt11': ['show rl', 'show rl0', 'show tm', 'show tm0',
             'examine tm mts,mtc,mtbrc,mtcma,ust[0],pos[0]'],
    'v7': ['show rp', 'show rp0', 'examine rp cs1[0],ds[0],er1[0],da[0],dc[0]'],
}
sim = Simh()
paused = False
try:
    for command in profiles[guest]:
        result = sim.command(command)
        if not command.startswith('boot '):
            assert 'sim> ' in result and not any(x in result for x in ('Non-existent', 'Invalid', 'Error')), result
    sim.read(1)
    (root / 'ready.json').write_text(json.dumps({'guest': guest, 'simh_pid': sim.p.pid}))
    while sim.p.poll() is None:
        sim.read(.05)
        (root / 'console-private.txt').write_text(sim.log)
        path = root / 'request.json'
        if not path.exists():
            continue
        request = json.loads(path.read_text())
        path.unlink()
        op = request['op']
        output = ''
        if op == 'console' and not paused:
            assert len(request['data']) <= 256
            os.write(sim.master, request['data'].encode('ascii'))
            output = sim.read(min(float(request.get('wait', .5)), 10))
        elif op == 'capture' and request.get('guest_idle_verified') is True and not paused:
            name = request['name']
            assert re.fullmatch('[a-z0-9-]{1,40}', name)
            dest = root / (name + '.json')
            assert not dest.exists(), 'Preserve previous capture'
            sim.p.send_signal(signal.SIGINT)
            output = sim.read(.5)
            assert 'Simulation stopped' in output, output
            paused = True
            facts = {command: sim.command(command) for command in captures[guest]}
            assert all('sim> ' in value and 'Non-existent' not in value for value in facts.values()), facts
            images = {}
            for rel in (['disk0.work', 'tape/input.tap'] if guest == 'rt11' else ['disk0.work']):
                media = root / rel
                before = media.stat()
                with media.open('rb') as stream:
                    digest = hashlib.file_digest(stream, 'sha256').hexdigest()
                after = media.stat()
                assert (before.st_size, before.st_mtime_ns, before.st_ino) == (after.st_size, after.st_mtime_ns, after.st_ino)
                images[rel] = {'sha256': digest, 'size': after.st_size, 'mtime_ns': after.st_mtime_ns}
            dest.write_text(json.dumps({'captured_at': datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'), 'facts': facts, 'images': images}, indent=2))
            output += '\n'.join(facts.values())
        elif op == 'continue' and paused:
            output = sim.command('continue')
            paused = False
        elif op == 'finish' and request.get('guest_idle_verified') is True:
            if not paused:
                sim.p.send_signal(signal.SIGINT)
                output = sim.read(.5)
                assert 'Simulation stopped' in output
            output += sim.command('quit')
            sim.p.wait(timeout=3)
            assert sim.p.returncode == 0
        else:
            raise ValueError('Unsupported or unconfirmed operator request')
        (root / 'console-private.txt').write_text(sim.log)
        response = root / 'response.tmp'
        response.write_text(json.dumps({'id': request['id'], 'output': output}))
        response.replace(root / 'response.json')
        if op == 'finish':
            break
finally:
    (root / 'console-private.txt').write_text(sim.log)
    sim.stop()
