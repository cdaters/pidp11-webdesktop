"""Read retained M5.20 artifacts and independently verify each transformation.
Mac shell: python3 lab/m520/verify-artifacts.py .research/m520
No simulator, network, media write or approval operation is performed.
"""
import hashlib
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
lines = json.loads((root / 'rsx/printer-input-lines.json').read_text())
assert len(lines) == 160
printer = (root / 'rsx/guest-printer.out').read_bytes()
assert printer == b'\x0c' + b''.join(b'\n' + line.encode('ascii') + b'\r' for line in lines)
source = (root / 'rsx/live-reader.bin').read_bytes()
punch = (root / 'rsx/live-punch.bin').read_bytes()
assert source == bytes(range(256)) * 48 == punch
fixture = json.loads((root / 'rsx-pc11/reader-fixture.json').read_text())
records = ('\r\n'.join(fixture['lines']) + '\r\n').encode('ascii') + b'\x1a'
rsx_input = (root / 'rsx-pc11/guest-reader.bin').read_bytes()
rsx_output = (root / 'rsx-pc11/guest-punch.bin').read_bytes()
assert rsx_input == b'\0' * 16 + records
assert rsx_output == b'\0' * 170 + records + b'\0' * 170
assert hashlib.sha256(rsx_input).hexdigest() == fixture['sha256']
for name, data in [('RSX LP11', printer), ('CPU PC11 input/output', source),
                   ('RSX PC11 input', rsx_input), ('RSX PC11 output', rsx_output)]:
    print(json.dumps({'artifact': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}))
