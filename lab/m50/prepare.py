"""Verify public source media and make a new disposable working copy on the Mac."""
import argparse,hashlib,pathlib,shutil,tarfile,os
p=argparse.ArgumentParser();p.add_argument('archive',type=pathlib.Path);p.add_argument('destination',type=pathlib.Path);a=p.parse_args()
def digest(path):
 with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
if digest(a.archive)!='14bcf83610737c2383ffbfa411ebbd067590705fd1c42caa679d1a5a63f60bd9':raise SystemExit('Source archive checksum mismatch. Stop; no guest prepared.')
if a.destination.exists():raise SystemExit('Destination already exists. Choose a fresh private laboratory directory.')
os.umask(0o077);a.destination.mkdir(parents=True,mode=0o700)
with tarfile.open(a.archive,'r:gz') as archive:
 member=archive.getmember('systems/unix7/disk0.hp')
 if not member.isfile() or member.size!=174423040:raise SystemExit('Unexpected guest disk member.')
 with archive.extractfile(member) as source,(a.destination/'disk0.base.hp').open('xb') as dest:shutil.copyfileobj(source,dest)
base=a.destination/'disk0.base.hp'
if digest(base)!='fc04dab1e7f2fbf3ea4b44603ed2c9d6ba15f4f86c702d4a27a1dac725966f39':raise SystemExit('Base disk checksum mismatch. Stop; do not boot it.')
base.chmod(0o400);shutil.copyfile(base,a.destination/'disk0.hp');(a.destination/'disk0.hp').chmod(0o600)
print('Verified read-only base and independent writable guest disk prepared.')
