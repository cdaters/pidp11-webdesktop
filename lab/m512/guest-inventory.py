"""Original SIMH inventory on fresh authorized media in network-none Linux.
Private filesystem IPC is owned by this lab; no browser monitor route exists.
Stop at a failed checkpoint. Guest-specific safe shutdown must precede finish.
"""

import json, os, pathlib, signal, sys

sys.path.insert(0, "/lab")
from integration import Simh

assert os.environ.get("PIDP11_ISOLATED_LAB") == "1"
assert set(os.listdir("/sys/class/net")) == {"lo"}
root = pathlib.Path("/work")
guest = sys.argv[1]
profiles = {
    "rt11": [
        "set cpu 11/70 4M",
        "set cpu idle",
        "set dli enable",
        "set dli lines=2",
        "attach dli 127.0.0.1:40100;notelnet",
        "set dz disabled",
        "set rl0 rl02",
        "attach rl0 /work/disk0.work",
        "boot rl0",
    ],
    "rsx": [
        "set cpu 11/70 4M",
        "set cpu idle",
        "set xu disabled",
        "set tm disabled",
        "set hk disabled",
        "set rp disabled",
        "set rq0 autosize",
        "attach rq0 /work/disk0.work",
        "set dz enable",
        "set dz lines=8",
        "set dz address=17760030",
        "set dz vector=330",
        "attach dz 127.0.0.1:40100;notelnet",
        "boot rq0",
    ],
    "rsts": [
        "set cpu 11/70 1024K fpp",
        "set throttle 1M",
        "set dz enabled",
        "set dz lines=8",
        "attach dz 127.0.0.1:40100;notelnet",
        "show dz",
        "set rl0 rl01",
        "set rl1 rl01",
        "attach rl0 /work/disk0.work",
        "attach rl1 /work/disk1.work",
        "boot rl0",
    ],
}
profiles["rt11-mtty"] = [
    "set cpu 11/70 4M",
    "set cpu idle",
    "set dli disabled",
    "set dz enabled",
    "set dz lines=8",
    "set dz address=17760100",
    "set dz vector=300",
    "attach dz 127.0.0.1:40100;notelnet",
    "set rl0 rl02",
    "attach rl0 /work/disk0.work",
    "boot rl0",
]
# Cloning an immutable base can preserve its read-only mode. Refuse before
# booting a writable guest rather than discovering this during startup writes.
for media in root.glob("disk*.work"):
    if not media.is_file() or not media.stat().st_mode & 0o200:
        raise RuntimeError("disposable working media must be owner-writable")
sim = Simh()


def respond(request, output):
    p = root / "response.tmp"
    p.write_text(json.dumps({"id": request["id"], "output": output}))
    p.replace(root / "response.json")


try:
    for command in profiles[guest]:
        print(sim.command(command), flush=True)
    print(sim.read(5), flush=True)
    (root / "ready.json").write_text(
        json.dumps({"guest": guest, "simh_pid": sim.p.pid})
    )
    while True:
        sim.read(0.05)
        # Preserve asynchronous startup/shutdown output, even between requests.
        (root / "console-private.txt").write_text(sim.log)
        p = root / "request.json"
        if not p.exists():
            continue
        request = json.loads(p.read_text())
        p.unlink()
        if request["op"] == "console":
            os.write(sim.master, request.get("data", "").encode("ascii"))
            output = sim.read(min(float(request.get("wait", 1)), 15))
        elif request["op"] == "finish" and request.get("guest_safe") is True:
            sim.p.send_signal(signal.SIGINT)
            output = sim.read(0.5) + sim.command("quit")
        else:
            raise ValueError("unsupported or unconfirmed lab operation")
        respond(request, output)
        if request["op"] == "finish":
            break
finally:
    (root / "console-private.txt").write_text(sim.log)
    sim.stop()
