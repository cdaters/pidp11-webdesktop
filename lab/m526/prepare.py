"""Prepare one fresh disposable disk; never modify the supplied original."""
import hashlib
import json
from pathlib import Path
import shutil
import sys

base = Path(sys.argv[1]).resolve(strict=True)
root = Path(sys.argv[2]).resolve()
assert not root.exists(), 'fresh destination required'
expected = 'fc04dab1e7f2fbf3ea4b44603ed2c9d6ba15f4f86c702d4a27a1dac725966f39'
with base.open('rb') as source:
    assert hashlib.file_digest(source, 'sha256').hexdigest() == expected
before = base.stat()
root.mkdir(mode=0o700, parents=True)
copy = root / 'disk0.work'
shutil.copyfile(base, copy)
copy.chmod(0o600)
with copy.open('rb') as source:
    assert hashlib.file_digest(source, 'sha256').hexdigest() == expected
assert base.stat().st_mtime_ns == before.st_mtime_ns
(root / 'base.json').write_text(json.dumps({
    'path': str(base), 'sha256': expected, 'size': before.st_size,
    'mode': before.st_mode, 'mtime_ns': before.st_mtime_ns,
}, indent=2))
print('Fresh disposable copy verified; original unchanged')
