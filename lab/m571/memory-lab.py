#!/usr/bin/env python3
"""Disposable pidp11-m571 ARM64 Linux only; no physical Pi or guest use.
Requires reviewed package installed/configured, external interface down, root,
and /tmp/memoryprobe cross-built from this directory. Records actual outcomes.
"""
import atexit, json, os, pathlib, platform, subprocess, time
assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert platform.machine() == 'aarch64' and os.geteuid() == 0
assert platform.node() == 'pidp11-m571', 'This harness only operates in its named disposable machine'
assert pathlib.Path('/sys/class/net/eth0/operstate').read_text().strip() == 'down'
unit = 'pidp11-webdesktop.service'
overrides = pathlib.Path('/etc/systemd/system/' + unit + '.d')
overrides.mkdir(exist_ok=True)
package = pathlib.Path('/tmp/package-m571')
# Counter OrbStack's type-wide relaxation, without changing the package unit.
keys = ('NoNewPrivileges=', 'PrivateTmp=', 'PrivateDevices=', 'Protect', 'Restrict', 'CapabilityBoundingSet=', 'AmbientCapabilities=', 'InaccessiblePaths=')
(overrides/'zzzz-m571-hardening.conf').write_text('[Service]\n'+'\n'.join(x for x in (package/'pidp11-webdesktop.service').read_text().splitlines() if x.startswith(keys))+'\n')
def run(*args, check=True):
    return subprocess.run(args, text=True, capture_output=True, timeout=30, check=check)
def props(name):
    text=run('systemctl','show',name,'-p','ActiveState','-p','SubState','-p','Result','-p','ExecMainStatus','-p','MemoryMax','-p','MemorySwapMax','-p','ControlGroup','-p','Restart','-p','NoNewPrivileges','-p','PrivateDevices','-p','ProtectControlGroups','-p','ProtectSystem').stdout
    return dict(line.split('=',1) for line in text.splitlines() if '=' in line)
def stop():
    run('systemctl','stop',unit)
    run('systemctl','reset-failed',unit,check=False)
atexit.register(stop)
def wait_state(expected):
    for _ in range(50):
        state=props(unit)
        if state['ActiveState'] == expected:return state
        time.sleep(.1)
    raise AssertionError(state)
def no_listener():
    assert ':8445' not in run('ss','-lnt').stdout
results={'platform':platform.machine(),'systemd':run('systemctl','--version').stdout.splitlines()[0],'external_network_down':True,'guests_or_gpio_used':False,'cases':[]}
stop()
run('systemctl','daemon-reload')
run('systemctl','start',unit)
state=wait_state('active')
for _ in range(50):
    probe=run('curl','--fail','--silent','--cacert','/etc/pidp11-webdesktop/certificate.pem','https://127.0.0.1:8445/',check=False)
    if probe.returncode==0:break
    time.sleep(.1)
assert probe.returncode==0,probe.stderr
cg=pathlib.Path('/sys/fs/cgroup'+state['ControlGroup'])
assert (cg/'memory.max').read_text().strip()=='100663296'
assert (cg/'memory.swap.max').read_text().strip()=='0'
assert state['NoNewPrivileges']=='yes' and state['PrivateDevices']=='yes' and state['ProtectControlGroups']=='yes' and state['ProtectSystem']=='strict',state
results['idle_memory_current_bytes']=int((cg/'memory.current').read_text())
results['cases'].append({'name':'protected detached startup','passed':True,'properties':state,'kernel_memory_max':100663296,'kernel_swap_max':0})
stop()
# A local controller disabled by a parent models missing enforcement; the VM's
# outer 1 GiB safety cap remains. This is not a kernel boot-flag reproduction.
slice_path=pathlib.Path('/etc/systemd/system/m571-nomemory.slice')
slice_path.write_text('[Slice]\nDisableControllers=memory\n')
case_file=overrides/'zzzzz-m571-case.conf'
for name,override in [
 ('missing local controller','[Service]\nSlice=m571-nomemory.slice\n'),
 ('unlimited memory','[Service]\nMemoryMax=infinity\n'),
 ('oversized limit','[Service]\nMemoryMax=128M\n'),
 ('unlimited swap','[Service]\nMemorySwapMax=infinity\n'),
]:
    case_file.write_text(override);run('systemctl','daemon-reload')
    run('systemctl','start',unit,check=False);state=wait_state('failed');no_listener()
    assert state['ExecMainStatus']=='1' and state['Restart']=='no',state
    log=run('journalctl','-u',unit,'-n','8','--no-pager','-o','cat').stdout
    assert 'memory containment unavailable' in log,log
    results['cases'].append({'name':name,'passed':True,'properties':state,'listener_absent':True})
    stop()
case_file.unlink();run('systemctl','daemon-reload')
run('systemctl','start',unit);wait_state('active');stop()
results['protected_restart_started']=True
# An independent sentinel must survive each bounded pressure fixture.
run('systemd-run','--unit=m571-sentinel','--property=MemoryMax=8M','/bin/sleep','120')
try:
    soft=run('systemd-run','--unit=m571-soft','--wait','--pipe','--property=MemoryMax=256M','--property=MemorySwapMax=0','--setenv=PIDP11_ISOLATED_LAB=1','--setenv=GOMEMLIMIT=72MiB','/tmp/memoryprobe','-mib','112')
    record=json.loads(soft.stdout)
    assert record['heap_alloc']>record['go_soft_limit']
    results['soft_limit_exceeded_by_live_heap']=record
    rss=run('systemd-run','--unit=m571-rss','--wait','--pipe','--property=MemoryMax=256M','--property=MemorySwapMax=0','--property=LimitRSS=96M','--setenv=PIDP11_ISOLATED_LAB=1','/tmp/memoryprobe','-mib','112')
    results['limit_rss_did_not_cap_live_heap']=json.loads(rss.stdout)
    address=run('systemd-run','--unit=m571-address','--wait','--pipe','--property=MemoryMax=256M','--property=LimitAS=96M','--setenv=PIDP11_ISOLATED_LAB=1','/tmp/memoryprobe','-mib','1',check=False)
    assert address.returncode!=0 and 'failed to reserve' in address.stderr,address.stderr
    results['limit_address_space_prevented_go_startup']=True
    hard=run('systemd-run','--unit=m571-hard','--wait','--pipe','--property=MemoryMax=96M','--property=MemorySwapMax=0','--setenv=PIDP11_ISOLATED_LAB=1','--setenv=GOMEMLIMIT=72MiB','/tmp/memoryprobe','-mib','128',check=False)
    state=props('m571-hard.service')
    assert hard.returncode!=0 and state['Result']=='oom-kill',state
    assert props('m571-sentinel.service')['ActiveState']=='active'
    results['hard_limit_fixture']={'passed':True,'properties':state,'independent_sentinel_alive':True}
finally:
    for name in ['m571-sentinel','m571-soft','m571-hard','m571-rss','m571-address']:
        run('systemctl','stop',name,check=False)
        run('systemctl','reset-failed',name,check=False)
stop();no_listener()
results['companion_stopped']=True
print(json.dumps(results,indent=2))
