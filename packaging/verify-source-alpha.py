"""Verify a supplied source archive before extraction; never installs or executes it.

Developer shell: python3 packaging/verify-source-alpha.py ARCHIVE SHA256 REVISION
The expected hash/revision must come from the separately reviewed candidate record.
This is integrity/path validation, not a signature or a complete content audit.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import tarfile


def verify(archive, expected_hash, expected_revision):
    if not re.fullmatch(r'[0-9a-f]{64}', expected_hash) or not re.fullmatch(r'[0-9a-f]{40}', expected_revision):
        raise ValueError('Require complete SHA-256 and source revision')
    if archive.stat().st_size > 64 * 1024 * 1024:
        raise ValueError('Archive exceeds review bound')
    with archive.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    if digest != expected_hash:
        raise ValueError('Archive checksum mismatch; do not extract')
    files = {}
    total = 0
    prefix = None
    with tarfile.open(archive, 'r:gz') as source:
        for member in source:
            path = PurePosixPath(member.name)
            if (not member.isfile() or path.is_absolute() or '..' in path.parts
                    or str(path) != member.name or len(path.parts) < 2
                    or '\\' in member.name or any(ord(c) < 32 for c in member.name)):
                raise ValueError('Unsafe or nonregular archive member')
            if prefix is None:
                prefix = path.parts[0]
                if not re.fullmatch(r'pidp11-webdesktop-[a-z0-9][a-z0-9.-]{0,60}', prefix):
                    raise ValueError('Unexpected archive root')
            name = str(PurePosixPath(*path.parts[1:]))
            if path.parts[0] != prefix or name in files:
                raise ValueError('Multiple roots or duplicate member')
            if member.mode not in (0o644, 0o755) or member.uid or member.gid or member.mtime:
                raise ValueError('Unexpected source mode, owner or timestamp')
            if any(part in {'.git','.research','node_modules','private','backups','dist','bin'} for part in path.parts):
                raise ValueError('Private/build path')
            if path.suffix.lower() in {'.dsk','.hp','.img','.pem','.key','.token','.gguf'}:
                raise ValueError('Private/media extension')
            total += member.size
            if total > 256 * 1024 * 1024 or len(files) >= 4096:
                raise ValueError('Expanded archive exceeds review bound')
            data = source.extractfile(member).read()
            if data.startswith((b'\x7fELF', b'\xcf\xfa\xed\xfe', b'\xfe\xed\xfa\xcf', b'MZ')):
                raise ValueError('Native executable signature')
            files[name] = data
    required = {'SOURCE.json','SOURCE_SHA256SUMS','LICENSE','THIRD_PARTY_NOTICES.md','package-lock.json'}
    if not required <= files.keys():
        raise ValueError('Required source identity/notices absent')
    identity = json.loads(files['SOURCE.json'])
    if identity.get('revision') != expected_revision or prefix != 'pidp11-webdesktop-' + identity.get('version',''):
        raise ValueError('Source identity mismatch')
    actual = ''.join(f'{hashlib.sha256(data).hexdigest()}  {name}\n'
                     for name,data in sorted(files.items()) if name != 'SOURCE_SHA256SUMS')
    if files['SOURCE_SHA256SUMS'] != actual.encode():
        raise ValueError('Internal manifest mismatch')
    return {'sha256':digest,'revision':expected_revision,'bytes':archive.stat().st_size,
            'members':len(files),'uncompressedBytes':total,'root':prefix,'internalManifestVerified':True}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive',type=Path)
    parser.add_argument('sha256')
    parser.add_argument('revision')
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.archive,args.sha256,args.revision),indent=2))
    except (ValueError,KeyError,tarfile.TarError) as error:
        raise SystemExit(str(error)) from error
