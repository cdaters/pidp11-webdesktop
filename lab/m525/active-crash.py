"""Kill the actual observer during an ongoing original-C TM11 read stream.
Authored CPU/device evidence, not a historical guest or physical hardware test.
Run once in a fresh network-none unprivileged Linux /work; see the M5.25 runbook.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import subprocess
import sys
import time
import urllib.request

sys.path.insert(0, '/lab')
from integration import Simh
from pdp11_program import Program

root = Path('/work')
assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'} and os.getuid() != 0
assert not (root / 'active.tap').exists()
payload = b'M5.25 authored ongoing read stream'.ljust(512, b'\0')
record = struct.pack('<I', len(payload)) + payload + struct.pack('<I', len(payload))
media = record * 200 + bytes(8)
(root / 'active.tap').write_bytes(media)
(root / 'active.tap').chmod(0o400)
sim = Simh('/build/m525/instrumented/bin/pdp11_realcons', {'PIDP11_M525_ENABLE': '1'})
reader = None

def status():
    with urllib.request.urlopen('http://127.0.0.1:8450/activity', timeout=1) as response:
        return json.load(response)

try:
    for command in ['set cpu 11/70 256K', 'set tm enabled', 'set tm0 locked',
                    'attach -r tm0 /work/active.tap', 'deposit 224 1600',
                    'deposit 226 0', 'deposit 1600 5200', 'deposit 1602 2', 'deposit psw 0']:
        output = sim.command(command)
        assert 'sim> ' in output and 'Invalid' not in output, output
    program = Program()
    program.emit(0o012706, 0o4000, 0o005000, 0o012701, 1)  # SP; clear IRQ count; target=1
    program.label('next')
    program.emit(0o012737, (-512) & 65535, 0o172524)
    program.emit(0o012737, 0o2000, 0o172526)
    program.emit(0o012737, 0o103, 0o172522)  # READ with interrupt enable
    program.label('wait')
    program.emit(0o020100)  # CMP R1,R0; ISR increments R0
    program.branch(0o001000, 'wait')
    program.emit(0o022700, 200)  # CMP #200,R0
    program.branch(0o001400, 'finished')
    # Intentional CPU instruction delay keeps the authored stream long enough for
    # independent host observation; it does not change TM's completion semantics.
    program.emit(0o012703, 50)
    program.label('outer')
    program.emit(0o012702, 0o177777)
    program.emit(0o077201)  # SOB R2,.-0: decrement/branch to this instruction
    program.emit(0o005303)  # DEC R3
    program.branch(0o001000, 'outer')
    program.emit(0o005201)  # INC R1
    program.branch(0o000400, 'next')
    program.label('finished')
    program.emit(0)
    listing = []
    for index, word in enumerate(program.finish()):
        address = 0o1000 + index * 2
        sim.command(f'deposit {address:o} {word:o}')
        listing.append(f'{address:06o}: {word:06o}')
    (root / 'active.words.txt').write_text('\n'.join(listing) + '\n')
    reader = subprocess.Popen(['/lab/event-reader-final', '-simulator-pid', str(sim.p.pid)],
                              stdin=subprocess.PIPE, stdout=(root / 'reader.json').open('x'),
                              stderr=(root / 'reader.log').open('x'), text=True)
    deadline = time.monotonic() + 4
    while True:
        assert reader.poll() is None and time.monotonic() < deadline
        try:
            before = status()
            if before['generation'] == 1:
                break
        except OSError:
            pass
        time.sleep(.02)
    reader.stdin.write(json.dumps({'instance': before['instance'], 'generation': 1,
                                  'guest': 'authored-cpu-read-stream', 'verified': True}) + '\n')
    reader.stdin.flush()
    time.sleep(.05)
    assert status()['mode'] == 'approved-lab'
    # Write once, then observe. Do not issue monitor commands while this CPU runs.
    os.write(sim.master, b'go 1000\r')
    output = ''
    deadline = time.monotonic() + 12
    while True:
        output += sim.read(.02)
        observed = status()
        assert 'HALT instruction' not in output and 'sim> ' not in output
        assert observed['mode'] == 'approved-lab' and observed['lost'] == 0, observed
        if observed['events'] >= 2:
            break
        assert time.monotonic() < deadline
    reader.kill()
    reader.wait(timeout=2)
    assert reader.returncode == -9
    while 'HALT instruction' not in output and time.monotonic() < deadline:
        output += sim.read(.05)
    assert 'HALT instruction' in output, output
    registers = sim.command('examine r0')
    assert re.search(r'R0:\s+000310', registers), registers  # 200 decimal
    sim.command('quit')
    sim.p.wait(timeout=3)
    assert sim.p.returncode == 0 and (root / 'active.tap').read_bytes() == media
    result = {'kind': 'authored original-C CPU/device test, not historical guest',
              'reader_killed_during_ongoing_stream': True,
              'approved_summary_before_kill': observed, 'reader_exit': reader.returncode,
              'final_serviced_interrupts': 200, 'simulator_exit': 0,
              'authored_input_unchanged': True,
              'input_sha256': hashlib.sha256(media).hexdigest()}
    (root / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result), flush=True)
finally:
    if reader is not None and reader.poll() is None:
        reader.terminate()
        reader.wait(timeout=3)
    (root / 'console-private.txt').write_text(sim.log)
    sim.stop()
