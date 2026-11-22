"""Mac shell: exact disposable ARM64 service; no physical Pi, SSH or guest.
Uses the VM control CLI; the service's temporary self-signed TLS is bypassed only
inside this isolated VM. Tokens and cookies never enter public result records.
"""
import json
import pathlib
import subprocess
import time

prefix = ['/opt/homebrew/bin/orbctl', 'run', '-m', 'pidp11-m593c', '-u', 'root']
def run(*args, data=None):
    return subprocess.check_output(prefix + list(args), input=data, timeout=20).decode()
assert run('hostname').strip() == 'pidp11-m593c'
assert run('uname', '-m').strip() == 'aarch64'
assert run('cat', '/sys/class/net/eth0/operstate').strip() == 'down'
service = '/opt/pidp11-webdesktop/current/webdesktop-service'
unit = 'pidp11-webdesktop.service'
base = 'https://127.0.0.1:8445'
token = run('cat', '/etc/pidp11-webdesktop/writer.token').strip()
login = run('curl', '-ksS', '-c', '/tmp/m593c-cookies', '-H', 'Origin: '+base, '-H', 'Content-Type: application/json', '--data-binary', '@-', base+'/api/v1/login', data=json.dumps({'token':token}).encode())
assert 'csrf' in json.loads(login)
before = json.loads(run(service, 'status'))
run('systemctl', 'restart', unit)
for _ in range(30):
    try:
        after = json.loads(run(service, 'status')); break
    except subprocess.CalledProcessError:
        time.sleep(.1)
else:
    raise AssertionError('service not ready')
assert before['instance'] != after['instance']
assert all(line['state'] == 'detached' for line in after['lines'])
code = run('curl', '-ksS', '-o', '/dev/null', '-w', '%{http_code}', '-b', '/tmp/m593c-cookies', base+'/api/v1/session')
assert code in ('401', '403')
enabled = subprocess.run(prefix + ['systemctl', 'is-enabled', unit], capture_output=True, text=True, timeout=10)
assert enabled.stdout.strip() == 'disabled'
metrics = run('systemctl', 'show', unit, '-p', 'MemoryCurrent', '-p', 'MemoryPeak', '-p', 'MemoryMax', '-p', 'MemorySwapMax', '-p', 'CPUUsageNSec', '-p', 'TasksCurrent')
result = dict(platform='disposable ARM64 Linux',restart_changes_instance=True,restart_detached=True,prior_session_revoked=True,original_emulator_present=False,metrics=metrics)
pathlib.Path('.research/m593c/arm64-lifecycle.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
