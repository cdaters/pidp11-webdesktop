"""Read-only post-run byte verification. Never starts a guest or approves a job.
Mac shell: python3 lab/m521-equipment/verify_artifacts.py PRIVATE_EVIDENCE_ROOT
"""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('root', type=Path)
args = parser.parse_args()
results = []

def check(path, expected, job):
    data = path.read_bytes()
    if data != expected:
        raise SystemExit(f'{job}: output differs; preserve evidence')
    results.append({'job': job, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'exact_transform': True})

for job in (1, 2):
    lines = [f'M5.21 RSX PRINT JOB {job} RECORD {n} - ORIGINAL LPDRV AND PIP' for n in range(1, 4)]
    check(args.root / 'rsx' / f'lp{job}.out', b'\f' + b''.join(b'\n' + s.encode() + b'\r' for s in lines), f'rsx-lp{job}')
    records = b''.join(f'M5.21 RSX TAPE JOB {job} RECORD {n:04d} - ORIGINAL PRDRV AND PPDRV\r\n'.encode() for n in range(1, 801))
    check(args.root / 'rsx' / f'reader{job}.bin', b'\0' * 16 + records + b'\x1a', f'rsx-reader{job}')
    name = 'punch1-completed.bin' if job == 1 else 'punch2.bin'
    check(args.root / 'rsx' / name, b'\0' * 170 + records + b'\x1a' + b'\0' * 170, f'rsx-punch{job}')
    if job == 1:
        check(args.root / 'rsx' / 'punch1.bin', b'\0' * 170 + records + b'\x1a' + b'\0' * 170, 'rsx-interrupted-not-published')

rt = args.root / 'rt11'
lines = [f'M5.21 RT11 PRINTER RECORD {n} - ORIGINAL LP HANDLER' for n in range(1, 4)]
# The observed RT-11 utility emits LF line ends and an extra LF, unlike RSX PIP.
check(rt / 'lp1.out', b'\f' + b''.join(s.encode() + b'\n' for s in lines) + b'\n', 'rt11-printer')
records = b''.join(f'M5.21 RT11 PAPER TAPE RECORD {n}\r\n'.encode() for n in range(1, 4))
check(rt / 'reader.bin', b'\0' * 16 + records + b'\x1a', 'rt11-reader')
check(rt / 'punch.bin', records.ljust(512, b'\0'), 'rt11-punch')
print(json.dumps(results, indent=2))
