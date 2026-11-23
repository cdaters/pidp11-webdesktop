"""Verify this laboratory fixture's observed transformation, then approve export.
Run only after PIP returned and the independent harness verified EOF/drain and
closed PTR/PTP. A finished file cannot be replayed as a fresh live observation.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from control import request

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
assert sys.argv[1:] == ['--producer-close-verified']
root = Path('/work')
source = (root / 'guest-reader.bin').read_bytes()
output = (root / 'guest-punch.bin').read_bytes()
fixture = json.loads((root / 'reader-fixture.json').read_text())
records = ('\r\n'.join(fixture['lines']) + '\r\n').encode('ascii') + b'\x1a'
assert source == b'\0' * 16 + records
assert output == b'\0' * 170 + records + b'\0' * 170
assert hashlib.sha256(source).hexdigest() == fixture['sha256']
registers = (root / 'pc11-registers-private.txt').read_text()
assert re.search(r'POS:\s*401', registers)
assert re.search(r'CSR:\s*100000', registers)
assert re.search(r'CSR:\s*000200', registers)
digest = hashlib.sha256(output).hexdigest()
status = request('GET', '/devices/status')
row = next(row for row in status['devices'] if row['id'] == 'rsx-pc11')
request('POST', '/devices/publish', {
    'instance': status['instance'], 'id': row['id'], 'revision': row['revision'],
    'simulator_generation': 'm520-rsx-pc-original-simh',
    'guest_generation': 'rsx-v46-bl87', 'sha256': digest,
    'completed_and_verified': True,
})
result = {
    'guest': 'RSX-11M-PLUS V4.6 BL87', 'program': 'PIP M2101 (ANSI)',
    'command': 'PIP PP:=PR:', 'input_bytes': len(source),
    'input_sha256': fixture['sha256'], 'output_bytes': len(output),
    'output_sha256': digest, 'records': 12,
    'transformation': '16 NUL input leader removed; 170 NUL leader and trailer added; CRLF records and SUB preserved',
    'reader_eof_csr': '100000', 'punch_ready_csr': '000200',
    'completed_after_safe_close': True,
    'application_entered_through': 'independent conventional console',
    'browser_observation': 'completed artifact; live OS-driver streaming not tested',
}
(root / 'pc11-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print('Verified RSX tape export approved; no media or simulator operation')
