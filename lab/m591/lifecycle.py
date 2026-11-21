"""Mac shell: bounded lifecycle checks in the exact disposable ARM64 VM.
No SSH, package downloads, physical Pi or original installation is involved.
Run after setup and before removing the lab. TLS bypass is only for this lab.
"""
import http.cookiejar
import json
import pathlib
import ssl
import subprocess
import time
import urllib.request

prefix = ['/opt/homebrew/bin/orbctl', 'run', '-m', 'pidp11-m591', '-u', 'root']
def run(*args):
    return subprocess.check_output(prefix + list(args), timeout=20).decode()
assert run('hostname').strip() == 'pidp11-m591'
assert run('uname', '-m').strip() == 'aarch64'
assert run('cat', '/sys/class/net/eth0/operstate').strip() == 'down'
service = '/opt/pidp11-webdesktop/current/webdesktop-service'
unit = 'pidp11-webdesktop.service'
base = 'https://127.0.0.1:8447'
jar = http.cookiejar.CookieJar()
client = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=ssl._create_unverified_context()), urllib.request.HTTPCookieProcessor(jar))
request = urllib.request.Request(base+'/api/v1/login', data=json.dumps({'token':run('cat','/etc/pidp11-webdesktop/writer.token').strip()}).encode(), headers={'Origin':base,'Content-Type':'application/json'})
assert client.open(request,timeout=3).status == 200
before = json.loads(run(service,'status'))
run('systemctl','restart',unit)
for attempt in range(30):
    try:
        after = json.loads(run(service,'status'))
        break
    except subprocess.CalledProcessError:
        time.sleep(.1)
else:
    raise AssertionError('service did not become ready')
assert before['instance'] != after['instance']
assert all(line['state']=='detached' for line in after['lines'])
try:
    client.open(base+'/api/v1/session',timeout=3)
    raise AssertionError('old session survived restart')
except urllib.error.HTTPError as error:
    assert error.code in (401,403)
results={'platform':'disposable ARM64 Linux','restart_changes_instance':True,'restart_detached':True,'prior_session_revoked':True,'emulator_or_original_installation_present':False}
pathlib.Path('.research/m591/lifecycle.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
