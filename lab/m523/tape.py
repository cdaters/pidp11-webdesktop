"""Original TM11 CPU/device qualification, not a guest tape-driver claim.
Only authored readonly SIMH tape records; actual CPU instructions initiate reads.
"""
import datetime,hashlib,json,os,re,struct,sys,time
from pathlib import Path
sys.path.insert(0,'/lab')
from integration import Simh
from pdp11_program import Program,execute
assert os.environ.get('PIDP11_ISOLATED_LAB')=='1'
assert set(os.listdir('/sys/class/net'))=={'lo'}
root=Path('/work/tape');root.mkdir(mode=0o700)
payload=b'M5.23 ORIGINAL TM11 READ-ONLY CPU RECORD\r\n'
media=struct.pack('<I',len(payload))+payload+(b'\0' if len(payload)%2 else b'')+struct.pack('<I',len(payload))+struct.pack('<II',0,0)
path=root/'authored.tap';path.write_bytes(media);path.chmod(0o400)
sim=Simh();stages=[]
def capture(name):
 facts={cmd:sim.command(cmd) for cmd in ['show tm0','examine tm mts,mtc,mtbrc,mtcma,ust[0],pos[0]']}
 assert all('sim> ' in text for text in facts.values())
 item={'name':name,'captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),'facts':facts,'size':len(media),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 assert item['sha256']==hashlib.sha256(media).hexdigest()
 return item
try:
 for command in ['set cpu 11/70 256K','set tm enabled','set tm0 locked','attach -r tm0 /work/tape/authored.tap']:
  result=sim.command(command);assert 'sim> ' in result and 'Error' not in result,result
 stages.append(capture('attached-at-bot'))
 for index,name in enumerate(['record','filemark-one','filemark-two','end-of-medium']):
  p=Program();p.emit(0o012737,(-len(payload))&0xffff,0o172524);p.emit(0o012737,0o2000,0o172526);p.emit(0o012737,3,0o172522)
  p.label('wait');p.emit(0o105737,0o172522);p.branch(0o100000,'wait');p.emit(0)
  execute(sim,p,'read-'+name,root)
  stage=capture(name);stages.append(stage)
  if index==0:
   words=sim.command(f'examine 2000-{0o2000+len(payload)-2:o}')
   actual=bytearray()
   for match in re.finditer(r'^\s*[0-7]+:\s+([0-7]{6})',words,re.M):actual.extend(struct.pack('<H',int(match[1],8)))
   assert bytes(actual)==payload,(words,actual,payload)
   (root/'cpu-memory.txt').write_text(words)
  (root/'stages.json').write_text(json.dumps(stages,indent=2))
 (root/'ready.json').write_text(json.dumps({'simh_pid':sim.p.pid}))
 while True:
  request=root/'request.json'
  if not request.exists():time.sleep(.05);continue
  message=json.loads(request.read_text());request.unlink()
  if message['op']=='capture':
   item=capture('final-capture');(root/'capture.json').write_text(json.dumps(item,indent=2));output='captured halted TM11 status'
  elif message['op']=='finish':
   sim.command('quit');sim.p.wait(timeout=3);assert sim.p.returncode==0;output='original simulator exited zero'
  else:raise ValueError('Unsupported tape operation')
  (root/'response.json').write_text(json.dumps({'id':message['id'],'output':output}))
  if message['op']=='finish':break
finally:
 (root/'console-private.txt').write_text(sim.log);sim.stop()
