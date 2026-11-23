"""Approve only an independently closed M5.21 fixture after exact byte checks.
Mac shell; requires prior guest-returned attestation. No SIMH/media operations.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('root', type=Path)
parser.add_argument('kind', choices=['lp', 'punch'])
parser.add_argument('job', type=int, choices=[1, 2])
parser.add_argument('--producer-close-verified', action='store_true', required=True)
args = parser.parse_args()
identifier = f'{args.kind}{args.job}'
root = args.root
result_path = root / f'{identifier}-verified.json'
assert not result_path.exists(), 'Preserve previous approval; never replay'
registers = (root / f'{identifier}-registers.txt').read_text()
positions = [int(value) for value in re.findall(r'POS:\s*([0-9]+)', registers)]
csrs = [int(value, 8) for value in re.findall(r'CSR:\s*([0-7]+)', registers)]
assert csrs[0] & 0o200 and not csrs[0] & 0o100000
suffix = 'out' if args.kind == 'lp' else 'bin'
data = (root / f'{identifier}.{suffix}').read_bytes()
assert positions[0] == len(data)
if args.kind == 'lp':
    lines = json.loads((root / f'{identifier}-input.json').read_text())
    expected = b'\f' + b''.join(b'\n' + line.encode('ascii') + b'\r' for line in lines)
else:
    source = (root / f'reader{args.job}.bin').read_bytes()
    fixture = json.loads((root / f'reader{args.job}.json').read_text())
    assert hashlib.sha256(source).hexdigest() == fixture['sha256']
    assert positions[1] == len(source) and csrs[1] & 0o100000
    expected = b'\0' * 170 + source[16:] + b'\0' * 170
assert data == expected

def approve(operation, **fields):
    payload = {'id': identifier, 'operation': operation, **fields}
    raw = subprocess.check_output(['python3', 'lab/m521-equipment/request.py', str(root), 'supervisor', json.dumps(payload)], text=True)
    return json.loads(raw)

if args.kind == 'punch':
    approve('progress', reader_bytes=len(source), reader_eof=True)
approve('drained', produced_bytes=len(data), evidence='Independent paused original-device CSR ready/no-error and exact POS recorded')
approve('closed', evidence='Original device detached by independent operator; flushed host length verified')
digest = hashlib.sha256(data).hexdigest()
response = approve('complete', sha256=digest)
result = {'job': identifier, 'bytes': len(data), 'sha256': digest, 'generation': response['generation'], 'byte_transformation_verified': True, 'ready_csr': format(csrs[0], '06o'), 'closed_before_completion': True}
result_path.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
