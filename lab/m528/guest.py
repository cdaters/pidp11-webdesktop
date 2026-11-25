"""Independent 2.11BSD console; fixed isolated XU experiment, never a browser API."""
import hashlib
import json
import os
from pathlib import Path
import signal
import sys
import time

sys.path.insert(0, '/lab')
sys.path.insert(0, '/lab/m528')
from integration import Simh
from isolation import inspect

def monitor(simulator, line):
    """Wait for this monitor reply; the shared helper's 150 ms is not a barrier."""
    output = simulator.command(line)
    deadline = time.monotonic() + 8
    while not output.rstrip().endswith('sim>') and time.monotonic() < deadline:
        if line == 'quit' and 'Goodbye' in output:
            return output
        output += simulator.read(.1)
    assert output.rstrip().endswith('sim>'), 'Incomplete monitor reply: '+output
    return output


name = os.environ.get('M528_WORK', 'bsd')
assert name in ('bsd', 'bsd-wrong', 'bsd-repeat', 'bsd-repeat-fixed', 'bsd-repeat-ordered', 'bsd-qualified')
root = Path('/work') / name
profile = os.environ.get('M528_CONTROLLER', 'DEUNA')
assert profile in ('DEUNA', 'DELQA')
assert not (root / 'ready.json').exists()
(root / 'isolation-before.json').write_text(json.dumps(inspect(), indent=2))
assert hashlib.sha256(Path('/opt/lab/pdp11_realcons').read_bytes()).hexdigest() == 'f38167163e37dbb9578f33cc58f9740e3a6408829c4e357637b76835864c8237'
assert hashlib.sha256(Path('/work/pdp11-ethernet').read_bytes()).hexdigest() == '515d0ef440bb9f66adacf77e1aa453486db61fdc4508609ac5ff86d279010d9c'
original = Simh()
try:
    inventory = {c: monitor(original, c) for c in ['show version', 'show ethernet', 'show xu', 'show realcons']}
    monitor(original, 'quit')
    original.p.wait(timeout=3)
    assert original.p.returncode == 0
    (root / 'original-inventory.json').write_text(json.dumps(inventory, indent=2))
finally:
    original.stop()
sim = Simh('/work/pdp11-ethernet')
try:
    inventory = {c: monitor(sim, c) for c in ['show version', 'show ethernet', 'show xu', 'show realcons']}
    (root / 'experimental-inventory.json').write_text(json.dumps(inventory, indent=2))
    # Enable XU while autoconfiguration is still active, before setting DZ's
    # manual vector. This upstream XU exposes no SET VECTOR parameter.
    controller = (['set xu enabled', 'set xu type=DEUNA', 'set xu address=17774510',
                   'set xu mac=02:00:00:52:80:02', 'attach xu tap:tap528', 'show xu']
                  if profile == 'DEUNA' else
                  ['set xu disabled', 'set xq enabled', 'set xq type=DELQA',
                   'set xq mac=02:00:00:52:80:02', 'attach xq tap:tap528', 'show xq'])
    for command in ['set cpu 11/70 4096K fpp', 'set cpu idle', 'set tto 7b',
                    'set rq enabled', 'set rq0 rauser=1000', 'attach rq0 '+str(root/'disk.work'),
                    'set dz enabled', 'set dz lines=8'] + controller + ['set dz vector=310', 'show xu', 'boot rq0']:
        output = sim.command(command) if command == 'boot rq0' else monitor(sim, command)
        print(output, flush=True)
        if command == 'show xu' and profile == 'DEUNA':
            assert 'vector=120' in output, 'Required XU interrupt vector missing: '+output
        assert not any(x in output for x in ['Invalid', 'Non-existent', 'Open error', 'No such']), output
    print(sim.read(3), flush=True)
    (root / 'ready.json').write_text(json.dumps({'pid': sim.p.pid}))
    while sim.p.poll() is None:
        sim.read(.05)
        (root / 'console-private.txt').write_text(sim.log)
        request = root / 'request.json'
        if not request.exists():
            continue
        data = json.loads(request.read_text())
        request.unlink()
        finished = False
        if data['op'] == 'console':
            payload = data['data'].encode('ascii')
            assert len(payload) <= 2048
            os.write(sim.master, payload)
            output = sim.read(min(float(data.get('wait', 1)), 8))
        elif data['op'] == 'finish' and data.get('guest_idle_verified') is True:
            output = ''
            safe = sim.log.rstrip().endswith('#')
            for _ in range(3):
                if not safe:
                    break
                os.write(sim.master, b'sync\r')
                response = sim.read(.6)
                output += response
                safe = response.rstrip().endswith('#')
            if safe:
                sim.p.send_signal(signal.SIGINT)
                output += sim.read(.5)
                assert 'Simulation stopped' in output
                output += monitor(sim, 'show xu stats')
                output += monitor(sim, 'quit')
                sim.p.wait(timeout=3)
                assert sim.p.returncode == 0
                finished = True
            else:
                output += 'REFUSED: fresh single-user shell prompt required; guest left running'
        else:
            output = 'REFUSED: unsupported independent operator request'
        temporary = root / 'response.tmp'
        temporary.write_text(json.dumps({'id': data['id'], 'output': output}))
        temporary.replace(root / 'response.json')
        if finished:
            break
finally:
    (root / 'console-private.txt').write_text(sim.log)
    sim.stop()
