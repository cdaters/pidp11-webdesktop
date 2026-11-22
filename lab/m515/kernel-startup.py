"""Owned QEMU ARM64 guest only: compare exact binaries, retain native evidence.

The caller boots a separate Debian kernel with no network device. Only the
private /work 9p share and this disposable root disk are written. No guest OS
media, emulator or production service is present.
"""
import hashlib
import json
import os
from pathlib import Path
import platform
import resource
import shutil
import signal
import subprocess
import time


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    assert platform.machine() == 'aarch64'
    assert 'orbstack' not in platform.release()
    assert set(os.listdir('/sys/class/net')) == {'lo'}
    work = Path('/work/kernel-evidence')
    work.mkdir(mode=0o700)
    native = Path('/root/m515-native')
    native.mkdir(mode=0o700)
    group = Path('/sys/fs/cgroup/m515')
    Path('/sys/fs/cgroup/cgroup.subtree_control').write_text('+memory')
    group.mkdir()
    (group/'memory.max').write_text('100663296')
    (group/'memory.swap.max').write_text('0')

    def child():
        # The limit applies only to this owned diagnostic process and descendants.
        (group/'cgroup.procs').write_text(str(os.getpid()))
        resource.setrlimit(resource.RLIMIT_CORE, (64*1024*1024, 64*1024*1024))
        os.umask(0o077)

    report = {'kernel': platform.release(), 'machine': platform.machine(),
              'cpuEmulation': 'QEMU TCG cortex-a72', 'cases': [],
              'mounts': Path('/proc/mounts').read_text(),
              'limits': Path('/proc/self/limits').read_text(),
              'corePattern': Path('/proc/sys/kernel/core_pattern').read_text().strip(),
              'childCoreLimitBytes': 64*1024*1024,
              'memoryMax': (group/'memory.max').read_text().strip(),
              'memorySwapMax': (group/'memory.swap.max').read_text().strip()}

    def save():
        (work/'result.json').write_text(json.dumps(report, indent=2)+'\n')

    for version in ['original', 'current']:
        source = Path('/work/kernel-input')/version
        for label, folder in [('native-ext4', native), ('shared-9p', work)]:
            for index in range(8):
                executable = folder/f'{version}-{index}'
                shutil.copyfile(source, executable)
                executable.chmod(0o700)
                destination = folder/f'{version}-config-{index}'
                started = time.monotonic()
                run = subprocess.run([str(executable), 'provision', '-directory', str(destination),
                    '-listen', '127.0.0.1:8447', '-origin', 'https://127.0.0.1:8447'],
                    preexec_fn=child, capture_output=True, timeout=60, cwd=native,
                    env={**os.environ, 'GOTRACEBACK': 'system'})
                (work/f'{version}-{label}-{index}.stderr').write_bytes(run.stderr)
                report['cases'].append({'version':version,'filesystem':label,'index':index,
                    'sha256':sha(executable),'sourceMatches':sha(source)==sha(executable),
                    'mode':oct(executable.stat().st_mode & 0o777),'returncode':run.returncode,
                    'signal':-run.returncode if run.returncode<0 else None,
                    'milliseconds':round((time.monotonic()-started)*1000,3)})
                save()
                if run.returncode or sha(source)!=sha(executable):
                    raise RuntimeError('Unexpected result; preserve evidence without retry')
        traced = subprocess.run(['strace','-f','-o',str(work/f'{version}.strace'),
            '-e','trace=process,memory,file,write','-e','raw=write',str(native/f'{version}-0'),
            'provision','-directory',str(native/f'{version}-traced'),'-listen','127.0.0.1:8447',
            '-origin','https://127.0.0.1:8447'],capture_output=True,preexec_fn=child,timeout=60)
        report[version+'TraceExit']=traced.returncode
        save()
        assert traced.returncode==0
    # Refusal controls change only a copied executable and an owned mount.
    noexec = native/'no-permission'
    shutil.copyfile(Path('/work/kernel-input/current'), noexec)
    noexec.chmod(0o600)
    try:
        subprocess.run([str(noexec),'check'],check=True)
        raise AssertionError('Execution permission unexpectedly granted')
    except PermissionError as error:
        report['missingExecutePermissionErrno']=error.errno
    report['memoryEvents']=(group/'memory.events').read_text()
    report['coreFiles']=[p.name for p in native.glob('core*')]
    report['complete']=True
    save()
    print('M515_DIAGNOSTIC_COMPLETE',flush=True)


if __name__ == '__main__':
    main()
