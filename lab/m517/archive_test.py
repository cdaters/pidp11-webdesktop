"""Negative archive fixtures: no extraction, network or production files."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('verifier',Path(__file__).resolve().parents[2]/'packaging/verify-source-alpha.py')
verifier=importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)
REV='a'*40
ROOT='pidp11-webdesktop-test'

class ArchiveTests(unittest.TestCase):
    def archive(self,folder,change=None):
        files={'LICENSE':b'notice','THIRD_PARTY_NOTICES.md':b'notice','package-lock.json':b'{}',
               'SOURCE.json':json.dumps({'version':'test','revision':REV}).encode()}
        files['SOURCE_SHA256SUMS']=''.join(f'{hashlib.sha256(b).hexdigest()}  {n}\n' for n,b in sorted(files.items())).encode()
        path=Path(folder)/'fixture.tar.gz'
        with tarfile.open(path,'w:gz') as out:
            for name,data in files.items():
                item=tarfile.TarInfo(ROOT+'/'+name);item.mode=0o644;item.size=len(data)
                out.addfile(item,io.BytesIO(data))
            if change: change(out)
        return path,hashlib.sha256(path.read_bytes()).hexdigest()

    def test_valid_and_wrong_outer_identity(self):
        with tempfile.TemporaryDirectory() as folder:
            path,digest=self.archive(folder)
            self.assertEqual(verifier.verify(path,digest,REV)['members'],5)
            for sha,rev in [('0'*64,REV),(digest,'b'*40)]:
                with self.assertRaises(ValueError):verifier.verify(path,sha,rev)

    def test_paths_links_duplicates_binary_and_manifest(self):
        for name,kind,data in [('../escape','file',b'x'),(ROOT+'/../escape','file',b'x'),
                (ROOT+'/link','link',b''),(ROOT+'/LICENSE','file',b'x'),
                ('other/file','file',b'x'),(ROOT+'/program','file',b'\x7fELF'),
                (ROOT+'/extra','file',b'not in manifest')]:
            with self.subTest(name=name),tempfile.TemporaryDirectory() as folder:
                def change(out):
                    item=tarfile.TarInfo(name);item.mode=0o644;item.size=len(data)
                    if kind=='link':item.type=tarfile.SYMTYPE;item.linkname='/tmp/escape'
                    out.addfile(item,io.BytesIO(data))
                path,digest=self.archive(folder,change)
                with self.assertRaises(ValueError):verifier.verify(path,digest,REV)

if __name__=='__main__':unittest.main()
