"""Original-C CPU differential: four TM reads each require a real interrupt.
This is device evidence, not historical guest execution. Readonly authored media.
"""
import hashlib,json,os,re,struct,sys
from pathlib import Path
sys.path.insert(0,'/lab')
from integration import Simh
from pdp11_program import Program,execute
root=Path('/work');mode=sys.argv[1];assert mode in ['control','disabled','enabled']
assert os.environ.get('PIDP11_ISOLATED_LAB')=='1' and set(os.listdir('/sys/class/net'))=={'lo'}
payload=b'M5.25 TM11 ORIGINAL-C INTERRUPT COMPARISON\r\n'
media=struct.pack('<I',len(payload))+payload+struct.pack('<I',len(payload))+bytes(8)
(root/'irq.tap').write_bytes(media);(root/'irq.tap').chmod(0o400)
sim=Simh('/build/m525/'+('control' if mode=='control' else 'instrumented')+'/bin/pdp11_realcons',{'PIDP11_M525_ENABLE':'1' if mode=='enabled' else '0'})
try:
 for cmd in ['set cpu 11/70 256K','set tm enabled','set tm0 locked','attach -r tm0 /work/irq.tap','deposit 224 1600','deposit 226 0','deposit 1600 5200','deposit 1602 2','deposit psw 0']:
  out=sim.command(cmd);assert 'sim> ' in out and 'Invalid' not in out,out
 p=Program();p.emit(0o012706,0o4000,0o005000)
 for number in range(1,5):
  p.emit(0o012737,(-len(payload))&65535,0o172524)
  p.emit(0o012737,0o2000,0o172526)
  p.emit(0o012737,0o103,0o172522)
  p.label('wait'+str(number));p.emit(0o022700,number);p.branch(0o001000,'wait'+str(number))
  p.emit(0o013737,0o172520,0o3000+(number-1)*4)
  p.emit(0o013737,0o172522,0o3002+(number-1)*4)
 p.emit(0)
 halt=execute(sim,p,'four-read-interrupts',root)
 facts={cmd:sim.command(cmd) for cmd in ['examine r0','examine 3000-3016','examine 2000-'+format(0o2000+len(payload)-2,'o'),'examine tm mts,mtc,mtbrc,mtcma,ust[0],pos[0]','show realcons']}
 assert re.search(r'R0:\s+000004',facts['examine r0']),facts
 words=facts['examine 2000-'+format(0o2000+len(payload)-2,'o')]
 data=b''.join(struct.pack('<H',int(m[1],8)) for m in re.finditer(r'^\s*[0-7]+:\s+([0-7]{6})',words,re.M));assert data==payload
 sim.command('quit');sim.p.wait(timeout=3);assert sim.p.returncode==0
 assert (root/'irq.tap').read_bytes()==media
 (root/'result.json').write_text(json.dumps({'mode':mode,'facts':facts,'interrupts_serviced':4,'dma_bytes':len(data),'dma_sha256':hashlib.sha256(data).hexdigest(),'input_unchanged':True,'exit_code':0},indent=2))
finally:
 (root/'console-private.txt').write_text(sim.log);sim.stop()
