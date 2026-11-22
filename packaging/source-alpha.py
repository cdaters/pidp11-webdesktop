"""Build a deterministic source archive from a clean committed checkout.

Mac/Linux developer shell: python3 packaging/source-alpha.py VERSION NEW_DIRECTORY
No install, network, binaries, tags, signing or publication. Tracked files only;
review the emitted inventory before approving a public release.
"""

import gzip
import hashlib
import io
import json
import pathlib
import re
import subprocess
import sys
import tarfile


def git(*args):
    return subprocess.check_output(["git", *args])


def main():
    if len(sys.argv) != 3 or not re.fullmatch(r"[a-z0-9][a-z0-9.-]{0,60}", sys.argv[1]):
        raise SystemExit("usage: source-alpha.py safe-version NEW_DIRECTORY")
    if git("status", "--porcelain").strip():
        raise SystemExit("Source tree must be clean and committed")
    version = sys.argv[1]
    destination = pathlib.Path(sys.argv[2])
    if destination.exists():
        raise SystemExit("Destination must not exist")
    revision = git("rev-parse", "HEAD").decode().strip()
    # git archive supplies the committed tree, not ignored build/private files.
    source = tarfile.open(fileobj=io.BytesIO(git("archive", "--format=tar", revision)))
    files = {}
    modes = {}
    for item in source:
        if item.isdir():
            continue
        path = pathlib.PurePosixPath(item.name)
        if not item.isfile() or path.is_absolute() or ".." in path.parts:
            raise SystemExit("Unsupported source member: " + item.name)
        if any(
            p
            in {
                ".git",
                ".research",
                "node_modules",
                "private",
                "backups",
                "dist",
                "bin",
            }
            for p in path.parts
        ):
            raise SystemExit("Private/build directory in source: " + item.name)
        if path.suffix.lower() in {
            ".dsk",
            ".hp",
            ".img",
            ".pem",
            ".key",
            ".token",
            ".gguf",
        }:
            raise SystemExit("Private/media extension in source: " + item.name)
        files[item.name] = source.extractfile(item).read()
        modes[item.name] = 0o755 if item.mode & 0o111 else 0o644
    source.close()
    if not {"LICENSE", "THIRD_PARTY_NOTICES.md", "package-lock.json"} <= files.keys():
        raise SystemExit("Required notices or dependency lock absent")
    files["SOURCE.json"] = (
        json.dumps(
            {
                "version": version,
                "revision": revision,
                "scope": "experimental source alpha; no guest media or binaries",
                "archive_format": 1,
            },
            sort_keys=True,
            indent=2,
        )
        + "\n"
    ).encode()
    inventory = "".join(
        f"{hashlib.sha256(data).hexdigest()}  {name}\n"
        for name, data in sorted(files.items())
    )
    files["SOURCE_SHA256SUMS"] = inventory.encode()
    prefix = "pidp11-webdesktop-" + version
    destination.mkdir(parents=True)
    archive = destination / (prefix + ".tar.gz")
    # Fixed order, owners, timestamps and compression header: repeated source
    # archives on this Python/zlib toolchain must have identical bytes.
    with archive.open("xb") as raw, gzip.GzipFile(
        filename="", mode="wb", fileobj=raw, mtime=0, compresslevel=9
    ) as gz, tarfile.open(fileobj=gz, mode="w", format=tarfile.USTAR_FORMAT) as output:
        for name, data in sorted(files.items()):
            item = tarfile.TarInfo(prefix + "/" + name)
            item.size = len(data)
            item.mode = modes.get(name, 0o644)
            item.mtime = 0
            output.addfile(item, io.BytesIO(data))
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (destination / "SHA256SUMS").write_text(f"{digest}  {archive.name}\n")
    (destination / "inventory.sha256").write_text(inventory)
    print(
        json.dumps(
            {
                "archive": str(archive),
                "revision": revision,
                "sha256": digest,
                "bytes": archive.stat().st_size,
                "files": len(files),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
