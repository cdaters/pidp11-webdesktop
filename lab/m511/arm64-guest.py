"""Owned original V7 process in the disposable ARM64 VM, independent of systemd.
Private files are operator-test IPC; the browser has no access to this harness.
"""

import hashlib, json, os, pathlib, select, shutil, signal, socket, sys, time

assert os.environ.get("PIDP11_ISOLATED_LAB") == "1"
assert pathlib.Path("/sys/class/net/eth0/operstate").read_text().strip() == "down"
sys.path.insert(0, "/root/m511/original")
from integration import Simh

root = pathlib.Path("/root/m511/guest")
assert (
    hashlib.file_digest((root / "disk0.base").open("rb"), "sha256").hexdigest()
    == "fc04dab1e7f2fbf3ea4b44603ed2c9d6ba15f4f86c702d4a27a1dac725966f39"
)
assert not (root / "disk.work").exists()
shutil.copyfile(root / "disk0.base", root / "disk.work")
sim = Simh("/root/m511/original/pdp11_realcons")
traditional = None


def console(data, wait=1):
    os.write(sim.master, data.encode("ascii"))
    return sim.read(wait)


def receive(wait=1):
    end = time.monotonic() + wait
    out = b""
    while time.monotonic() < end:
        ready, _, _ = select.select(
            [traditional], [], [], max(0, end - time.monotonic())
        )
        if ready:
            part = traditional.recv(65536)
            if not part:
                break
            out += part
    return out.decode("ascii", errors="replace")


try:
    for command in [
        "set cpu 11/70 1M",
        "set cpu idle",
        "set rp0 rp06",
        "attach rp0 /root/m511/guest/disk.work",
        "set dci enabled",
        "set dci lines=4",
        "attach dci line=0,127.0.0.1:40100;notelnet",
        "attach dci line=1,127.0.0.1:40101;notelnet",
        "boot rp0",
    ]:
        sim.command(command)
    console("boot\r")
    console("hp(0,0)unix\r", 2)
    assert "# " in sim.log[-1000:]
    console("\x04", 2)
    console("dmr\r")
    assert "$ " in console("echo ARM64_OPERATOR_READY\r")
    traditional = socket.create_connection(("127.0.0.1", 40101))
    receive()
    traditional.sendall(b"\r")
    receive()
    traditional.sendall(b"dmr\r")
    assert "$ " in receive()
    (root / "ready.json").write_text(json.dumps({"simh_pid": sim.p.pid}))
    while True:
        sim.read(0.05)
        (root / "console-private.txt").write_text(sim.log)
        p = root / "request.json"
        if not p.exists():
            continue
        request = json.loads(p.read_text())
        p.unlink()
        op = request["op"]
        if op == "console":
            out = console(request["data"], request.get("wait", 1))
        elif op == "traditional":
            traditional.sendall(request["data"].encode("ascii"))
            out = receive()
        elif op == "shutdown":
            traditional.close()
            traditional = None
            out = console("sync\r") + console("sync\r") + console("sync\r")
            sim.p.send_signal(signal.SIGINT)
            out += sim.read(0.5) + sim.command("quit")
        else:
            raise ValueError("Unknown private operation")
        p = root / "response.tmp"
        p.write_text(json.dumps({"id": request["id"], "output": out}))
        p.replace(root / "response.json")
        if op == "shutdown":
            break
finally:
    (root / "console-private.txt").write_text(sim.log)
    if traditional:
        traditional.close()
    sim.stop()
