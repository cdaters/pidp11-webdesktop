"""Only in disposable pidp11-m59 ARM64 Linux; no real Oscar installation.
Tests read-only preflight against explicit structural stubs and missing memory
containment in a temporary systemd slice. Never reboots or edits boot settings.
"""
import hashlib,json,os,pathlib,subprocess,time
assert os.environ.get('PIDP11_ISOLATED_LAB')=='1'
assert os.uname().nodename=='pidp11-m59' and os.uname().machine=='aarch64'
assert pathlib.Path('/sys/class/net/eth0/operstate').read_text().strip()=='down'
def run(*args,check=True):return subprocess.run(args,text=True,capture_output=True,timeout=20,check=check)
root=pathlib.Path('/opt/pidp11');assert not root.exists()
script='/tmp/package-final/preflight.sh'
absent=run('sh',script,check=False);assert absent.returncode==1 and 'Original selection map unavailable' in absent.stdout
(root/'bin').mkdir(parents=True);(root/'systems').mkdir()
for name in ['client11','server11','scansw']:
 p=root/'bin'/name;p.write_text('#!/bin/sh\necho MUST_NOT_RUN >&2\nexit 99\n');p.chmod(0o755)
(root/'systems'/'selections').write_text('# structural fixture only\n')
before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
valid=run('sh',script,'/etc/pidp11-webdesktop/config.json');assert 'MUST_NOT_RUN' not in valid.stdout+valid.stderr
assert before=={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
unit='pidp11-webdesktop.service';run('systemctl','stop',unit)
slice_file=pathlib.Path('/etc/systemd/system/m59-nomemory.slice')
override=pathlib.Path('/etc/systemd/system/'+unit+'.d/zzzzz-m59-memory.conf')
slice_file.write_text('[Slice]\nDisableControllers=memory\n');override.write_text('[Service]\nSlice=m59-nomemory.slice\n')
try:
 run('systemctl','daemon-reload');run('systemctl','start',unit,check=False)
 for _ in range(50):
  if run('systemctl','show',unit,'-p','ActiveState','--value').stdout.strip()=='failed':break
  time.sleep(.1)
 else:raise AssertionError('missing memory limit did not refuse startup')
 assert ':8445' not in run('ss','-lnt').stdout
 assert 'memory containment unavailable' in run('journalctl','-u',unit,'-n','15','--no-pager').stdout
finally:
 run('systemctl','stop',unit);override.unlink();run('systemctl','stop','m59-nomemory.slice');slice_file.unlink();run('systemctl','daemon-reload');run('systemctl','reset-failed',unit,check=False)
run('systemctl','start',unit)
for p in sorted(root.rglob('*'),key=lambda p:len(p.parts),reverse=True):
 if p.is_file():p.unlink()
 elif p.is_dir():p.rmdir()
root.rmdir()
result={'platform':'disposable ARM64 Linux','absent_original_installation_refused':True,'structural_fixture_and_private_config_passed':True,'original_fixture_hashes_unchanged':True,'original_programs_not_executed':True,'missing_effective_memory_limit_refused_before_listener':True,'protected_start_restored':True,'fixture_removed':True,'actual_oscar_fresh_installation_tested':False,'boot_configuration_changed':False}
pathlib.Path('/tmp/m59-readiness.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
