"""Private test adapter to the actual guided operator CLI; no SIMH commands.
Each request contains one human-readable local equipment command. Never replay.
"""
import json
import os
from pathlib import Path
import select
import subprocess
import sys
import time

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
assert len(sys.argv) == 3 and sys.argv[2] == '--guest-and-devices-verified'
name = sys.argv[1]
assert name in ('first', 'second', 'rt11')
root = Path('/work')
pid = json.loads((root / 'ready.json').read_text())['simh_pid']
config = root / f'operator-{name}.json'
subprocess.run(['/work/runtime/equipment-supervisor', '-prepare', '-config', str(config), '-pid', str(pid), '-guest', 'rt11-v0503' if name == 'rt11' else 'rsx-v46-bl87', '-simulator', 'm522-original-simh', '-socket', '/tmp/m522-control/control.sock', '-slots', 'lp,punch', '-guest-and-devices-verified'], check=True)
with (root / f'operator-{name}.log').open('x') as log:
    supervisor = subprocess.Popen(['/work/runtime/equipment-supervisor', '-config', str(config), '-guided'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, text=True, bufsize=1)
    (root / 'supervisor.pid').write_text(str(supervisor.pid))
    while True:
        line = supervisor.stdout.readline()
        assert line, 'Guided setup exited'
        log.write(line)
        if line.startswith('Guest return is not drain.'):
            break
    supervisor.stdin.write('confirm\n')
    supervisor.stdin.flush()
    (root / f'operator-{name}-ready.json').write_text(json.dumps({'pid': supervisor.pid, 'guided': True}))
    try:
        while supervisor.poll() is None:
            path = root / 'supervisor-request.json'
            if not path.exists():
                time.sleep(.05)
                continue
            request = json.loads(path.read_text())
            path.unlink()
            line = request['line']
            assert '\n' not in line and len(line) <= 2000
            supervisor.stdin.write(line + '\n')
            supervisor.stdin.flush()
            if line == 'quit':
                supervisor.stdin.close()
                supervisor.wait(timeout=8)
                result = {'stopped': True, 'exit_code': supervisor.returncode}
            else:
                assert select.select([supervisor.stdout], [], [], 8)[0], 'Uncertain reply; do not replay'
                answer = supervisor.stdout.readline()
                assert answer, 'Supervisor exited; inspect log, never replay'
                log.write(answer)
                log.flush()
                result = json.loads(answer)
                assert result['accepted'] is True
            result['request_id'] = request['request_id']
            temporary = root / 'supervisor-response.tmp'
            temporary.write_text(json.dumps(result))
            temporary.replace(root / 'supervisor-response.json')
            if line == 'quit':
                break
    finally:
        if not supervisor.stdin.closed:
            supervisor.stdin.close()
        supervisor.wait(timeout=10)
