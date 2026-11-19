"""Network-none Linux supervisor for the M5.5 candidate, never Pi deployment.

Owns only new lab rpcbind/panel-fixture children. The existing M5.3 harness owns
its disposable guest and bridge. No original launcher, scanner, GPIO daemon or
production disk is executed here. Only the original selection resolver is run.
"""
import json
import os
from pathlib import Path
import runpy
import subprocess
import sys
import time

sys.path.insert(0, "/lab")
from integration import api

if os.environ.get("PIDP11_ISOLATED_LAB") != "1" or set(os.listdir("/sys/class/net")) != {"lo"}:
    raise SystemExit("M5.5 requires the network-none Linux lab")
root = Path("/work")
children = []
logs = []
try:
    # The original unmodified resolver uses its original absolute map location.
    selection = subprocess.check_output(["sh", "/fixtures/getsel.sh", "0017"], text=True).strip()
    fallback = subprocess.check_output(["sh", "/fixtures/getsel.sh", "0000"], text=True).strip()
    assert selection == "unix7-web-pilot" and fallback == "idled", (selection, fallback)
    (root / "selection-acceptance.json").write_text(json.dumps({
        "resolver": "original getsel.sh", "selection": "0017", "profile": selection,
        "fallback": fallback, "physical_scanner_or_launcher_executed": False,
    }, indent=2) + "\n")
    for name, command in [
        ("rpcbind", ["rpcbind", "-f", "-w"]),
        ("panel", ["/fixtures/realcons-lab-linux-arm64", "-role", "direct", "-udp-replay-capacity", "65536"]),
    ]:
        log = (root / (name + ".log")).open("w")
        logs.append(log)
        children.append(subprocess.Popen(command, stdout=log, stderr=log))
        if name == "rpcbind":
            for attempt in range(50):
                probe = subprocess.run(["rpcinfo", "-p", "127.0.0.1"], capture_output=True)
                if probe.returncode == 0:
                    break
                if children[-1].poll() is not None:
                    raise RuntimeError("lab rpcbind exited")
                time.sleep(.1)
            else:
                raise RuntimeError("lab rpcbind not ready")
    for attempt in range(50):
        try:
            api("/state")
            break
        except OSError:
            time.sleep(.1)
    else:
        raise RuntimeError("lab panel stand-in not ready")
    # Neutral fixture inputs only; no browser gets this private control endpoint.
    api("/set", {"HALT": 0})
    os.environ["PIDP11_M55_PROFILE"] = "1"
    runpy.run_path("/lab/m53/serve.py", run_name="__main__")
finally:
    for child in reversed(children):
        if child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()
    for log in logs:
        log.close()
