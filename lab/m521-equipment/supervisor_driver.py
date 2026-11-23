"""Private lab operator pipe to the independent Go supervisor.
No guest commands or media operations. A failed/uncertain request is never retried.
The independently owned guest harness survives this process or supervisor loss.
"""
import hashlib
import json
import os
from pathlib import Path
import select
import subprocess
import sys
import time

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
assert sys.argv[1:] == ['--guest-and-devices-verified']
os.umask(0o077)
root = Path('/work')
pid = json.loads((root / 'ready.json').read_text())['simh_pid']
process = Path('/proc') / str(pid)
assert os.readlink(process / 'exe') == '/opt/lab/pdp11_realcons'
start = (process / 'stat').read_text().rsplit(')', 1)[1].split()[19]
with (process / 'exe').open('rb') as stream:
    digest = hashlib.file_digest(stream, 'sha256').hexdigest()
assert digest == 'f38167163e37dbb9578f33cc58f9740e3a6408829c4e357637b76835864c8237'
config = {'socket': '/tmp/m521-control/control.sock', 'pid': pid, 'start': start, 'executable_sha256': digest, 'simulator': 'm521-original-rsx-simh', 'guest': 'rsx-v46-bl87', 'guest_and_devices_verified': True, 'jobs': ['lp1', 'punch1', 'lp2', 'punch2']}
path = root / 'supervisor-config.json'
with path.open('x') as stream:
    json.dump(config, stream)
with (root / 'supervisor-stderr.log').open('x') as errors:
    supervisor = subprocess.Popen(['/work/runtime/equipment-supervisor', '-config', str(path)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=errors, text=True)
    (root / 'supervisor.pid').write_text(str(supervisor.pid))
    sequence = 0
    try:
        while supervisor.poll() is None:
            request = root / 'supervisor-request.json'
            if not request.exists():
                time.sleep(.05)
                continue
            message = json.loads(request.read_text())
            request.unlink()
            identifier = message.pop('request_id')
            sequence += 1
            message['sequence'] = sequence
            supervisor.stdin.write(json.dumps(message) + '\n')
            supervisor.stdin.flush()
            ready, _, _ = select.select([supervisor.stdout], [], [], 8)
            assert ready, 'Uncertain supervisor reply; do not replay'
            raw = supervisor.stdout.readline()
            assert raw, 'Supervisor exited; inspect stderr and let approvals expire'
            result = json.loads(raw)
            assert result['sequence'] == sequence and result['accepted'] is True
            result['request_id'] = identifier
            temporary = root / 'supervisor-response.tmp'
            temporary.write_text(json.dumps(result))
            temporary.replace(root / 'supervisor-response.json')
        (root / 'supervisor-exit.json').write_text(json.dumps({'exit_code': supervisor.returncode, 'guest_signalled': False}))
    finally:
        supervisor.stdin.close()
        supervisor.wait(timeout=10)
