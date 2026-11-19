"""Run as root only inside the named disposable, network-isolated ARM64 VM.
No SSH, physical GPIO, original guest, or real installation is used.
"""
import hashlib, http.cookiejar, json, os, pathlib, socket, ssl, subprocess, threading, time, urllib.error, urllib.request
assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert os.uname().machine == 'aarch64'
assert pathlib.Path('/sys/class/net/eth0/operstate').read_text().strip() == 'down'
unit='pidp11-webdesktop.service'
exe='/opt/pidp11-webdesktop/current/webdesktop-service'
config=json.loads(pathlib.Path('/etc/pidp11-webdesktop/config.json').read_text())
base=config['origin']
context=ssl.create_default_context(cafile=config['certificate'])
jar=http.cookiejar.CookieJar();browser=urllib.request.build_opener(urllib.request.HTTPSHandler(context=context),urllib.request.HTTPCookieProcessor(jar))
def run(*args):return subprocess.check_output(args,text=True).strip()
def ready():
    for _ in range(100):
        try:return browser.open(base+'/',timeout=1).read()
        except (OSError,urllib.error.URLError):time.sleep(.05)
    raise AssertionError('service not ready')
def get(path):return json.load(browser.open(base+path,timeout=2))
def status():return json.loads(run(exe,'status'))
def attach(s):
    line=next(x for x in s['lines'] if x['id']=='guest-dc0')
    return json.loads(run(exe,'attach','-instance',s['instance'],'-id',line['id'],'-revision',str(line['revision']),'-guest-and-line-verified'))
def denied(path):
    try:browser.open(base+path,timeout=2)
    except urllib.error.HTTPError as e:assert e.code in (401,403);return
    raise AssertionError('old session survived')
assert subprocess.run(['systemctl','is-enabled','--quiet',unit]).returncode != 0
assert b'<html' in ready()
s=status();assert all(l['state']=='detached' for l in s['lines'])
token=pathlib.Path(config['writer_token']).read_text().strip()
r=browser.open(urllib.request.Request(base+'/api/v1/login',data=json.dumps({'token':token}).encode(),headers={'Origin':base,'Content-Type':'application/json'}));assert r.status==200;r.close()
assert get('/api/v1/terminals')[0]['state']=='detached'
try:
    browser.open(urllib.request.Request(base+'/api/v1/login',data=b'{}',headers={'Origin':'https://wrong.example'}))
    raise AssertionError('wrong origin accepted')
except urllib.error.HTTPError as e:assert e.code==403
listener=socket.socket();listener.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);listener.bind(('127.0.0.1',40100));listener.listen();listener.settimeout(2)
assert attach(s)['instance']==s['instance'];peer,_=listener.accept();assert any(x['connected'] for x in get('/api/v1/terminals'))
peer.close()
for _ in range(50):
    if any(l['state']=='unavailable' for l in status()['lines']):break
    time.sleep(.02)
else:raise AssertionError('EOF not retired')
# A replacement listener remains present, but restart cannot approve it.
run('systemctl','restart',unit);ready();fresh=status();assert fresh['instance']!=s['instance'];assert all(l['state']=='detached' for l in fresh['lines']);denied('/api/v1/terminals')
listener.settimeout(.3)
try:listener.accept();raise AssertionError('automatic replacement dial')
except socket.timeout:pass
# An independent local peer has its own socket/process lifecycle across service stop.
independent=socket.socket();independent.connect(listener.getsockname());server_peer,_=listener.accept()
run('systemctl','stop',unit);independent.sendall(b'INDEPENDENT');assert server_peer.recv(11)==b'INDEPENDENT'
run('systemctl','start',unit);ready();assert all(l['state']=='detached' for l in status()['lines'])
run('systemctl','kill','--kill-whom=main','--signal=KILL',unit)
for _ in range(50):
    if subprocess.run(['systemctl','is-active','--quiet',unit]).returncode:break
    time.sleep(.05)
run('systemctl','reset-failed',unit);run('systemctl','start',unit);ready();assert all(l['state']=='detached' for l in status()['lines']);denied('/api/v1/terminals')
independent.sendall(b'AFTER_CRASH');assert server_peer.recv(11)==b'AFTER_CRASH'
independent.close();server_peer.close();listener.close()
print(json.dumps({'environment':'Mac-hosted Debian 13 ARM64, systemd 257, eth0 DOWN','install_disabled':True,'detached_assets_without_guest':True,'authentication':True,'wrong_origin_rejected':True,'explicit_synthetic_attachment':True,'guest_eof_retired':True,'restart_revokes_sessions':True,'restart_no_guest_dial':True,'crash_restart_detached':True,'independent_peer_survives':True,'real_guest_test':'separate network-none Docker rehearsal'},indent=2))
