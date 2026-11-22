"""Bounded ARM64 startup comparison, inside the owned offline Docker laboratory.

Only /work/m514-startup and fresh native directories are changed. Run with the
approved executable mounted at /approved/webdesktop-service; preserve private
outputs separately from the sanitized JSON printed here. No guest or listener.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import resource
import shutil
import signal
import subprocess
import tempfile
import time


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def limited_file():
    signal.signal(signal.SIGXFSZ, signal.SIG_IGN)
    resource.setrlimit(resource.RLIMIT_FSIZE, (100, 100))


def attempt(executable, directory, *, file_limit=False):
    started = time.monotonic()
    try:
        result = subprocess.run(
            [str(executable), "provision", "-directory", str(directory),
             "-listen", "127.0.0.1:8445", "-origin", "https://127.0.0.1:8445"],
            capture_output=True, timeout=10,
            preexec_fn=limited_file if file_limit else None,
            env={**os.environ, "GOTRACEBACK": "system"},
        )
    except OSError as error:
        return {"returncode": None, "execErrno": error.errno, "createdFiles": []}
    # Never put generated secrets, configuration or trace output in public JSON.
    directory.parent.joinpath(directory.name + ".stderr").write_bytes(result.stderr)
    return {"returncode": result.returncode,
            "signal": -result.returncode if result.returncode < 0 else None,
            "milliseconds": round((time.monotonic() - started) * 1000, 3),
            "stderrBytes": len(result.stderr),
            "createdFiles": sorted(p.name for p in directory.iterdir()) if directory.exists() else [],
            "directoryMode": oct(directory.stat().st_mode & 0o777) if directory.exists() else None}


def main():
    assert platform.machine() == "aarch64"
    parser = argparse.ArgumentParser()
    parser.add_argument("--binary", default="/approved/webdesktop-service")
    args = parser.parse_args()
    source = Path(args.binary)
    expected = digest(source)
    workspace = Path(tempfile.mkdtemp(prefix="m514-startup-", dir="/work"))
    native = Path(tempfile.mkdtemp(prefix="m514-", dir="/"))
    memory = Path(tempfile.mkdtemp(prefix="m514-", dir="/tmp"))
    events = Path("/sys/fs/cgroup/memory.events")
    report = {"architecture": platform.machine(), "kernel": platform.release(),
              "binarySHA256": expected, "file": subprocess.check_output(["file", str(source)], text=True).strip(),
              "memoryMax": Path("/sys/fs/cgroup/memory.max").read_text().strip(),
              "swapMax": Path("/sys/fs/cgroup/memory.swap.max").read_text().strip(),
              "memoryEventsBefore": events.read_text(), "cases": []}
    for label, destination in [("mac-mount-linux-copy", workspace), ("native-overlay-copy", native), ("native-tmpfs-copy", memory)]:
        for index in range(12):
            executable = destination / f"runtime-{index}"
            shutil.copyfile(source, executable)
            executable.chmod(0o700)
            # Immediate exec after close/chmod, without a sleep, fsync or hash read.
            result = attempt(executable, destination / f"config-{index}")
            result.update(storage=label, index=index, binaryMatches=digest(executable) == expected)
            report["cases"].append(result)
            (workspace / "result.json").write_text(json.dumps(report, indent=2) + "\n")
            if result["returncode"] != 0 or not result["binaryMatches"]:
                break  # Preserve the failing executable; do not retry this case.
            executable.unlink()
    # Deterministic, separate write-failure case; this is not a crash reproduction.
    report["fileSizeFailure"] = attempt(source, workspace / "limited-config", file_limit=True)
    report["memoryEventsAfter"] = events.read_text()
    report["nativeEvidenceDirectories"] = [str(native), str(memory)]
    (workspace / "result.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
