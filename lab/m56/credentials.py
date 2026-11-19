"""Actual HTTPS credentials in the disposable systemd lab; no guest is dialed."""
import json, os, pathlib, ssl, urllib.error, urllib.request
assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert pathlib.Path('/sys/class/net/eth0/operstate').read_text().strip() == 'down'
c=json.loads(pathlib.Path('/etc/pidp11-webdesktop/config.json').read_text())
context=ssl.create_default_context(cafile=c['certificate'])
url=c['origin']+'/api/v1/login'
def login(token):
    request=urllib.request.Request(url,data=json.dumps({'token':token}).encode(),headers={'Origin':c['origin'],'Content-Type':'application/json'})
    return urllib.request.urlopen(request,context=context,timeout=3)
try:
    login('invalid-fixture-token')
    raise AssertionError('incorrect credential accepted')
except urllib.error.HTTPError as e:
    assert e.code in (401,403)
for role in ('writer_token','observer_token'):
    with login(pathlib.Path(c[role]).read_text().strip()) as r: assert r.status == 200
print('PASS: wrong credential refused; distinct writer and observer credentials accepted over verified TLS.')
