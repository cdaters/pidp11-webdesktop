"""Four provisions and one traced provision in the owned, offline ARM64 VM.

This is a bounded qualification of evidence capture, not a stress campaign.
Stop at any unexpected result and retain every private directory for inspection.
"""
import json
import os
from pathlib import Path
import platform
import shutil
from process_evidence import capture, digest

assert platform.machine() == 'aarch64'
assert 'orbstack' not in platform.release()
assert set(os.listdir('/sys/class/net')) == {'lo'}
os.umask(0o077)
work = Path('/work/kernel-evidence')
work.mkdir(mode=0o700)
native = Path('/root/m516')
native.mkdir(mode=0o700)
Path('/sys/fs/cgroup/cgroup.subtree_control').write_text('+memory')
group = Path('/sys/fs/cgroup/m516')
group.mkdir()
(group / 'memory.max').write_text('100663296')
(group / 'memory.swap.max').write_text('0')
results = []
for version in ['original', 'current']:
    source = Path('/work/kernel-input') / version
    for filesystem, folder in [('native-ext4', native), ('shared-9p', work)]:
        executable = folder / version
        shutil.copyfile(source, executable)
        executable.chmod(0o700)
        destination = folder / (version + '-config')
        result = capture([str(executable), 'provision', '-directory', str(destination),
                          '-listen', '127.0.0.1:8447', '-origin', 'https://127.0.0.1:8447'],
                         work / (version + '-' + filesystem), timeout=60, cgroup=group)
        result.update({'version': version, 'filesystem': filesystem,
                       'sourceMatches': digest(source) == digest(executable)})
        results.append(result)
        (work / 'provisions.json').write_text(json.dumps(results, indent=2) + '\n')
        assert result['exitCode'] == 0 and result['signal'] is None and result['sourceMatches']
        assert result['executableSHA256Before'] == result['executableSHA256After']
# Separate trace: the native wait status here belongs to strace, whose log records
# its child. Never mislabel a tracer's status as the unwrapped Go process status.
trace = capture(['/usr/bin/strace', '-f', '-o', str(work / 'original.strace'),
                 '-e', 'trace=process,memory,file,write', '-e', 'raw=write',
                 str(native / 'original'), 'provision', '-directory', str(native / 'traced-config'),
                 '-listen', '127.0.0.1:8447', '-origin', 'https://127.0.0.1:8447'],
                work / 'tracer', timeout=60, cgroup=group)
assert trace['exitCode'] == 0
print('M516_FOUR_PROVISIONS_AND_TRACE_COMPLETE', flush=True)
