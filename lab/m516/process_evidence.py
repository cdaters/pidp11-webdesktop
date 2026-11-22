"""Bounded native-child evidence for disposable Linux diagnostics only.

No retry or environment deletion. The caller owns the executable and output
parent, and supplies no guest or production paths. stdout/stderr and process
mappings are private artifacts. A timeout signals only this child's new group.
"""
import hashlib
import json
import os
from pathlib import Path
import platform
import resource
import signal
import time


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def capture(command, directory, *, timeout=10, cgroup=None):
    """Run once, retaining native wait status separately from shell conventions."""
    if platform.system() != 'Linux' or not 0 < timeout <= 60:
        raise ValueError('Disposable Linux and a 0–60 second deadline required')
    directory = Path(directory)
    directory.mkdir(mode=0o700)  # Refuse replacement of an earlier attempt.
    executable = Path(command[0]).resolve(strict=True)
    report = {
        'kernel': platform.release(), 'machine': platform.machine(),
        'executableSHA256Before': digest(executable),
        'executableMode': oct(executable.stat().st_mode & 0o7777),
        'executableBytes': executable.stat().st_size,
        'timeoutSeconds': timeout, 'events': [], 'automaticRetry': False,
        'coreLimitBytes': 0, 'outputFileLimitBytes': 1024 * 1024,
    }
    (directory / 'mountinfo.txt').write_text(Path('/proc/self/mountinfo').read_text())
    (directory / 'parent-limits.txt').write_text(Path('/proc/self/limits').read_text())
    (directory / 'core-pattern.txt').write_text(Path('/proc/sys/kernel/core_pattern').read_text())
    if cgroup:
        cgroup = Path(cgroup)
        report['memoryMax'] = (cgroup / 'memory.max').read_text().strip()
        report['memorySwapMax'] = (cgroup / 'memory.swap.max').read_text().strip()
        assert report['memoryMax'] == '100663296' and report['memorySwapMax'] == '0'
        report['memoryEventsBefore'] = (cgroup / 'memory.events').read_text()

    def event(name, **values):
        report['events'].append({'event': name, 'unixNS': time.time_ns(),
                                 'monotonicNS': time.monotonic_ns(), **values})
        (directory / 'result.json').write_text(json.dumps(report, indent=2) + '\n')

    event('prepared')
    read_error, write_error = os.pipe2(os.O_CLOEXEC)
    pid = os.fork()
    if pid == 0:
        os.close(read_error)
        try:
            os.setsid()
            os.umask(0o077)
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
            resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))
            if cgroup:
                (cgroup / 'cgroup.procs').write_text(str(os.getpid()))
            for number, name in [(1, 'stdout.private'), (2, 'stderr.private')]:
                descriptor = os.open(directory / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                os.dup2(descriptor, number)
                os.close(descriptor)
            os.execv(str(executable), command)
        except BaseException as error:
            os.write(write_error, json.dumps({'type': type(error).__name__,
                                              'errno': getattr(error, 'errno', None)}).encode())
            os._exit(126)
    os.close(write_error)
    event('forked', pid=pid)
    deadline = time.monotonic() + timeout
    samples = 0
    reaped = False
    try:
        while True:
            waited, status, usage = os.wait4(pid, os.WNOHANG)
            if waited:
                reaped = True
                break
            if samples < 8:
                for name in ['maps', 'status', 'limits', 'cgroup']:
                    try:
                        (directory / f'{samples}-{name}.private').write_text(Path(f'/proc/{pid}/{name}').read_text())
                    except (FileNotFoundError, ProcessLookupError):
                        pass  # Very short processes can exit between snapshots.
                samples += 1
            if time.monotonic() >= deadline:
                event('deadline-kill', signal=signal.SIGKILL)
                try:
                    os.killpg(pid, signal.SIGKILL)
                except ProcessLookupError:
                    # The child may have exited or not completed setsid yet.
                    try:
                        os.kill(pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                _, status, usage = os.wait4(pid, 0)
                reaped = True
                break
            time.sleep(0.01)
        report.update({
            'nativeWaitStatus': status,
            'exited': os.WIFEXITED(status),
            'exitCode': os.WEXITSTATUS(status) if os.WIFEXITED(status) else None,
            'signal': os.WTERMSIG(status) if os.WIFSIGNALED(status) else None,
            'coreFlag': os.WCOREDUMP(status),
            'maxRSSKiB': usage.ru_maxrss,
            'userSeconds': usage.ru_utime, 'systemSeconds': usage.ru_stime,
            'mappingSamples': samples,
        })
        failure = os.read(read_error, 4096)
        report['preExecFailure'] = json.loads(failure) if failure else None
        report['executableSHA256After'] = digest(executable)
        if cgroup:
            report['memoryEventsAfter'] = (cgroup / 'memory.events').read_text()
        event('reaped', childReaped=True)
        return report
    finally:
        os.close(read_error)
        if not reaped:
            # Preserve diagnostics while preventing an owned child being orphaned.
            try:
                os.killpg(pid, signal.SIGKILL)
            except ProcessLookupError:
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            os.wait4(pid, 0)
            event('exception-cleanup', childReaped=True)
