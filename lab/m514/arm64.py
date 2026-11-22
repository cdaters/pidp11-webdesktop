"""Offline disposable pidp11-m514 VM only; no original installation or guest.

Packages must be copied to /root/m514/package-{old,new}. Diagnostics are private;
the result JSON contains only statuses, bounds and file identities, never tokens.
"""
import hashlib
import json
import os
from pathlib import Path
import platform
import signal
import subprocess
import time

ROOT = Path('/root/m514')
UNIT = 'pidp11-webdesktop.service'
EXECUTABLE = '/opt/pidp11-webdesktop/current/webdesktop-service'


def run(*args, check=True):
    return subprocess.run(args, capture_output=True, text=True, timeout=30, check=check)


def wait_status():
    for _ in range(30):
        result = run(EXECUTABLE, 'status', check=False)
        if result.returncode == 0:
            status = json.loads(result.stdout)
            assert all(line['state'] == 'detached' for line in status['lines'])
            return status
        time.sleep(.1)
    raise RuntimeError('Detached service did not become ready')


def main():
    assert platform.machine() == 'aarch64' and platform.node() == 'pidp11-m514'
    assert Path('/sys/class/net/eth0/operstate').read_text().strip() == 'down'
    assert not Path('/opt/pidp11').exists()
    report = {'architecture': platform.machine(), 'kernel': platform.release(), 'physicalPi': False}
    for version in ['old', 'new']:
        directory = ROOT / ('package-' + version)
        subprocess.run(['sha256sum', '-c', 'PACKAGE_SHA256SUMS'], cwd=directory, check=True, stdout=subprocess.DEVNULL)
    original = str(ROOT / 'package-old/webdesktop-service')
    outcomes = []
    for index in range(12):
        result = run(original, 'provision', '-directory', str(ROOT / f'native-{index}'), '-listen', '127.0.0.1:8447', '-origin', 'https://127.0.0.1:8447', check=False)
        outcomes.append(result.returncode)
        if result.returncode: break
    report['originalNativeProvisionExits'] = outcomes
    assert outcomes == [0] * 12
    trace = run('strace', '-f', '-o', str(ROOT / 'startup.strace'), '-e', 'trace=process,memory,file,write', '-e', 'raw=write', original,
                'provision', '-directory', str(ROOT / 'traced'), '-listen', '127.0.0.1:8447', '-origin', 'https://127.0.0.1:8447')
    report['straceExit'] = trace.returncode
    debug = run('gdb', '--batch', '-ex', 'set pagination off', '-ex', 'run', '--args', original,
                'provision', '-directory', str(ROOT / 'debugged'), '-listen', '127.0.0.1:8447', '-origin', 'https://127.0.0.1:8447')
    (ROOT / 'startup.gdb').write_text(debug.stdout + debug.stderr)
    assert 'exited normally' in debug.stdout
    report['gdbExitedNormally'] = True
    report['nativeFilesystem'] = run('stat', '-f', '-c', '%T', str(ROOT)).stdout.strip()

    new = str(ROOT / 'package-new')
    preflight = run('sh', new + '/preflight.sh', check=False)
    assert preflight.returncode != 0 and 'Expected readable/executable original file missing' in preflight.stdout + preflight.stderr
    report['missingOriginalInstallationRefused'] = True
    run('sh', new + '/install.sh', new, 'm514-new')
    assert run('systemctl', 'is-active', UNIT, check=False).stdout.strip() == 'inactive'
    assert run('systemctl', 'is-enabled', UNIT, check=False).stdout.strip() == 'disabled'
    run('sh', new + '/configure.sh', '127.0.0.1:8447', 'https://127.0.0.1:8447', '127.0.0.1:40100')
    config = Path('/etc/pidp11-webdesktop/config.json')
    before = hashlib.sha256(config.read_bytes()).hexdigest()
    assert run('sh', new + '/configure.sh', '127.0.0.1:8447', 'https://127.0.0.1:8447', '127.0.0.1:40100', check=False).returncode != 0
    assert hashlib.sha256(config.read_bytes()).hexdigest() == before

    # Restore the distributed protections over OrbStack's type-wide overrides.
    override = Path('/etc/systemd/system/' + UNIT + '.d')
    override.mkdir()
    keys = ('NoNewPrivileges=', 'PrivateTmp=', 'PrivateDevices=', 'Protect', 'Restrict', 'CapabilityBoundingSet=', 'AmbientCapabilities=', 'InaccessiblePaths=')
    guards = '\n'.join(line for line in (ROOT / 'package-new/pidp11-webdesktop.service').read_text().splitlines() if line.startswith(keys))
    (override / 'zzzz-m514-hardening.conf').write_text('[Service]\n' + guards + '\n')
    run('systemctl', 'daemon-reload')
    run('systemctl', 'start', UNIT)
    first = wait_status()
    properties = ['MemoryMax', 'MemorySwapMax', 'NoNewPrivileges', 'PrivateDevices', 'ProtectSystem', 'ProtectHome', 'Restart']
    report['protections'] = {key: run('systemctl', 'show', UNIT, '-p', key, '--value').stdout.strip() for key in properties}
    assert report['protections'] == {'MemoryMax': '100663296', 'MemorySwapMax': '0', 'NoNewPrivileges': 'yes', 'PrivateDevices': 'yes', 'ProtectSystem': 'strict', 'ProtectHome': 'yes', 'Restart': 'no'}
    pid = int(run('systemctl', 'show', UNIT, '-p', 'MainPID', '--value').stdout)
    report['idleStatus'] = [line for line in Path(f'/proc/{pid}/status').read_text().splitlines() if line.startswith(('VmRSS:', 'Threads:'))]
    os.kill(pid, signal.SIGKILL)
    time.sleep(.5)
    assert run('systemctl', 'is-active', UNIT, check=False).stdout.strip() == 'failed'
    assert run('systemctl', 'show', UNIT, '-p', 'NRestarts', '--value').stdout.strip() == '0'
    run('systemctl', 'start', UNIT)
    second = wait_status()
    assert second['instance'] != first['instance']
    old = first['lines'][0]
    assert run(EXECUTABLE, 'attach', '-instance', first['instance'], '-id', old['id'], '-revision', str(old['revision']), '-guest-and-line-verified', check=False).returncode != 0
    report['killNoRestartFreshDetachedOldApprovalRefused'] = True

    run('systemctl', 'stop', UNIT)
    run('sh', new + '/install.sh', str(ROOT / 'package-old'), 'm513-old')
    run('systemctl', 'start', UNIT)
    wait_status()
    run('systemctl', 'stop', UNIT)
    run('sh', new + '/select-release.sh', 'm514-new')
    run('systemctl', 'start', UNIT)
    wait_status()
    report['compatibleConfigRollbackAndReturn'] = True

    run('systemctl', 'stop', UNIT)
    slice_file = Path('/etc/systemd/system/m514-nomemory.slice')
    memory_override = override / 'zzzzz-memory.conf'
    slice_file.write_text('[Slice]\nDisableControllers=memory\n')
    memory_override.write_text('[Service]\nSlice=m514-nomemory.slice\n')
    try:
        run('systemctl', 'daemon-reload')
        run('systemctl', 'start', UNIT, check=False)
        for _ in range(30):
            if run('systemctl', 'is-active', UNIT, check=False).stdout.strip() == 'failed': break
            time.sleep(.1)
        journal = run('journalctl', '-u', UNIT, '-n', '20', '--no-pager').stdout
        (ROOT / 'memory-refusal.log').write_text(journal)
        assert 'memory containment unavailable' in journal
        assert ':8447' not in run('ss', '-lnt').stdout
        report['missingMemoryControllerRefusedBeforeListener'] = True
    finally:
        run('systemctl', 'stop', UNIT, check=False)
        memory_override.unlink()
        run('systemctl', 'stop', 'm514-nomemory.slice', check=False)
        slice_file.unlink()
        run('systemctl', 'daemon-reload')
        run('systemctl', 'reset-failed', UNIT, check=False)
    run('systemctl', 'start', UNIT)
    wait_status()
    run('systemctl', 'stop', UNIT)
    report['restoredProtectedDetachedStartup'] = True
    (ROOT / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
