"""Mac operator test: qualify a returned, idle RSX PIP job before completion.
No replay; original paused registers and exact closed bytes remain prerequisites.
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
parser.add_argument('--guest-returned-verified', action='store_true', required=True)
args = parser.parse_args()
root = args.root
assert not (root / f'punch-{args.job}-result.json').exists()

def request(channel, payload):
    result = json.loads(subprocess.check_output(['python3', 'lab/m521-equipment/request.py', str(root), channel, json.dumps(payload)], text=True))
    with (root / f'punch-{args.job}-requests.jsonl').open('a') as stream:
        stream.write(json.dumps(result) + '\n')
    return result

def operator(line):
    return request('supervisor', {'line': line})

activity = request('guest', {'op': 'console', 'data': 'ACT\r', 'wait': .5})['output']
assert not re.search(r'\b\.\.\.PIP\b', activity), activity
operator('returned punch Original PIP returned and independent ACT inspection passed')
closed = request('guest', {'op': 'close-pc11', 'guest_safe': True})['output']
assert 'CSR:\t000200' in closed and 'CSR:\t100000' in closed, closed
source = (root / 'reader1.bin').read_bytes()
output = (root / 'punch1.bin').read_bytes()
assert output == b'\0' * 170 + source[16:] + b'\0' * 170
positions = re.findall(r'POS:\s*(\d+)', closed)
assert [int(n) for n in positions] == [len(output), len(source)]
operator(f'reader punch {len(source)} eof')
operator(f'drained punch {len(output)} Original PTP ready POS and PTR actual EOF independently inspected')
operator('closed punch Original PTP and PTR safely detached output flushed')
digest = hashlib.sha256(output).hexdigest()
result = operator('complete punch ' + digest)
(root / f'punch-{args.job}-result.json').write_text(json.dumps({'bytes': len(output), 'sha256': digest, 'generation': result['generation'], 'reader_bytes': len(source)}, indent=2))
print(json.dumps({'job': args.job, 'bytes': len(output), 'sha256': digest}))
