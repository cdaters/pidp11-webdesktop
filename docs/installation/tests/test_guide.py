#!/usr/bin/env python3
"""Execute only documentation helpers in disposable fixtures; never access a device/Pi."""
from pathlib import Path
import contextlib
import hashlib
import io
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
GUIDE = HERE.parent / 'PIDP11-TRIXIE-HEADLESS-GUIDE.md'
TEXT = GUIDE.read_text()
SHELL = re.findall(r'^```bash\n(.*?)^```', TEXT, re.M | re.S)
PYTHON = [body for block in SHELL for body in re.findall(r"python3 - <<'PY'\n(.*?)^PY$", block, re.M | re.S)]

def code_with(needle):
    found = [body for body in PYTHON if needle in body]
    assert len(found) == 1, (needle, len(found))
    return found[0]

PRESERVE = code_with('Complete preflight')
CONFIG = code_with('diff = []')
VERIFY = code_with('resource_name =')
CAPTURE = code_with("target = r / 'review-resource-sha256.json'")
BACKUP = next(block for block in SHELL if 'backup_mode=stream' in block)

class GuideTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='pidp11-guide-fixture-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.work = self.root / 'pidp11-work'
        self.base = self.root / 'checkout'
        for directory in (self.work / 'pristine/systems/rt11', self.work / 'resources', self.base / 'systems/idled'):
            directory.mkdir(parents=True)
        (self.work / 'pristine/systems/rt11/boot.ini').write_text('set realcons enabled\n')
        (self.work / 'pristine/systems/rt11/disk.fixture').write_bytes(b'fixture bytes only\n')
        (self.base / 'systems/idled/boot.ini').write_text('original IDLED\n')

    def run_python(self, body, copy_failure=False, corrupt_copy=False, rename_failure=False):
        body = body.replace('Path.home()', f'Path({str(self.root)!r})')
        body = body.replace("Path('/opt/pidp11')", f'Path({str(self.base)!r})')
        original_rename = Path.rename
        def copy(command, check):
            self.assertEqual(command[:3], ['cp', '-a', '--sparse=always'])
            source, destination = Path(command[3]), Path(command[4])
            self.assertTrue(source.is_relative_to(self.root))
            self.assertTrue(destination.is_relative_to(self.root))
            if copy_failure:
                (destination / 'partial.fixture').write_text('partial')
                raise subprocess.CalledProcessError(17, command)
            shutil.copytree(source, destination, dirs_exist_ok=True, copy_function=shutil.copy2)
            if corrupt_copy:
                (destination / 'rt11/disk.fixture').write_text('corrupt fixture')
        def rename(path, target):
            if rename_failure and path.name == 'systems-working':
                raise OSError('injected second rename failure')
            return original_rename(path, target)
        previous_umask = os.umask(0o022)
        try:
            with contextlib.redirect_stdout(io.StringIO()), patch('subprocess.run', copy), patch.object(Path, 'rename', rename):
                exec(compile(body, str(GUIDE), 'exec'), {})
        finally:
            os.umask(previous_umask)

    def snapshot(self):
        result = {}
        for path in self.root.rglob('*'):
            mode = path.lstat().st_mode
            value = os.readlink(path) if path.is_symlink() else path.read_bytes() if stat.S_ISREG(mode) else None
            result[str(path.relative_to(self.root))] = (mode, value)
        return result

    def assert_preflight_failure(self):
        before = self.snapshot()
        with self.assertRaises(SystemExit):
            self.run_python(PRESERVE)
        self.assertEqual(before, self.snapshot())

    def test_all_bash_examples_parse_without_execution(self):
        for index, block in enumerate(SHELL):
            result = subprocess.run(['bash', '-n'], input=block, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, f'block {index}: {result.stderr}')

    def test_all_python_examples_compile_without_execution(self):
        for index, body in enumerate(PYTHON):
            compile(body, f'guide-python-{index}', 'exec')

    def test_preservation_success(self):
        self.run_python(PRESERVE)
        source = self.work / 'pristine/systems/rt11/disk.fixture'
        copy = self.base / 'systems/rt11/disk.fixture'
        self.assertEqual(source.read_bytes(), copy.read_bytes())
        self.assertFalse(os.path.samefile(source, copy))
        self.assertEqual(stat.S_IMODE(source.stat().st_mode), 0o444)
        self.assertEqual(stat.S_IMODE(copy.stat().st_mode), 0o644)
        self.assertEqual((self.base / 'systems-upstream-original/idled/boot.ini').read_text(), 'original IDLED\n')
        data = json.loads((self.work / 'resources/pristine-manifest.json').read_text())
        self.assertEqual(data['systems/rt11/disk.fixture']['sha256'], hashlib.sha256(source.read_bytes()).hexdigest())

    def test_copy_failure_preserves_live_pristine_manifest(self):
        before = self.snapshot()
        with self.assertRaises(subprocess.CalledProcessError):
            self.run_python(PRESERVE, copy_failure=True)
        after = {k: v for k, v in self.snapshot().items() if not k.startswith('checkout/systems-working')}
        self.assertEqual(before, after)

    def test_copy_mismatch_prevents_install(self):
        with self.assertRaises(SystemExit):
            self.run_python(PRESERVE, corrupt_copy=True)
        self.assertFalse((self.work / 'resources/pristine-manifest.json').exists())
        self.assertTrue((self.base / 'systems/idled/boot.ini').exists())
        self.assertFalse((self.base / 'systems-upstream-original').exists())
        self.assertEqual(stat.S_IMODE((self.work / 'pristine/systems/rt11/disk.fixture').stat().st_mode), 0o644)

    def test_second_rename_failure_restores_original_name(self):
        with self.assertRaises(OSError):
            self.run_python(PRESERVE, rename_failure=True)
        self.assertTrue((self.base / 'systems/idled/boot.ini').exists())
        self.assertTrue((self.base / 'systems-working/rt11/disk.fixture').exists())
        self.assertFalse((self.base / 'systems-upstream-original').exists())

    def configure_fixture(self):
        (self.base / 'systems-upstream-original/idled').mkdir(parents=True)
        (self.base / 'systems-upstream-original/idled/boot.ini').write_text('set realcons enabled\n')
        examples = {
            'rt11': 'set realcons enabled\n SET  REALCONS HOST=localhost\n\tset\trealcons connected\nset vt enable\n',
            'blinky': 'do PDP-11xx.ini 70 4m\n',
            'indirect': '   DO nested.ini\n',
            'call': 'CALL SUBROUTINE\n',
            'at': '@nested.ini\n',
        }
        for name, text in examples.items():
            directory = self.base / 'systems' / name
            directory.mkdir()
            (directory / 'boot.ini').write_text(text)
        child = self.base / 'systems/blinky/PDP-11xx.ini'
        child.write_text('set  realcons connected\nset realcons enabled\n')
        (self.base / 'systems/selections').write_text('0000 idled\n0003 rt11\n0001 blinky\n')
        return child

    def test_config_whitespace_and_blinky_nested_include(self):
        child = self.configure_fixture()
        before = child.read_bytes()
        self.run_python(CONFIG)
        self.assertEqual(before, child.read_bytes())
        for name in ('blinky', 'indirect', 'call', 'at'):
            self.assertFalse((self.base / 'systems' / name / 'boot-headless.ini').exists())
        headless = (self.base / 'systems/rt11/boot-headless.ini').read_text()
        self.assertEqual(len(re.findall(r'^; standalone:', headless, re.M)), 3)
        self.assertFalse(re.search(r'^\s*set\s+realcons\b', headless, re.M | re.I))
        self.assertIn('set realcons enabled', (self.base / 'systems/rt11/boot.ini').read_text())

    def test_config_existing_output_preflight(self):
        self.configure_fixture()
        (self.base / 'systems/blinky/boot-headless.ini').write_text('unsafe previous partial conversion')
        before = self.snapshot()
        with self.assertRaises(SystemExit):
            self.run_python(CONFIG)
        self.assertEqual(before, self.snapshot())

    def manifest_fixture(self):
        self.run_python(PRESERVE)
        (self.work / 'resources/download.fixture').write_bytes(b'original resource')
        self.run_python(CAPTURE)

    def test_manifests_pass_and_capture_refuses_overwrite(self):
        self.manifest_fixture()
        self.run_python(VERIFY)
        before = self.snapshot()
        with self.assertRaises(SystemExit):
            self.run_python(CAPTURE)
        self.assertEqual(before, self.snapshot())

    def backup_fixture(self, mode='stream', failure=''):
        zstd = shutil.which('zstd')
        if not zstd:
            self.skipTest('zstd unavailable: backup pipeline fixtures require real compression')
        payload = self.root / 'source.fixture'
        payload.write_bytes(bytes(range(256)) * 128)
        mockbin = self.root / 'mockbin'
        mockbin.mkdir()
        # No actual device path is passed to any real program. Only these fixture wrappers see disk999.
        wrappers = {
            'diskutil': "import os,sys\nassert sys.argv[1] in ('info','unmountDisk','eject')\nassert sys.argv[2]=='/dev/disk999'\nif os.environ['FAILURE']==sys.argv[1]: sys.exit(19)\nif sys.argv[1]=='eject': open(os.environ['EJECT_MARKER'],'w').write('ejected fixture')\nprint('fixture disk only')\n",
            'sudo': "import os,sys\nif sys.argv[1:] == ['-v']: sys.exit(0)\nassert sys.argv[1] in ('dd','shasum')\nos.execvp(sys.argv[1],sys.argv[1:])\n",
            'dd': "import os,sys\nassert sys.argv[1:]==['if='+os.environ['PAYLOAD'],'bs=4m']\ndata=open(os.environ['PAYLOAD'],'rb').read()\nsys.stdout.buffer.write(data[:100] if os.environ['FAILURE']=='producer' else data)\nsys.stdout.flush()\nsys.exit(17 if os.environ['FAILURE']=='producer' else 0)\n",
            'zstd': "import os,sys\nf=os.environ['FAILURE']\nif (f=='compress' and sys.argv[1]=='-3') or (f=='integrity' and sys.argv[1]=='-t') or (f=='decompress' and sys.argv[1]=='-dc'): sys.exit(18)\nos.execv("+repr(zstd)+",["+repr(zstd)+"]+sys.argv[1:])\n",
            'shasum': "import os,sys\nif os.environ['FAILURE']=='hash' and sys.argv[-1]==os.environ['PAYLOAD']:\n print('0'*64+'  fixture');sys.exit(0)\nos.execv("+repr(shutil.which('shasum'))+",["+repr(shutil.which('shasum'))+"]+sys.argv[1:])\n",
        }
        for name, body in wrappers.items():
            executable = mockbin / name
            executable.write_text('#!' + sys.executable + '\n' + body)
            executable.chmod(0o700)
        block = BACKUP.replace('card_disk=/dev/diskN', 'card_disk=/dev/disk999')
        block = block.replace('expected_bytes=REPLACE_WITH_BYTES', 'expected_bytes=' + str(payload.stat().st_size + (1 if failure == 'size' else 0)))
        block = block.replace('backup_mode=stream', 'backup_mode=' + mode)
        block = block.replace('raw_card="/dev/r${card_disk#/dev/}"', 'raw_card="$PAYLOAD"')
        if sys.platform != 'darwin':
            block = block.replace("stat -f '%z'", "stat -c '%s'")
        env = dict(os.environ, HOME=str(self.root), PATH=str(mockbin) + os.pathsep + os.environ['PATH'], FAILURE=failure,
                   PAYLOAD=str(payload), EJECT_MARKER=str(self.root / 'ejected.fixture'))
        result = subprocess.run(['bash'], input=block, text=True, capture_output=True, env=env, timeout=20)
        folders = list(self.root.glob('pidp11-private-backup-*'))
        self.assertEqual(len(folders), 1)
        directory = folders[0]
        if failure:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertFalse((directory / 'verification.txt').exists())
            self.assertFalse((self.root / 'ejected.fixture').exists())
            self.assertNotIn('Verified backup saved privately', result.stdout)
        else:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((directory / 'verification.txt').exists())
            self.assertTrue((self.root / 'ejected.fixture').exists())
            self.assertEqual(stat.S_IMODE(directory.stat().st_mode), 0o700)
            for file in directory.iterdir():
                self.assertEqual(stat.S_IMODE(file.stat().st_mode), 0o600)
            raw = subprocess.run([zstd, '-dc', str(directory / 'pidp11-full.img.zst')], capture_output=True, check=True).stdout
            self.assertEqual(raw, payload.read_bytes())

