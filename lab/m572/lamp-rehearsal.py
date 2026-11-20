"""Original IDLED/REALCONS rehearsal in network-none Linux; no GPIO or media.
Mount the verified profile at /work/idled-original.ini and original lab binary
at /fixtures/realcons-lab. This uses the retained laboratory-only PTY shim.
"""
import hashlib
import json
import os
from pathlib import Path
import pty
import select
import subprocess
import sys
import time

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
profile = Path('/work/idled-original.ini')
assert hashlib.sha256(profile.read_bytes()).hexdigest() == 'f5ef4f0dadd0fe29cbde690c72cf21b9507d6b2b0315d6f958bc8042021aa55e'
sys.path.insert(0, '/lab')
from integration import api, wait, polls, pulse

children = []
master = None
transcript = ''

def read(duration=.2):
    global transcript
    end = time.monotonic() + duration
    text = ''
    while time.monotonic() < end:
        ready, _, _ = select.select([master], [], [], max(0, end-time.monotonic()))
        if ready:
            try:
                chunk = os.read(master, 65536).decode(errors='replace')
            except OSError:
                break
            if not chunk:
                break
            text += chunk
    transcript += text
    return text

def command(line):
    os.write(master, (line+'\n').encode())
    return read(.3)

try:
    for name, args in [('rpcbind', ['rpcbind','-f','-w']), ('panel', ['/fixtures/realcons-lab','-role','direct'])]:
        log = open('/work/'+name+'.log','w')
        children.append(subprocess.Popen(args, stdout=log, stderr=log))
        log.close()
        if name == 'rpcbind':
            wait(lambda: subprocess.run(['rpcinfo','-p','127.0.0.1'], capture_output=True).returncode == 0)
    wait(lambda: api('/state'))
    api('/set', {'HALT':0, 'SR':0, 'POWER':1})
    # Original command's column utility is present only for its menu display;
    # a missing utility cannot attach media, and is retained in the transcript.
    master, slave = pty.openpty()
    simulator = subprocess.Popen(['/opt/lab/pdp11_realcons', str(profile)], stdin=slave, stdout=slave, stderr=slave,
        pass_fds=(master,), cwd='/work', env={**os.environ, 'LD_PRELOAD':'/opt/lab/ptyshim.so','PIDP11_LAB_PTY_MASTER':str(master)})
    os.close(slave)
    children.append(simulator)
    read(1)
    wait(lambda: api('/state')['outputs']['RUN'] == 1)
    api('/set', {'HALT':1})
    wait(lambda: api('/state')['outputs']['RUN'] == 0)
    read(.5)
    assert 'Simulation stopped' in transcript, transcript
    devices = command('show devices')
    assert 'attached' not in devices.lower(), devices
    realcons = command('show realcons')
    results = []
    api('/set', {'ADDR_SELECT':4})
    for value in [0,1,0,2,0]:
        api('/set', {'SR':value})
        polls()
        pulse('LOAD_ADRS')
        before = api('/state')['outputs']['ADDRESS']
        assert before == value, (value, before)
        register = command('examine system sr')
        assert ('SR:\t%06o' % value) in register, register
        polls()
        after = api('/state')['outputs']['ADDRESS']
        assert after == before, (before, after)
        results.append({'synthetic_sr':value,'address_output':before,'system_sr_octal':'%06o'%value,'register_read_preserved_address':True})
    command('quit')
    assert simulator.wait(timeout=4) == 0
    Path('/work/results.json').write_text(json.dumps({'original_idled_hash_verified':True,'original_simh_realcons':True,'physical_gpio_used':False,'guest_media_mounted':False,'operating_system_booted':False,'halt_and_cons_phy_load_adrs':results,'graceful_quit':True},indent=2)+'\n')
finally:
    Path('/work/simh.log').write_text(transcript)
    for child in reversed(children):
        if child.poll() is None:
            child.terminate()
            child.wait(timeout=5)
    if master is not None:
        os.close(master)
