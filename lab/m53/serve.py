"""Mac-hosted network-none lab supervisor, never part of Pi deployment.

Owns the disposable simulator and pilot process. A private file channel lets the
Mac acceptance script exercise the independent operator; no web route exposes it.
"""
import hashlib
import json
import os
from pathlib import Path
import secrets
import signal
import subprocess
import sys
import time

sys.path.insert(0, "/lab")
from integration import Simh

root = Path("/work")
os.umask(0o077)
sim = Simh()
bridge = None
bridge_log = (root / "bridge.log").open("a")


def console(data, wait=1):
    os.write(sim.master, data.encode("ascii"))
    return sim.read(wait)


def start_bridge():
    process = subprocess.Popen([
        "/fixtures/terminal-pilot-linux-arm64", "-config", "/tmp/terminals.json",
        "-token-file", "/tmp/terminal.token", "-observer-token-file", "/tmp/observer.token",
        "-tls-cert", "/tmp/observe-cert.pem", "-tls-key", "/tmp/observe-key.pem",
    ], stdout=subprocess.DEVNULL, stderr=bridge_log)
    time.sleep(.5)
    if process.poll() is not None:
        raise RuntimeError("pilot startup failed; inspect bridge.log")
    return process


def stop_bridge():
    global bridge
    if bridge is not None:
        bridge.terminate()
        bridge.wait(timeout=5)
        bridge = None


try:
    config = Path("/lab/m53/guest.ini").read_text()
    for line in config.splitlines():
        if line and not line.startswith(";"):
            sim.command(line)
    console("boot\r")
    console("hp(0,0)unix\r", 2)
    assert "# " in sim.log[-1000:], sim.log[-1000:]
    console("\x04", 2)
    console("dmr\r")
    operator = console("echo M53_OPERATOR_READY\r")
    assert "\r\nM53_OPERATOR_READY\r\n" in operator and "$ " in operator, operator
    for name in ["terminal", "observer"]:
        value = secrets.token_hex(32)
        Path("/tmp/" + name + ".token").write_text(value)
        (root / (name + ".token")).write_text(value)
    Path("/tmp/terminals.json").write_text(json.dumps([{
        "id": "unix7-dc0", "label": "UNIX V7 M5.3 lab · DC11 tty00",
        "address": "127.0.0.1:40100", "kind": "raw-guest-line",
    }]))
    subprocess.run(["/fixtures/terminal-cert-linux-arm64"], check=True, stdout=subprocess.DEVNULL)
    (root / "terminal-cert.pem").write_bytes(Path("/tmp/observe-cert.pem").read_bytes())
    bridge = start_bridge()
    (root / "ready.json").write_text(json.dumps({
        "environment": "isolated Mac-hosted Linux ARM64 lab",
        "simh_pid": sim.p.pid, "bridge_pid": bridge.pid, "config": config,
        "simh_sha256": hashlib.sha256(Path("/opt/lab/pdp11_realcons").read_bytes()).hexdigest(),
        "pilot_sha256": hashlib.sha256(Path("/fixtures/terminal-pilot-linux-arm64").read_bytes()).hexdigest(),
    }, indent=2))
    print("M5.3 lab ready: genuine UNIX V7, one DC11 line, original operator, pilot binary", flush=True)
    while True:
        sim.read(.05)
        request = root / "request.json"
        if not request.exists():
            continue
        message = json.loads(request.read_text())
        request.unlink()
        operation = message["op"]
        if operation == "console":
            output = console(message["data"], message.get("wait", 1))
        elif operation == "bridge-stop":
            stop_bridge()
            output = "bridge stopped"
        elif operation == "bridge-start":
            bridge = start_bridge()
            output = "bridge started"
        elif operation == "measure":
            output = json.dumps({
                "stat": Path(f"/proc/{bridge.pid}/stat").read_text(),
                "status": Path(f"/proc/{bridge.pid}/status").read_text(),
            })
        elif operation == "shutdown":
            stop_bridge()
            output = console("sync\r") + console("sync\r") + console("sync\r")
            sim.p.send_signal(signal.SIGINT)
            output += sim.read(1)
            assert "sim> " in output, output
            output += sim.command("quit")
        else:
            raise ValueError("unknown private harness operation")
        temporary = root / "response.tmp"
        temporary.write_text(json.dumps({"id": message["id"], "output": output}))
        temporary.replace(root / "response.json")
        if operation == "shutdown":
            break
finally:
    stop_bridge()
    sim.stop()
    (root / "operator-private.log").write_text(sim.log)
    bridge_log.close()
