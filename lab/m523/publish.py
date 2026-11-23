"""Translate independently verified fixed lab captures; invoke the real collector.
No monitor commands. Run only while each captured original simulator remains halted.
"""
import json,os,re,subprocess,sys,uuid
from pathlib import Path
assert os.environ.get('PIDP11_ISOLATED_LAB')=='1'
assert sys.argv[1:] in [['disk','--independent-capture-verified'],['tape','--independent-capture-verified']]
kind=sys.argv[1];root=Path('/work');capture=json.loads((root/('capture.json' if kind=='disk' else 'tape/capture.json')).read_text());facts=capture['facts']
if kind=='disk':
 assert 'RL11' in facts['show rl'] and 'RL02' in facts['show rl0'] and 'attached to /work/disk0.work' in facts['show rl0']
 registers=facts['examine rl rlcs,rlda,rlba,rlmp'];csr=int(re.search(r'RLCS:\s+([0-7]+)',registers)[1],8)
 assert csr&0o200 and not csr&0o100000
else:
 assert 'attached to /work/tape/authored.tap, read only, write locked, SIMH format' in facts['show tm0']
 registers=facts['examine tm mts,mtc,mtbrc,mtcma,ust[0],pos[0]'];csr=int(re.search(r'MTC:\s+([0-7]+)',registers)[1],8);status=int(re.search(r'MTS:\s+([0-7]+)',registers)[1],8)
 assert csr&0o200
 stages=json.loads((root/'tape/stages.json').read_text())
 assert [s['name'] for s in stages]==['attached-at-bot','record','filemark-one','filemark-two','end-of-medium']
 assert status==0o505 and int(re.search(r'POS\[0\]:\s+(\d+)',registers)[1])==capture['size']
record=dict(id=kind,device='RL0' if kind=='disk' else 'TM0',controller='RL11' if kind=='disk' else 'TM11',unit=0,simulator='m523-original-rt11' if kind=='disk' else 'm523-original-tm11',guest='rt11-v0503-attested' if kind=='disk' else 'diskless-cpu-test-no-guest',capture='capture-'+uuid.uuid4().hex,captured_at=capture['captured_at'],family='RL02' if kind=='disk' else 'TU10',configured=True,attachment='attached',media='Disposable RT11 RL02' if kind=='disk' else 'Authored record and two filemarks',provenance='Verified RT11 base; independent disposable working copy' if kind=='disk' else 'Original authored ASCII test bytes; generated SIMH length-framed tape',sha256=capture['sha256'],size=capture['size'],format='SIMH disk' if kind=='disk' else 'SIMH tape',capacity=10485760 if kind=='disk' else 0,geometry='512 cylinders; 2 heads; 40 sectors per track; 256-byte sectors' if kind=='disk' else 'unavailable',write_protection='guest-writable' if kind=='disk' else 'read-only',guest_access='observed' if kind=='disk' else 'unavailable',guest_evidence='Original RT11 console SHOW CONFIG boot DL0 and DIR *.SYS completed' if kind=='disk' else 'No guest driver qualified; CPU DMA read matched authored record exactly',activity='unavailable',position=-1 if kind=='disk' else int(re.search(r'POS\[0\]:\s+(\d+)',registers)[1]),position_meaning='unavailable' if kind=='disk' else 'SIMH logical image byte offset; not host file cursor or physical tape length',ready='observed-error' if csr&0o100000 else 'observed-ready',filemark='unavailable' if kind=='disk' else 'observed' if status&0o40000 else 'not-observed',end_of_medium='unavailable' if kind=='disk' else 'observed',registers='; '.join(' '.join(line.split()) for line in registers.splitlines() if re.match(r'^[A-Z]+(?:\[0\])?:',line)),source='Independent halted original SIMH console; named register values; REALCONS disconnected')
config={'socket':'/tmp/m523-control/control.sock','media_path':'/work/disk0.work' if kind=='disk' else '/work/tape/authored.tap','snapshot':record}
path=root/(kind+'-'+record['capture']+'.json');path.write_text(json.dumps(config));path.chmod(0o600)
subprocess.run(['/work/runtime/storage-snapshot','-config',str(path),'-independent-capture-verified'],check=True)
(root/(kind+'-published.json')).write_text(json.dumps(record,indent=2))