# Each scenario receives an independent directory and named test result.
for destination in ('stage', 'original', 'manifest'):
    for kind in ('directory', 'file', 'dangling_symlink'):
        def collision(self, destination=destination, kind=kind):
            path = {'stage': self.base / 'systems-working', 'original': self.base / 'systems-upstream-original',
                    'manifest': self.work / 'resources/pristine-manifest.json'}[destination]
            if kind == 'directory': path.mkdir()
            elif kind == 'file': path.write_text('keep me')
            else: path.symlink_to(self.root / 'missing-target')
            self.assert_preflight_failure()
        setattr(GuideTests, f'test_preflight_{destination}_{kind}', collision)

for kind in ('missing_source', 'linked_source', 'missing_config', 'linked_config', 'hardlink', 'fifo', 'symlink'):
    def bad_source(self, kind=kind):
        source = self.work / 'pristine/systems'
        if kind in ('missing_source', 'linked_source'):
            source.rename(self.work / 'saved-systems')
            if kind == 'linked_source': source.symlink_to(self.work / 'saved-systems', target_is_directory=True)
        elif kind == 'missing_config': (source / 'rt11/boot.ini').unlink()
        elif kind == 'linked_config':
            (source / 'rt11/boot.ini').unlink()
            (source / 'rt11/boot.ini').symlink_to(self.root / 'missing')
        elif kind == 'hardlink': os.link(source / 'rt11/disk.fixture', self.root / 'outside-hardlink')
        elif kind == 'fifo': os.mkfifo(source / 'special.fixture')
        elif kind == 'symlink': (source / 'linked.fixture').symlink_to(self.root / 'missing')
        self.assert_preflight_failure()
    setattr(GuideTests, f'test_preflight_{kind}', bad_source)

