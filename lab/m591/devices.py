"""Original SIMH diskless PDP-11 LP11/PC11 exercise in the network-none lab.
New polling programs execute on the emulated CPU. No deposited output file is
substituted for device output. This is not an OS printer driver acceptance test.
"""
import hashlib
import json
import os
import pathlib
import sys
import time

sys.path.insert(0, '/lab')
from integration import Simh

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
root = pathlib.Path('/work')
assert not (root / 'lp11.out').exists()

from pdp11_program import Program, execute

sim = Simh()
results = {}
try:
    sim.command('set cpu 11/70 256K')
    sim.command('set lpt enabled')
    sim.command('attach lpt /work/lp11.out')
    text = b'PDP-11 LP11 CPU DEVICE TEST\r\nOriginal SIMH printer output\r\n01234567\fSECOND FORM\r\n'
    printer = Program()
    printer.emit(0o012700, 0)  # MOV #message,R0; resolve address below.
    printer.label('ready')
    printer.emit(0o105737, 0o177514)  # TSTB CSR
    printer.branch(0o100000, 'ready')  # BPL
    printer.emit(0o112001)  # MOVB (R0)+,R1
    printer.branch(0o001400, 'done')  # BEQ
    printer.emit(0o110137, 0o177516)  # MOVB R1,@#BUF
    printer.branch(0o000400, 'ready')
    printer.label('done')
    printer.emit(0)  # HALT
    printer.words[1] = 0o1000 + 2 * len(printer.words)
    payload = text + b'\0'
    payload += b'\0' * (len(payload) % 2)
    printer.emit(*[payload[i] | payload[i+1] << 8 for i in range(0, len(payload), 2)])
    output = execute(sim, printer, 'lp11', root)
    output += sim.command('examine lpt pos,csr') + sim.command('detach lpt')
    (root / 'lp11-console.txt').write_text(output)
    actual = (root / 'lp11.out').read_bytes()
    assert actual == text
    results['lp11'] = {
        'bytes': len(actual), 'sha256': hashlib.sha256(actual).hexdigest(),
        'cpu_program': True, 'os_driver': False, 'form_feed': True,
    }

    # Reader -> emulated CPU -> punch. Unlike LP11, preserve all eight bits.
    tape = bytes([0, 1, 7, 10, 13, 26, 127, 128, 255]) + b'PC11 round trip'
    (root / 'reader.bin').write_bytes(tape)
    for command in ['set ptr enabled', 'set ptp enabled',
                    'attach -r ptr /work/reader.bin', 'attach ptp /work/punch.bin']:
        sim.command(command)
    punch = Program()
    punch.emit(0o012702, len(tape))  # MOV #count,R2
    punch.label('read')
    punch.emit(0o012737, 1, 0o177550)  # Start reader.
    punch.label('reader-ready')
    punch.emit(0o105737, 0o177550)
    punch.branch(0o100000, 'reader-ready')
    punch.emit(0o113701, 0o177552)  # MOVB reader buffer,R1
    punch.label('punch-ready')
    punch.emit(0o105737, 0o177554)
    punch.branch(0o100000, 'punch-ready')
    punch.emit(0o110137, 0o177556)  # MOVB R1,punch buffer
    punch.emit(0o005302)  # DEC R2
    punch.branch(0o001000, 'read')  # BNE
    punch.label('drain')
    punch.emit(0o105737, 0o177554)
    punch.branch(0o100000, 'drain')
    punch.emit(0)
    output = execute(sim, punch, 'pc11', root)
    for command in ['examine ptr pos,csr', 'examine ptp pos,csr', 'detach ptp', 'detach ptr']:
        output += sim.command(command)
    (root / 'pc11-console.txt').write_text(output)
    actual = (root / 'punch.bin').read_bytes()
    assert actual == tape
    results['pc11'] = {
        'bytes': len(actual), 'sha256': hashlib.sha256(actual).hexdigest(),
        'reader_to_cpu_to_punch': True, 'reader_read_only': True, 'eof_tested': False,
    }
    print(json.dumps(results, indent=2))
    (root / 'device-results.json').write_text(json.dumps(results, indent=2) + '\n')
    sim.command('quit')
finally:
    try:
        (root / 'device-private.log').write_text(sim.log)
    finally:
        sim.stop()
