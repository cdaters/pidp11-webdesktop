"""Mac-only REALCONS stand-in continuity checks for the running M5.5 lab.

Uses the private operator channel, never a browser API. Deliberately kills only
this lab's identified bridge after matching its executable and process start.
No physical panel, remote machine or original launcher is contacted.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
import textwrap

root = Path(os.environ["PIDP55_WORK"])
ready = json.loads((root / "ready.json").read_text())
if ready["environment"] != "isolated Mac-hosted Linux ARM64 lab" or not ready.get("panel_fixture"):
    raise SystemExit("Requires the M5.5 network-none lab with its panel stand-in")


def container_python(code, *arguments):
    return subprocess.check_output([
        "docker", "--context", "orbstack", "exec", "pidp11-m53", "python3", "-c", textwrap.dedent(code), *arguments,
    ], text=True, timeout=10)


def panel_state():
    return json.loads(container_python(
        "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8081/state',timeout=2).read().decode())"
    ))


def operator(operation, data=""):
    if (root / "request.json").exists():
        raise RuntimeError("another operator request is pending")
    identity = secrets.token_hex(8)
    temporary = root / "request.tmp"
    temporary.write_text(json.dumps({"id": identity, "op": operation, "data": data, "wait": 1}))
    temporary.replace(root / "request.json")
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        if (root / "response.json").exists():
            response = json.loads((root / "response.json").read_text())
            if response["id"] == identity:
                if response.get("error"):
                    raise RuntimeError(response["error"])
                return response["output"]
        time.sleep(.1)
    raise RuntimeError("private lab operator timed out; stop and inspect")


results = {"environment": ready["environment"], "physical_hardware_tested": False, "passed": False, "cases": []}
try:
    baseline = panel_state()
    for mode in ["graceful-stop", "bridge-crash"]:
        before = panel_state()
        if mode == "bridge-crash":
            measurement = json.loads(operator("measure"))
            stat = measurement["stat"]
            pid, start = stat.split(" ", 1)[0], stat.rsplit(")", 1)[1].split()[19]
            container_python("""
    import os, pathlib, signal, sys
    pid, expected_start = sys.argv[1:]
    base = pathlib.Path('/proc') / pid
    assert base.joinpath('stat').read_text().rsplit(')', 1)[1].split()[19] == expected_start
    assert base.joinpath('cmdline').read_bytes().split(b'\\0')[0] == b'/fixtures/terminal-pilot-linux-arm64'
    os.kill(int(pid), signal.SIGKILL)
    """, pid, start)
        operator("bridge-stop")  # Also waits/reaps the deliberately killed child.
        marker = "M55_CONSOLE_" + secrets.token_hex(6)
        output = operator("console", f"echo {marker}\r")
        assert marker in output.replace("\r", "").splitlines(), output
        time.sleep(1)
        after = panel_state()
        assert after["gets"] > before["gets"] and after["sets"] > before["sets"], (before, after)
        assert after["outputs"]["RUN"] == 1, after
        assert after["inputs"] == baseline["inputs"], after
        results["cases"].append({
            "mode": mode, "passed": True, "console_echo": marker,
            "rpc_gets_before": before["gets"], "rpc_gets_after": after["gets"],
            "rpc_sets_before": before["sets"], "rpc_sets_after": after["sets"],
            "run_lamp": after["outputs"]["RUN"], "fixture_switch_inputs_unchanged": True,
        })
        operator("bridge-start")  # Explicit local operator action on the same guest.
    results["passed"] = True
finally:
    (root / "independence-acceptance.json").write_text(json.dumps(results, indent=2) + "\n")
print("PASS: original REALCONS polling/lamp updates and conventional V7 console continued through bridge stop and SIGKILL.")