for kind in ('changed', 'missing', 'extra', 'linked', 'resource_changed', 'resource_missing', 'resource_traversal'):
    def bad_manifest(self, kind=kind):
        self.manifest_fixture()
        disk = self.work / 'pristine/systems/rt11/disk.fixture'
        disk.chmod(0o644)
        if kind == 'changed': disk.write_bytes(b'changed')
        elif kind == 'missing': disk.unlink()
        elif kind == 'extra': (disk.parent / 'extra').write_text('extra')
        elif kind == 'linked':
            disk.unlink(); disk.symlink_to(self.root / 'missing')
        elif kind == 'resource_changed': (self.work / 'resources/download.fixture').write_text('changed')
        elif kind == 'resource_missing': (self.work / 'resources/download.fixture').unlink()
        elif kind == 'resource_traversal':
            (self.work / 'resources/review-resource-sha256.json').write_text(json.dumps({'../outside': '0'*64}))
        before = self.snapshot()
        with self.assertRaises(SystemExit): self.run_python(VERIFY)
        self.assertEqual(before, self.snapshot())
    setattr(GuideTests, f'test_manifest_rejects_{kind}', bad_manifest)

for mode in ('raw', 'stream'):
    for failure in ('', 'producer', 'compress', 'integrity', 'decompress', 'size', 'hash', 'unmountDisk'):
        def backup(self, mode=mode, failure=failure): self.backup_fixture(mode, failure)
        setattr(GuideTests, f'test_backup_{mode}_{failure or "success"}', backup)

if __name__ == '__main__':
    unittest.main(verbosity=2)
