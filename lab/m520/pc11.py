"""Original diskless CPU/device producer with narrowly scoped local observation.
M5.20 retains only the proven PC11 transfer and EOF phases; no printer substitute. Private IPC is lab-only;
no browser or production service receives a simulator-monitor interface.
"""
import hashlib
import json
import os
import pathlib
import re
import sys
import threading
import time

sys.path.insert(0, '/lab')
from integration import Simh
from pdp11_program import Program, execute

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
root = pathlib.Path('/work')
assert not (root / 'live-punch.bin').exists()
assert not (root / 'live-reader.bin').exists(), 'Preserve any existing reader evidence'
lock = threading.Lock()
stop = threading.Event()
active = set()
sim = Simh()
errors = []
phase = 0
tape = bytes(range(256)) * 48  # Three CPU transfers of 4096 bytes.
(root / 'live-reader.bin').write_bytes(tape)
(root / 'live-reader.bin').chmod(0o400)
reader_hash = hashlib.sha256(tape).hexdigest()

from control import approve as approve_state


def approve(identifier, operation, **fields):
    # The heartbeat and phase loop serialize approvals with the shared lock.
    return approve_state(identifier, operation, 'm520-original-simh-device-run',
                         'diskless-cpu-device-programs', **fields)


def heartbeat():
    while not stop.wait(1):
        try:
            assert sim.p.poll() is None, 'owned simulator exited'
            with lock:
                for identifier in active:
                    approve(identifier, 'renew')
        except Exception as error:
            errors.append(str(error))
            stop.set()  # Expiry makes the public observer disconnected.

def punch_program(count):
    program = Program(); program.emit(0o012702, count)
    program.label('read'); program.emit(0o012737, 1, 0o177550)
    program.label('reader-ready'); program.emit(0o105737, 0o177550); program.branch(0o100000, 'reader-ready')
    program.emit(0o113701, 0o177552)
    program.label('punch-ready'); program.emit(0o105737, 0o177554); program.branch(0o100000, 'punch-ready')
    program.emit(0o110137, 0o177556, 0o005302); program.branch(0o001000, 'read')
    program.label('drain'); program.emit(0o105737, 0o177554); program.branch(0o100000, 'drain'); program.emit(0)
    return program

def respond(value):
    temporary = root / 'devices-response.tmp'
    temporary.write_text(json.dumps(value))
    temporary.replace(root / 'devices-response.json')

thread = None
records = []
try:
    for command in ['set cpu 11/70 256K', 'set ptr enabled', 'set ptp enabled', 'attach -r ptr /work/live-reader.bin',
                    'attach ptp /work/live-punch.bin']:
        sim.command(command)
    with lock:
        approve('cpu-punch', 'follow', reader_sha256=reader_hash)
        active.add('cpu-punch')
    thread = threading.Thread(target=heartbeat)
    thread.start()
    (root / 'devices-ready.json').write_text('{}')
    while True:
        if errors:
            raise RuntimeError(errors[0])
        request_path = root / 'devices-request.json'
        if not request_path.exists():
            stop.wait(.05)
            continue
        command = json.loads(request_path.read_text()); request_path.unlink()
        if command['op'] == 'phase':
            assert phase < 3
            phase += 1
            output = execute(sim, punch_program(4096), 'pc11-phase' + str(phase), root)
            position = sim.command('examine ptr pos,csr')
            match = re.search(r'POS:\s*([0-9]+)', position)
            assert match and int(match[1], 10) == phase * 4096, position
            with lock:
                approve('cpu-punch', 'progress', reader_bytes=phase * 4096)
            output += position
            record = {'phase': phase, 'reader_bytes': phase*4096,
                      'host_punch_bytes': (root/'live-punch.bin').stat().st_size}
            (root / f'devices-phase-{phase}-console.txt').write_text(output)
            records.append(record)
            if phase == 3:
                # An extra read must set original PC11's error/end condition.
                eof = Program(); eof.emit(0o012737, 1, 0o177550)
                eof.label('wait'); eof.emit(0o005737, 0o177550); eof.branch(0o100000, 'wait'); eof.emit(0)
                output = execute(sim, eof, 'reader-eof', root)
                registers = sim.command('examine ptr pos,csr')
                csr = re.search(r'CSR:\s*([0-7]+)', registers)
                assert csr and int(csr[1], 8) & 0o100000, registers
                (root / 'reader-eof-console.txt').write_text(output + registers)
                for device in ['ptp', 'ptr']:
                    sim.command('detach ' + device)
                assert (root/'live-punch.bin').read_bytes() == tape
                assert hashlib.sha256((root/'live-reader.bin').read_bytes()).hexdigest() == reader_hash
                with lock:
                    approve('cpu-punch', 'progress', reader_bytes=len(tape), reader_eof=True)
                    for identifier, filename in [('cpu-punch','live-punch.bin')]:
                        approve(identifier, 'complete', sha256=hashlib.sha256((root/filename).read_bytes()).hexdigest())
                        active.remove(identifier)
                record['completed'] = True
                record['reader_eof_csr_verified'] = True
            (root / 'devices-results.json').write_text(json.dumps(records, indent=2))
        elif command['op'] == 'finish':
            assert phase == 3, 'finish only after verified completion'
            sim.command('quit')
            respond({'id':command['id'],'finished':True})
            break
        else:
            raise ValueError('unsupported private device harness action')
        respond({'id':command['id'],'result':records[-1]})
finally:
    stop.set()
    if thread is not None:
        thread.join(timeout=4)
    try:
        (root / 'devices-private.log').write_text(sim.log)
    finally:
        sim.stop()
