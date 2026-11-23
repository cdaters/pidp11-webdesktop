"""Attest only the separately inspected RSX printer producer in this lab.

The operator must verify RSX and the empty, preattached spool before starting,
and must independently verify PIP completion, paused/drained LP11 and file close
before sending the private complete request. Process continuity is not OS identity.
This helper neither controls SIMH nor accepts browser commands.
"""
import hashlib
import json
import os
from pathlib import Path
import sys
import time

from control import approve

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
assert sys.argv[1:] == ['--guest-and-spool-verified']
root = Path('/work')
pid = json.loads((root / 'ready.json').read_text())['simh_pid']
process = Path('/proc') / str(pid)
start = (process / 'stat').read_text().split()[21]
assert os.readlink(process / 'exe') == '/opt/lab/pdp11_realcons'
spool = root / 'guest-printer.out'
assert spool.is_file() and spool.stat().st_size == 0
identity = ('rsx-lp11', 'm520-original-rsx-simh', 'rsx-v46-bl87')


def attest(operation, **fields):
    assert (process / 'stat').read_text().split()[21] == start, 'Producer changed'
    return approve(identity[0], operation, identity[1], identity[2], **fields)


attest('follow')
(root / 'printer-observer-ready.json').write_text('{}')
deadline = time.monotonic() + 1
while True:
    if time.monotonic() >= deadline:
        attest('renew')
        deadline = time.monotonic() + 1
    path = root / 'printer-request.json'
    if not path.exists():
        time.sleep(.05)
        continue
    command = json.loads(path.read_text())
    path.unlink()
    assert command['op'] == 'complete' and command.get('producer_close_verified') is True
    data = spool.read_bytes()
    assert len(data) <= 1048576
    digest = hashlib.sha256(data).hexdigest()
    attest('complete', sha256=digest)
    result = {'id': command['id'], 'bytes': len(data), 'sha256': digest,
              'guest': 'RSX-11M-PLUS V4.6 BL87', 'program': 'PIP M2101 (ANSI)',
              'device': 'LP11', 'driver': 'LPDRV.TSK;2', 'completed_after_verified_close': True}
    (root / 'printer-results.json').write_text(json.dumps(result, indent=2) + '\n')
    temporary = root / 'printer-response.tmp'
    temporary.write_text(json.dumps(result))
    temporary.replace(root / 'printer-response.json')
    break
