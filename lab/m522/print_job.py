"""Mac private lab test: one genuine RSX PIP job and verified independent close.
Requires prior operator review of the guest/devices. No browser control interface.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('root', type=Path)
parser.add_argument('job', type=int, choices=[1, 2])
parser.add_argument('--guest-and-device-verified', action='store_true', required=True)
args = parser.parse_args()
root = args.root
assert root.as_posix().endswith('/m522/rsx')
assert not (root / f'print-{args.job}-result.json').exists()
assert (root / 'lp1.out').stat().st_size == 0

def request(channel, payload):
    result = json.loads(subprocess.check_output(['python3', 'lab/m521-equipment/request.py', str(root), channel, json.dumps(payload)], text=True))
    with (root / f'print-{args.job}-requests.jsonl').open('a') as stream:
        stream.write(json.dumps(result) + '\n')
    return result

def operator(line):
    return request('supervisor', {'line': line})

def console(data):
    return request('guest', {'op': 'console', 'data': data, 'wait': .3})['output']

operator(f'begin lp rsx-print-{args.job}')
console('PIP LP:=TI:\r')
lines = [f'M5.22 RSX PRINT JOB {args.job} RECORD {number} - ORIGINAL LPDRV AND PIP' for number in range(1, 4)]
for line in lines:
    console(line + '\r')
returned = console('\x1a')
assert '>' in returned and 'Error' not in returned, returned
activity = console('ACT\r')
assert not re.search(r'\b\.\.\.PIP\b', activity), activity
operator('returned lp Original PIP returned and independent ACT inspection passed')
closed = request('guest', {'op': 'close-printer', 'guest_safe': True})['output']
assert 'CSR:\t000200' in closed and 'detach lpt' in closed, closed
output = (root / 'lp1.out').read_bytes()
expected = b'\f' + b''.join(b'\n' + line.encode() + b'\r' for line in lines)
assert output == expected
positions = re.findall(r'POS:\s*(\d+)', closed)
assert int(positions[0]) == len(output)
operator(f'drained lp {len(output)} Paused original LPT CSR ready and POS independently recorded')
operator('closed lp Original LPT safely detached and flushed host length verified')
digest = hashlib.sha256(output).hexdigest()
result = operator('complete lp ' + digest)
(root / f'print-{args.job}-result.json').write_text(json.dumps({'bytes': len(output), 'sha256': digest, 'generation': result['generation'], 'records': lines}, indent=2))
print(json.dumps({'job': args.job, 'bytes': len(output), 'sha256': digest}))
