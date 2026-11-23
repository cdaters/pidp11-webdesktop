"""M5.22 original SIMH guest with a preattached disposable LP11 spool.
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
}
# Cloning an immutable base can preserve its read-only mode. Refuse before
# booting a writable guest rather than discovering this during startup writes.
for media in root.glob("disk*.work"):
    if not media.is_file() or not media.stat().st_mode & 0o200:
        raise RuntimeError("disposable working media must be owner-writable")
assert guest in {'rsx', 'rt11'}, 'Only reviewed M5.22 guest profiles'
assert not (root / 'lp1.out').exists(), 'Fresh printer spool required'
# Attach while the CPU is stopped, before boot. Guest and device control remain
# exclusively in this private laboratory harness, never in the browser service.
profiles[guest] = profiles[guest][:-1] + [
    "set lpt enabled", "attach lpt /work/lp1.out", "show lpt",
    profiles[guest][-1],
]
if sys.argv[2:]:
    assert sys.argv[2:] == ['--pc11-fixture'] and guest == 'rsx'
    reader = root / 'reader1.bin'
    assert reader.is_file() and not reader.is_symlink() and reader.stat().st_size <= 65536
    assert not reader.stat().st_mode & 0o222, 'Reader working copy must be read-only'
    assert not (root / 'punch1.bin').exists()
    profiles[guest] = profiles[guest][:-1] + [
        'set ptr enabled', 'set ptp enabled',
        'attach -r ptr /work/reader1.bin', 'attach ptp /work/punch1.bin',
        'show ptr', 'show ptp', profiles[guest][-1],
    ]
sim = Simh()
closed = set()
job = 1


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
        elif request["op"] == "close-printer" and request.get("guest_safe") is True:
            # The operator must first verify the guest printing application has
            # returned. Pause the CPU, verify device drain, then close only LPT.
            import re
            sim.p.send_signal(signal.SIGINT)
            output = sim.read(0.5)
            assert 'Simulation stopped' in output, output
            registers = sim.command('examine lpt csr,pos')
            match = re.search(r'CSR:\s*([0-7]+)', registers)
            assert match and int(match[1], 8) & 0o200 and not int(match[1], 8) & 0o100000, registers
            (root / f'lp{job}-registers.txt').write_text(registers)
            output += registers + sim.command('detach lpt')
            closed.add('lpt')
            assert 'sim> ' in output
            output += sim.command('continue')
        elif request["op"] == "close-pc11" and request.get("guest_safe") is True:
            import re
            sim.p.send_signal(signal.SIGINT)
            output = sim.read(0.5)
            assert 'Simulation stopped' in output, output
            punch = sim.command('examine ptp csr,pos')
            match = re.search(r'CSR:\s*([0-7]+)', punch)
            assert match and int(match[1], 8) & 0o200 and not int(match[1], 8) & 0o100000, punch
            reader = sim.command('examine ptr pos,csr')
            (root / f'punch{job}-registers.txt').write_text(punch + reader)
            output += punch + reader + sim.command('detach ptp') + sim.command('detach ptr')
            closed.update({'ptp', 'ptr'})
            output += sim.command('continue')
        elif request["op"] == "next-job" and request.get("guest_safe") is True:
            assert job in (1, 2) and closed == {'lpt', 'ptp', 'ptr'}
            assert not (root / 'lp1.out').exists() and not (root / 'punch1.bin').exists()
            sim.p.send_signal(signal.SIGINT)
            output = sim.read(.5)
            assert 'Simulation stopped' in output
            for command in ['attach lpt /work/lp1.out', 'attach -r ptr /work/reader1.bin', 'attach ptp /work/punch1.bin']:
                result = sim.command(command)
                assert 'sim> ' in result and 'Error' not in result, result
                output += result
            job += 1
            closed.clear()
            output += sim.command('continue')
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
