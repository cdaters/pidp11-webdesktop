"""Create authored pre-V5.5 RT-11 FSM tape; never touch distribution media.
Mac shell: media.py NEW_DIRECTORY. Labels follow DEC AA-PD6PA-TC section 1.2.1,
including the documented 512-byte pre-V5.5 labels, within SIMH TAP framing.
This only prepares input; it is not evidence of a guest read.
"""
import hashlib
import json
from pathlib import Path
import struct
import sys


def record(data):
    size = struct.pack('<I', len(data))
    return size + data + (b'\0' if len(data) % 2 else b'') + size


def label(kind, name='', sequence=0, blocks=0):
    data = bytearray(b' ' * 512)
    def field(first, last, value):
        assert len(value) <= last - first + 1
        data[first - 1:last] = value.encode('ascii').ljust(last - first + 1, b' ')
    field(1, 4, kind)
    if kind == 'VOL1':
        field(5, 10, 'M524A')
        field(38, 50, 'D%BLAB')
        field(51, 51, '1')
        field(80, 80, '3')
    else:
        field(5, 21, name)
        field(22, 27, 'M524A')
        field(28, 31, '0001')
        field(32, 35, f'{sequence:04}')
        field(36, 39, '0001')
        field(40, 41, '00')
        field(42, 47, ' 00000')
        field(48, 53, ' 00000')
        field(55, 60, f'{blocks:06}')
        field(61, 73, 'DECRT11A')
    return bytes(data)


def prepare(root):
    root.mkdir(mode=0o700)
    mark = b'\0' * 4
    tape = record(label('VOL1'))
    facts = []
    for sequence, (name, blocks) in enumerate([('RECA.TXT', 1), ('RECB.TXT', 2)], 1):
        lines = [f'M5.24 AUTHORED {name} BLOCK {n + 1:02} / RT-11 MT PIP READ\r\n' for n in range(blocks)]
        payload = b''.join(line.encode('ascii').ljust(512, b'\0') for line in lines)
        (root / name).write_bytes(payload)
        tape += record(label('HDR1', name, sequence)) + mark
        for offset in range(0, len(payload), 512):
            tape += record(payload[offset:offset + 512])
        tape += mark + record(label('EOF1', name, sequence, blocks)) + mark
        facts.append({'file': name, 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(), 'records': blocks})
    tape += mark * 2
    path = root / 'input.tap'
    path.write_bytes(tape)
    path.chmod(0o400)
    (root / 'expected.json').write_text(json.dumps({'format': 'SIMH TAP / RT-11 pre-V5.5 FSM', 'label_bytes': 512, 'files': facts, 'tape_bytes': len(tape), 'sha256': hashlib.sha256(tape).hexdigest()}, indent=2) + '\n')


if __name__ == '__main__':
    prepare(Path(sys.argv[1]))
