"""Mac driver for a disposable ARM64 systemd/genuine-V7 coexistence rehearsal.
No physical Pi, SSH, auto guest startup or production installation is involved.
"""

import json, pathlib, subprocess, time, uuid, os

root = pathlib.Path(".research/m512")
prefix = ["orb", "run", "-m", "pidp11-m512", "-u", "root"]
service = "/opt/pidp11-webdesktop/current/webdesktop-service"
unit = "pidp11-webdesktop.service"


def run(*args, data=None):
    return subprocess.check_output(prefix + list(args), input=data, timeout=30).decode()


def status():
    for _ in range(40):
        try:
            return json.loads(run(service, "status"))
        except subprocess.CalledProcessError:
            time.sleep(0.1)
    raise AssertionError("service not ready")


def guest(op, data=""):
    identity = uuid.uuid4().hex
    payload = json.dumps(dict(id=identity, op=op, data=data, wait=1)).encode()
    run(
        "sh",
        "-c",
        "cat > /root/m512/guest/request.tmp; mv /root/m512/guest/request.tmp /root/m512/guest/request.json",
        data=payload,
    )
    for _ in range(100):
        try:
            answer = json.loads(
                run(
                    "sh",
                    "-c",
                    "test ! -e /root/m512/guest/response.json || cat /root/m512/guest/response.json",
                )
            )
            if answer["id"] == identity:
                return answer["output"]
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            pass
        time.sleep(0.1)
    raise AssertionError("guest IPC timeout; do not replay")


def approve():
    s = status()
    line = s["lines"][0]
    assert line["state"] == "detached"
    run(
        service,
        "attach",
        "-instance",
        s["instance"],
        "-id",
        line["id"],
        "-revision",
        str(line["revision"]),
        "-guest-and-line-verified",
    )


def conventional(label):
    for op in ["console", "traditional"]:
        marker = "M512_" + label + "_" + op
        assert guest(op, "echo " + marker + "\r").count(marker) >= 2


def browser(phase):
    approve()
    subprocess.run(
        ["node", "lab/m512/arm64-browser.mjs"],
        env={**os.environ, "M512_PHASE": phase},
        check=True,
        timeout=60,
    )
    conventional(phase)


assert run("hostname").strip() == "pidp11-m512"
assert run("cat", "/sys/class/net/eth0/operstate").strip() == "down"
(root / "arm64-writer.token").write_text(
    run("cat", "/etc/pidp11-webdesktop/writer.token")
)
(root / "arm64-writer.token").chmod(0o600)
results = {
    "platform": "Disposable ARM64 Debian Trixie, 1 GiB, two-core CPU-time quota",
    "originalGuest": "UNIX V7 original SIMH independent process",
    "preflight": "Refused absent Oscar launcher/panel executables; separate lab simulator is not a full installation",
    "phases": [],
}
assert all(line["state"] == "detached" for line in status()["lines"])
browser("old")
results["phases"].append("old-browser")
# Upgrade only the stopped companion. Conventional V7 operation continues.
run("systemctl", "stop", unit)
conventional("stopped_before_upgrade")
run("sh", "/root/m512/package-new/install.sh", "/root/m512/package-new", "m512")
inactive = subprocess.run(
    prefix + ["systemctl", "is-active", unit],
    capture_output=True,
    text=True,
    timeout=10,
)
assert inactive.returncode == 3 and inactive.stdout.strip() == "inactive"
run("systemctl", "start", unit)
browser("new")
results["phases"].append("new-browser")
before = status()
run("systemctl", "restart", unit)
after = status()
assert before["instance"] != after["instance"]
assert all(l["state"] == "detached" for l in after["lines"])
conventional("after_restart")
results["restartDetached"] = True
results["metrics"] = run(
    "systemctl",
    "show",
    unit,
    "-p",
    "MemoryCurrent",
    "-p",
    "MemoryPeak",
    "-p",
    "MemoryMax",
    "-p",
    "MemorySwapMax",
    "-p",
    "CPUUsageNSec",
    "-p",
    "TasksCurrent",
)
run("systemctl", "stop", unit)
run("sh", "/root/m512/package-new/select-release.sh", "m511")
run("systemctl", "start", unit)
browser("rollback")
results["phases"].append("rollback-browser")
run("systemctl", "stop", unit)
run("sh", "/root/m512/package-new/select-release.sh", "m512")
run("systemctl", "start", unit)
assert all(l["state"] == "detached" for l in status()["lines"])
conventional("new_restored")
(root / "arm64-lifecycle.json").write_text(json.dumps(results, indent=2) + "\n")
print(json.dumps(results, indent=2))
