"""Mac: verify the existing public archive and extract only fresh lab copies."""

import hashlib, json, pathlib, shutil, tarfile, os

root = pathlib.Path(".research/m512/guests")
archive = pathlib.Path(".research/m50/media/systems.tar.gz")
with archive.open("rb") as f:
    assert (
        hashlib.file_digest(f, "sha256").hexdigest()
        == "14bcf83610737c2383ffbfa411ebbd067590705fd1c42caa679d1a5a63f60bd9"
    )
os.umask(0o077)
manifest = json.loads(pathlib.Path("lab/m511/results/media.json").read_text())
with tarfile.open(archive) as source:
    for guest in ["rt11", "rsts"]:
        directory = root / guest
        directory.mkdir(parents=True, exist_ok=False)
        for i, item in enumerate(x for x in manifest["media"] if x["guest"] == guest):
            member = source.getmember(item["member"])
            assert member.isfile() and member.size == item["bytes"]
            base = directory / f"disk{i}.base"
            with source.extractfile(member) as src, base.open("xb") as dst:
                shutil.copyfileobj(src, dst)
            with base.open("rb") as f:
                assert (
                    hashlib.file_digest(f, "sha256").hexdigest() == item["base_sha256"]
                )
            base.chmod(0o400)
            shutil.copyfile(base, directory / f"disk{i}.work")
print("Fresh RT-11/RSTS bases and independent working files verified.")
