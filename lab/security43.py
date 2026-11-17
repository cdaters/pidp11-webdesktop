"""Private credential provisioning/rotation in TLS-only network-none fixture."""
from integration import *
import ssl,secrets,http.cookiejar
assert [p.name for p in pathlib.Path('/sys/class/net').iterdir()]==['lo']
subprocess.run(['/fixtures/lab-cert-linux-arm64'],check=True)
token=pathlib.Path('/tmp/observe.token');token.write_text(secrets.token_hex(32));token.chmod(0o600)
runtime=pathlib.Path('/tmp/private-observer');runtime.mkdir(mode=0o700)
p=subprocess.Popen(['/fixtures/observe-lab-linux-arm64','-socket',str(runtime/'state.sock'),'-publisher-pid',str(os.getpid()),'-publisher-uid',str(os.geteuid()),'-tls-cert','/tmp/observe-cert.pem','-tls-key','/tmp/observe-key.pem'],stdout=subprocess.DEVNULL,stderr=open('/results/m43-security.log','w'))
ctx=ssl.create_default_context(cafile='/tmp/observe-cert.pem');client=urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def request(path,data=None,headers={}):
 req=urllib.request.Request('https://127.0.0.1:8443'+path,data=None if data is None else json.dumps(data).encode(),headers={'Origin':'https://127.0.0.1:8443','Content-Type':'application/json',**headers})
 try:
  with client.open(req,timeout=2) as r:return r.status,r.read().decode()
 except urllib.error.HTTPError as e:return e.code,e.read().decode()
report={}
try:
 wait(lambda:(runtime/'state.sock').exists());wait(lambda:request('/api/v1/session')[0]==401)
 status,body=request('/api/v1/login',{'token':token.read_text()});assert status==200;csrf=json.loads(body)['csrf']
 assert request('/api/v1/observe')[0]==200
 assert request('/api/v1/logout',{}, {'X-CSRF-Token':'wrong'})[0]==403
 assert request('/api/v1/control',{})[0]==403
 assert request('/api/v1/audit')[0]==403
 assert request('/api/v1/login',{'token':token.read_text()},{'Origin':'https://attacker.invalid'})[0]==403
 assert request('/api/v1/logout',{}, {'X-CSRF-Token':csrf})[0]==204
 assert request('/api/v1/observe')[0]==403
 old=token.read_text();assert request('/api/v1/login',{'token':old})[0]==200
 token.write_text(secrets.token_hex(32));os.kill(p.pid,signal.SIGHUP);wait(lambda:request('/api/v1/observe')[0]==403)
 assert request('/api/v1/login',{'token':old})[0]==401
 assert request('/api/v1/login',{'token':token.read_text()})[0]==200
 token.chmod(0o644);os.kill(p.pid,signal.SIGHUP);wait(lambda:request('/api/v1/observe')[0]==403)
 assert request('/api/v1/login',{'token':token.read_text()})[0]==401
 report={'status':'PASS','cases':['trusted ephemeral certificate / TLS HTTPS','CSRF logout required','cross-Origin rejected','control/admin privilege denied','logout invalidates cookie','SIGHUP rotation revokes existing session and old credential','unsafe token permissions on reload revoke all credentials'],'scope':'isolated Linux loopback, no installed CA, no production endpoint or credentials'}
finally:stop(p);pathlib.Path('/results/m43-security.json').write_text(json.dumps(report,indent=2)+'\n')
