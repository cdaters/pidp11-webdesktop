"""Independent original V7 console in an owned, network-none communications lab.
Private request files are operator orchestration, never a browser interface.
"""
import hashlib
import json
import os
from pathlib import Path
import signal
import sys

sys.path.insert(0, '/lab')
from integration import Simh

root = Path('/work')
assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
assert not (root / 'ready.json').exists()
binary = Path('/opt/lab/pdp11_realcons')
assert hashlib.sha256(binary.read_bytes()).hexdigest() == 'f38167163e37dbb9578f33cc58f9740e3a6408829c4e357637b76835864c8237'
sim = Simh(str(binary))
finished = False

def console(data, wait=.6):
    assert len(data) <= 1024
    os.write(sim.master, data.encode('ascii'))
    return sim.read(min(float(wait), 8))

try:
    inventory = {command: sim.command(command) for command in
                 ['show version', 'show devices', 'show dci', 'show dli', 'show dz',
                  'show vh', 'show xq', 'show xu', 'show ethernet', 'show realcons']}
    (root / 'simulator-inventory.json').write_text(json.dumps(inventory, indent=2))
    for command in ['set cpu 11/70 1M', 'set cpu idle', 'set rp0 rp06',
                    'attach rp0 /work/disk0.work', 'set dci enabled', 'set dci lines=4',
                    'set dco0 7b', 'set dco1 7b', 'set dco2 7b', 'set dco3 7b',
                    'attach dci line=0,127.0.0.1:40100;notelnet',
                    'attach dci line=1,127.0.0.1:40101;notelnet',
                    'attach dci line=3,127.0.0.1:40103;notelnet', 'boot rp0']:
        output = sim.command(command)
        assert not any(value in output for value in ['Invalid', 'Non-existent', 'Error']), output
    console('boot\r', 1)
    output = console('hp(0,0)unix\r', 2)
    assert '# ' in output, output
    (root / 'ready.json').write_text(json.dumps({'simh_pid': sim.p.pid, 'guest': 'V7 single-user; independent console'}))
    while sim.p.poll() is None:
        sim.read(.05)
        (root / 'console-private.txt').write_text(sim.log)
        request_path = root / 'request.json'
        if not request_path.exists():
            continue
        request = json.loads(request_path.read_text())
        request_path.unlink()
        if request['op'] == 'console':
            output = console(request['data'], request.get('wait', .6))
        elif request['op'] == 'finish' and request.get('guest_idle_verified') is True:
            output = console('sync\r') + console('sync\r') + console('sync\r', 1)
            sim.p.send_signal(signal.SIGINT)
            output += sim.read(.5)
            assert 'Simulation stopped' in output
            output += sim.command('quit')
            sim.p.wait(timeout=3)
            assert sim.p.returncode == 0
            finished = True
        else:
            raise ValueError('Unsupported independent operator request')
        temporary = root / 'response.tmp'
        temporary.write_text(json.dumps({'id': request['id'], 'output': output}))
        temporary.replace(root / 'response.json')
        if finished:
            break
finally:
    (root / 'console-private.txt').write_text(sim.log)
    # Never automatically replay a guest operation after failed/uncertain input.
    sim.stop()
