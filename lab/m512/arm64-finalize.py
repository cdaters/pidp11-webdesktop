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


def conventional(label):
    for op in ["console", "traditional"]:
        marker = "M512_" + label + "_" + op
        assert guest(op, "echo " + marker + "\r").count(marker) >= 2


assert run("hostname").strip() == "pidp11-m512"
assert run("cat", "/sys/class/net/eth0/operstate").strip() == "down"
results = {}
observer = run("cat", "/root/m512/final-supervisor.pid").strip()
assert "/root/m512/supervisor.py" in run("cat", "/proc/" + observer + "/cmdline")
run("kill", "-TERM", observer)
time.sleep(1.4)
assert status()["lines"][0]["state"] == "unavailable"
conventional("final_supervisor_stopped")
results["finalMemoryRefusalLog"] = run(
    "env", "PIDP11_ISOLATED_LAB=1", "sh", "/root/m512/memory-readiness.sh"
)
run("systemctl", "stop", unit)
run(
    "cp",
    "/etc/pidp11-webdesktop/config.json",
    "/root/m512/supervised-config.private.json",
)
run("sh", "/root/m512/package-final/select-release.sh", "m511")
# The previous binary must refuse an unrecognized supervision requirement.
run("systemctl", "start", unit)
time.sleep(0.5)
assert (
    run("systemctl", "show", unit, "-p", "ActiveState", "--value").strip() == "failed"
)
results["oldBinaryRefusesNewConfig"] = True
run("systemctl", "stop", unit)
run(
    "python3",
    "-c",
    "import json,pathlib;p=pathlib.Path('/etc/pidp11-webdesktop/config.json');c=json.loads(p.read_text());c.pop('supervised_endpoints');p.write_text(json.dumps(c))",
)
run("systemctl", "reset-failed", unit)
run("systemctl", "start", unit)
assert all(l["state"] == "detached" for l in status()["lines"])
conventional("final_rollback")
results["rollbackWithPriorReviewedConfigDetached"] = True
run("systemctl", "stop", unit)
run(
    "cp",
    "/root/m512/supervised-config.private.json",
    "/etc/pidp11-webdesktop/config.json",
)
run("sh", "/root/m512/package-final/select-release.sh", "m512-final")
run("systemctl", "start", unit)
assert all(
    l["state"] == "detached" and l["supervision_required"] for l in status()["lines"]
)
results["newSupervisionConfigRestoredDetached"] = True
results["confinement"] = run(
    "systemctl",
    "show",
    unit,
    "-p",
    "MemoryMax",
    "-p",
    "MemorySwapMax",
    "-p",
    "NoNewPrivileges",
    "-p",
    "PrivateDevices",
    "-p",
    "ProtectSystem",
    "-p",
    "ProtectHome",
    "-p",
    "Restart",
)
run("systemctl", "stop", unit)
results["uninstallLog"] = run(
    "sh", "/root/m512/package-final/uninstall.sh", "--purge-private-config-and-account"
)
run("rm", "/etc/systemd/system/pidp11-webdesktop.service.d/zzzz-m512-hardening.conf")
run("rmdir", "/etc/systemd/system/pidp11-webdesktop.service.d")
run("systemctl", "daemon-reload")
run(
    "sh",
    "-c",
    "test ! -e /opt/pidp11-webdesktop && test ! -e /etc/pidp11-webdesktop && test ! -e /run/pidp11-webdesktop && test ! -e /etc/systemd/system/pidp11-webdesktop.service && ! getent passwd pidp11-webdesktop && ! getent group pidp11-webdesktop",
)
results["completeManagedUninstall"] = True
conventional("uninstalled")
results["bothConventionalPathsSurvivedUninstall"] = True
results["guestShutdown"] = guest("shutdown")
assert "Goodbye" in results["guestShutdown"]
results["originalHashCheck"] = run(
    "sha256sum", "-c", "/root/m512/original-baseline.sha256"
)
(root / "vm-cleanup-private.json").write_text(json.dumps(results, indent=2) + "\n")
with (root / "arm64-evidence.tar").open("wb") as out:
    subprocess.run(
        prefix
        + [
            "tar",
            "-cf",
            "-",
            "-C",
            "/root/m512",
            "guest",
            "original-baseline.sha256",
            "preflight.log",
        ],
        stdout=out,
        check=True,
    )
print(
    "Final protected runtime, memory refusal, reviewed-config rollback, uninstall, conventional V7 and immutable hashes passed; guest safely exited"
)
