"""Prepare a bounded, local M5.5 review package; never install or contact a Pi.

Reads a captured original boot file and selection map, verifies the reviewed
baseline, and creates a new private directory. It neither reads nor copies guest
disks. Complete selection maps and diffs are private operator records.
"""
import argparse
import difflib
import hashlib
import json
from pathlib import Path
import re

SOURCE_BOOT_SHA256 = "9a0d63699fcc1ab117fcf9cf35f85c1694719b33f2d8989167f4018e97d7f44b"
SELECTION = "0017"
PROFILE = "unix7-web-pilot"
LISTENER = b"attach dci line=0,127.0.0.1:40100;notelnet\n"
MAX_SOURCE = 65536


def sha256(data):
    """Return a content identity, not a statement about current installed state."""
    return hashlib.sha256(data).hexdigest()


def render(boot, selections):
    """Return proposed bytes after strict checks, without changing either source.

    Numeric selection comparison rejects leading-zero aliases. The original
    getsel script uses numeric awk comparison, so textual uniqueness is unsafe.
    Only the reviewed V7 boot file is accepted; drift needs another review.
    """
    if len(boot) > MAX_SOURCE or len(selections) > MAX_SOURCE:
        raise ValueError("source exceeds 64 KiB")
    if sha256(boot) != SOURCE_BOOT_SHA256:
        raise ValueError("original V7 boot file differs from reviewed M5.1 baseline")
    try:
        text = selections.decode("ascii")
    except UnicodeDecodeError as error:
        raise ValueError("selection map must be ASCII") from error
    rows = {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        match = re.fullmatch(r"([0-7]{4,6})[ \t]+([a-zA-Z0-9][a-zA-Z0-9_+.-]*)[ \t]*", line)
        if not match:
            raise ValueError("unreviewed selection-map syntax")
        number, profile = int(match[1], 8), match[2]
        if number in rows:
            raise ValueError("duplicate or aliased boot selection")
        rows[number] = profile
    if rows.get(0) != "idled":
        raise ValueError("expected unchanged 0000 IDLED fallback")
    if int(SELECTION, 8) in rows or PROFILE in rows.values():
        raise ValueError("pilot selection or profile is already mapped")
    anchor = b"set dci lines=8\n"
    if boot.count(anchor) != 1:
        raise ValueError("expected one DC11 configuration anchor")
    candidate = boot.replace(anchor, anchor + LISTENER, 1)
    # Appending preserves every original byte, including comments and ordering.
    separator = b"" if selections.endswith(b"\n") else b"\n"
    proposed_map = selections + separator + f"{SELECTION}\t{PROFILE}\n".encode()
    return candidate, proposed_map


def read_bounded(path):
    """Read an ordinary captured file without following a final symlink."""
    import os
    import stat
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as source:
        if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
            raise ValueError("ordinary captured file required")
        data = source.read(MAX_SOURCE + 1)
    if len(data) > MAX_SOURCE:
        raise ValueError("source exceeds 64 KiB")
    return data


def prepare(boot_path, selections_path, destination):
    """Write a new local review directory; refuse any existing destination.

    Validation precedes directory creation. A filesystem failure can leave a
    partial new package for inspection; it never replaces an existing package.
    """
    boot, selections = read_bounded(boot_path), read_bounded(selections_path)
    candidate, proposed_map = render(boot, selections)
    outputs = {"boot.ini": candidate, "selections.proposed": proposed_map}
    for name, old, new in [("boot", boot, candidate), ("selections", selections, proposed_map)]:
        outputs[name + ".diff"] = "".join(difflib.unified_diff(
            old.decode().splitlines(keepends=True), new.decode().splitlines(keepends=True),
            fromfile=name + ".baseline", tofile=name + ".proposed",
        )).encode()
    manifest = {
        "scope": "local preparation only; revalidate current Pi state after authorization",
        "selection": SELECTION, "profile": PROFILE, "asserted_switch_bits": [0, 1, 2, 3],
        "original_boot_sha256": sha256(boot), "candidate_boot_sha256": sha256(candidate),
        "original_selections_sha256": sha256(selections), "proposed_selections_sha256": sha256(proposed_map),
        "selection_count_before": sum(bool(line.strip()) and not line.lstrip().startswith(b"#") for line in selections.splitlines()),
    }
    outputs["manifest.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
    destination.mkdir(mode=0o700)  # Exclusive creation also rejects a symlink.
    for name, data in outputs.items():
        target = destination / name
        with target.open("xb") as output:
            output.write(data)
        target.chmod(0o600)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("boot", type=Path)
    parser.add_argument("selections", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    try:
        manifest = prepare(args.boot, args.selections, args.destination)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Preparation refused: {error}\n")
    print(f"Prepared local {manifest['profile']} candidate at {args.destination}; not installed.")


if __name__ == "__main__":
    main()
