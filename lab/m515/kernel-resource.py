"""Second boot of only the owned QEMU guest: real cgroup guard, no emulator."""
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import time

assert 'orbstack' not in os.uname().release
assert set(os.listdir('/sys/class/net')) == {'lo'}
root=Path('/root/m515-native')
binary=str(root/'current-0')
config=root/'current-config-0/config.json'
control=Path('/run/pidp11-webdesktop')
control.mkdir(mode=0o700, exist_ok=True)
assert control.stat().st_mode & 0o777 == 0o700
assert not (control/'control.sock').exists()
group=Path('/sys/fs/cgroup/m515')
Path('/sys/fs/cgroup/cgroup.subtree_control').write_text('+memory')
group.mkdir();(group/'memory.max').write_text('100663296');(group/'memory.swap.max').write_text('0')
def bounded():
    (group/'cgroup.procs').write_text(str(os.getpid()))
report={'kernel':os.uname().release,'physicalPi':False}
command=[binary,'serve','-require-memory-limit','-config',str(config)]
refused=subprocess.run(command,capture_output=True,timeout=30)
assert refused.returncode==1 and b'memory containment unavailable' in refused.stderr
with socket.socket() as probe: assert probe.connect_ex(('127.0.0.1',8447))!=0
report['unboundedCgroupRefusedBeforeListener']=True
log=Path('/work/kernel-evidence/service.stderr').open('wb')
process=subprocess.Popen(command,preexec_fn=bounded,stdout=subprocess.DEVNULL,stderr=log)
try:
    for _ in range(50):
        status=subprocess.run([binary,'status'],capture_output=True,timeout=5)
        if status.returncode==0: break
        assert process.poll() is None
        time.sleep(.1)
    assert status.returncode==0
    value=json.loads(status.stdout)
    assert all(line['state']=='detached' for line in value['lines'])
    report['boundedStartupDetached']=True
    report['memoryMax']=(group/'memory.max').read_text().strip()
    report['memorySwapMax']=(group/'memory.swap.max').read_text().strip()
    report['statusSnapshot']=[line for line in Path(f'/proc/{process.pid}/status').read_text().splitlines() if line.startswith(('VmRSS:','Threads:'))]
    # Preserve actual runtime mapping evidence privately, including loaded ranges.
    Path('/work/kernel-evidence/service.maps').write_text(Path(f'/proc/{process.pid}/maps').read_text())
finally:
    process.send_signal(signal.SIGTERM);process.wait(timeout=10);log.close()
report['cleanStopExit']=process.returncode
report['memoryEvents']=(group/'memory.events').read_text()
Path('/work/kernel-evidence/resource.json').write_text(json.dumps(report,indent=2)+'\n')
print('M515_RESOURCE_COMPLETE',flush=True)
