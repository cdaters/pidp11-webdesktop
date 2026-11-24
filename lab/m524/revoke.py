"""Explicit local revocation of the exact tested captured generations."""
import http.client,json,os,socket
from pathlib import Path
assert os.environ.get('PIDP11_ISOLATED_LAB')=='1'
class Local(http.client.HTTPConnection):
 def connect(self):
  self.sock=socket.socket(socket.AF_UNIX);self.sock.settimeout(2);self.sock.connect('/tmp/m524-control/control.sock')
def call(method,path,body=None):
 connection=Local('local',timeout=2);connection.request(method,path,body=None if body is None else json.dumps(body));response=connection.getresponse();data=json.loads(response.read());assert response.status==200;connection.close();return data
rows=json.loads(Path('/work/browser-results.json').read_text());seen=set();result=[]
for row in rows:
 if row['device'] in seen:continue
 seen.add(row['device']);status=call('GET','/storage/status')
 result=call('POST','/storage/revoke',{**status,'verified':True,'id':'disk' if row['device']=='RP0' else 'tape','generation':row['generation']})
assert len(result)==1 and all(r['freshness']=='disconnected' for r in result)
Path('/work/revoked.json').write_text(json.dumps(result,indent=2))
