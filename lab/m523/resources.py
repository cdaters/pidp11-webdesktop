"""Bounded local TLS metadata requests; process samples are not Pi benchmarks."""
import http.cookiejar,json,os,ssl,time,urllib.request
from pathlib import Path
assert os.environ.get('PIDP11_ISOLATED_LAB')=='1'
root=Path('/work');pid=int((root/'bridge.pid').read_text());assert os.readlink(f'/proc/{pid}/exe')=='/work/runtime/webdesktop-service'
jar=http.cookiejar.CookieJar();context=ssl._create_unverified_context();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar),urllib.request.HTTPSHandler(context=context));base='https://127.0.0.1:8449'
request=urllib.request.Request(base+'/api/v1/login',data=json.dumps({'token':(root/'writer.token').read_text().strip()}).encode(),headers={'Origin':base,'Content-Type':'application/json'})
with client.open(request,timeout=3) as response:assert response.status==200
samples=[];start=time.monotonic()
for _ in range(100):
 before=time.monotonic()
 with client.open(base+'/api/v1/storage',timeout=3) as response:
  data=response.read(32769);assert len(data)<=32768;assert len(json.loads(data))==2
 elapsed=time.monotonic()-before
 path=Path(f'/proc/{pid}');fields=(path/'stat').read_text().rsplit(')',1)[1].split();status={}
 for line in (path/'status').read_text().splitlines():
  if line.split(':')[0] in ['VmRSS','VmHWM','Threads']:status[line.split(':')[0]]=int(line.split()[1])
 samples.append({'at':time.monotonic(),'request_ms':elapsed*1000,'bytes':len(data),'ticks':int(fields[11])+int(fields[12]),'fds':len(list((path/'fd').iterdir())),**status});time.sleep(.05)
end=time.monotonic();ticks=samples[-1]['ticks']-samples[0]['ticks'];hz=os.sysconf('SC_CLK_TCK')
report={'scope':'100 authenticated loopback TLS snapshot inventories; two retained devices; ARM64 lab, not Pi or live I/O','seconds':end-start,'requests':len(samples),'max_response_bytes':max(x['bytes'] for x in samples),'max_rss_kib':max(x['VmRSS'] for x in samples),'max_hwm_kib':max(x['VmHWM'] for x in samples),'max_fds':max(x['fds'] for x in samples),'max_threads':max(x['Threads'] for x in samples),'ticks':ticks,'clock_ticks_per_second':hz,'one_core_cpu_percent':ticks/hz/(samples[-1]['at']-samples[0]['at'])*100,'median_request_ms':sorted(x['request_ms'] for x in samples)[50],'max_request_ms':max(x['request_ms'] for x in samples)}
(root/'resources-private.json').write_text(json.dumps(samples,indent=2));(root/'resources.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
