"""Read-only M5.22 byte verification. No running simulator or service is needed.
Mac shell: python3 lab/m522/verify_artifacts.py PRIVATE_M522_EVIDENCE_ROOT
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('root', type=Path)
root = parser.parse_args().root
results = []

def verify(path, expected, identity):
    data = path.read_bytes()
    assert data == expected, identity
    results.append({'job': identity, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'exact_transform': True})

for job, name in [(1, 'first'), (2, 'second')]:
    lines = [f'M5.22 RSX PRINT JOB {job} RECORD {n} - ORIGINAL LPDRV AND PIP' for n in range(1, 4)]
    verify(root / 'rsx' / f'lp-{name}.out', b'\f' + b''.join(b'\n' + line.encode() + b'\r' for line in lines), f'rsx-print-{job}')
records = b''.join(f'M5.22 RSX TAPE RECORD {n:04d} - ORIGINAL PRDRV AND PPDRV\r\n'.encode() for n in range(1, 801))
verify(root / 'rsx/reader1.bin', b'\0' * 16 + records + b'\x1a', 'rsx-reader')
for job, name in [(1, 'first'), (2, 'second'), (3, None)]:
    file = root / 'rsx' / (f'punch-{name}.bin' if name else 'punch1.bin')
    verify(file, b'\0' * 170 + records + b'\x1a' + b'\0' * 170, f'rsx-tape-{job}' if name else 'rsx-expired-later-closed-not-completed')
lines = [f'M5.22 RT11 PRINTER RECORD {n} - ORIGINAL LP HANDLER' for n in range(1, 4)]
verify(root / 'rt11/lp1.out', b'\f' + b''.join(line.encode() + b'\n' for line in lines) + b'\n', 'rt11-print-1')
records = b''.join(f'M5.22 RT11 PAPER TAPE RECORD {n}\r\n'.encode() for n in range(1, 4))
verify(root / 'rt11/reader1.bin', b'\0' * 16 + records + b'\x1a', 'rt11-reader')
verify(root / 'rt11/punch1.bin', records.ljust(512, b'\0'), 'rt11-tape-1')
archives = []
for guest, count in [('rsx', 5), ('rt11', 2)]:
    files = list((root / guest / 'archive').glob('*.json'))
    assert len(files) == count
    for file in files:
        envelope = json.loads(file.read_text())
        record = envelope['record']
        encoded = json.dumps(record, ensure_ascii=False, separators=(',', ':')).encode()
        assert hashlib.sha256(encoded).hexdigest() == envelope['record_sha256']
        data = base64.b64decode(record.get('data', ''), validate=True)
        assert len(data) == record['observed_bytes'] - record['start_offset'] <= 65536
        assert hashlib.sha256(data).hexdigest() == record['sha256']
        assert file.stem == record['id'] == hashlib.sha256(record['generation'].encode()).hexdigest()
        if record['state'] == 'completed':
            assert record['start_offset'] == 0 and record['sha256'] == record['full_sha256']
        else:
            assert record['state'] == 'expired' and record['completed_bytes'] == 0 and not record.get('completed_at')
        archives.append({'job': record['job'], 'state': record['state'], 'bytes': len(data), 'sha256': record['sha256'], 'metadata_and_bytes_verified': True})
print(json.dumps({'device_outputs': results, 'saved_records': archives}, indent=2))
