"""Translate one independently verified, paused original-console capture.
Run immediately after capture. This adapter has no simulator connection or commands.
"""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert sys.argv[1:] in [['rt11', '--independent-capture-verified'], ['v7', '--independent-capture-verified']]
guest = sys.argv[1]
root = Path('/work')
capture = json.loads((root / 'browser-capture.json').read_text())
facts = capture['facts']
disk = guest == 'v7'
kind = 'disk' if disk else 'tape'
media_path = 'disk0.work' if disk else 'tape/input.tap'
image = capture['images'][media_path]
if disk:
    assert 'Massbus adapter 0 (RHA)' in facts['show rp']
    assert 'attached to /work/disk0.work, write enabled' in facts['show rp0'] and 'SIMH format, RP06' in facts['show rp0']
    raw = facts['examine rp cs1[0],ds[0],er1[0],da[0],dc[0]']
    status = int(re.search(r'DS\[0\]:\s+([0-7]+)', raw)[1], 8)
    assert status & 0o200 and not status & 0o40000
    assert int(re.search(r'ER1\[0\]:\s+([0-7]+)', raw)[1], 8) == 0
else:
    assert 'attached to /work/tape/input.tap, read only, write locked, SIMH format' in facts['show tm0']
    raw = facts['examine tm mts,mtc,mtbrc,mtcma,ust[0],pos[0]']
    status = int(re.search(r'MTS:\s+([0-7]+)', raw)[1], 8)
    assert status & 0o40000  # Expected EOF after the guest's label/filemark search.
    assert image['sha256'] == '8841da1560ce50d73165b659fb437c5de7d61fcd484993be2247ff05ffde09bb'
registers = '; '.join(match.group(1) + ': ' + match.group(2) for match in re.finditer(r'^([A-Z]+(?:\[0\])?):\s+(\d+)', raw, re.M))
record = dict(
    id=kind, device='RP0' if disk else 'TM0', controller='RH70' if disk else 'TM11', unit=0,
    simulator='m524-original-' + guest, guest='unix-v7-attested' if disk else 'rt11-v0503-attested',
    capture='capture-' + uuid.uuid4().hex, captured_at=capture['captured_at'],
    family='RP06' if disk else 'TU10', configured=True, attachment='attached',
    media='Disposable UNIX V7 RP06' if disk else 'Authored RT11 labeled tape: RECA.TXT and RECB.TXT',
    provenance='Verified retained V7 distribution; independent working copy' if disk else 'Authored 512-byte RT11 pre-V5.5 labels and data; two files; immutable input',
    sha256=image['sha256'], size=image['size'], format='SIMH disk' if disk else 'SIMH tape',
    capacity=174423040 if disk else 0,
    geometry='815 cylinders; 19 heads; 22 sectors per track; 512-byte sectors' if disk else 'unavailable',
    write_protection='guest-writable' if disk else 'read-only', guest_access='observed',
    guest_evidence='Original V7 console ls / and sync completed through RP06' if disk else 'RT11SJ V05.03 MT handler and PIP COPY/IMAGE recovered 512 + 1024 exact bytes; missing-file search stopped at logical end; EOF summary expected',
    activity='unavailable', position=-1 if disk else int(re.search(r'POS\[0\]:\s+(\d+)', raw)[1]),
    position_meaning='unavailable' if disk else 'SIMH logical image byte offset; not host file cursor or physical tape length',
    ready='observed-ready' if disk else 'observed-error', filemark='unavailable' if disk else 'observed',
    end_of_medium='unavailable' if disk else 'not-observed', registers=registers,
    source='Independent idle then halted original SIMH console; named registers; REALCONS disconnected')
config = {'socket':'/tmp/m524-control/control.sock','media_path':'/work/' + media_path,'snapshot':record}
path = root / (kind + '-' + record['capture'] + '.json')
with path.open('x') as output:
    json.dump(config, output)
path.chmod(0o600)
subprocess.run(['/work/runtime/storage-snapshot','-config',str(path),'-independent-capture-verified'],check=True)
with (root / (kind + '-published.json')).open('x') as output:
    json.dump(record, output, indent=2)
