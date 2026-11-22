"""Mac operator: reproduce reviewed SYSGEN choices on an already booted fresh lab.

Requires the network-none guest-inventory harness at a known idle RT-11 prompt.
Only one IPC request is outstanding; unknown prompts stop without replay.
"""

import json
import pathlib
import re
import sys
import time
import uuid

root = pathlib.Path(sys.argv[1])


def send(data):
    request = {
        "id": str(uuid.uuid4()),
        "op": "console",
        "data": data + "\r",
        "wait": 0.5,
    }
    temporary = root / "request.tmp"
    temporary.write_text(json.dumps(request))
    temporary.replace(root / "request.json")
    for _ in range(350):
        time.sleep(0.1)
        response = root / "response.json"
        if response.exists():
            result = json.loads(response.read_text())
            if result["id"] == request["id"]:
                print(result["output"], flush=True)
                return result["output"].replace("\r", "")
    raise RuntimeError("IPC timeout; do not repeat uncertain input")


output = send("IND SYSGEN")
for prompt, answer in [
    ("introduction", "N"),
    ("previously created", "N"),
    ("create an answer file", "Y"),
    ("What answer file", "M513.ANS"),
]:
    assert prompt in output, (prompt, output)
    output = send(answer)

# Each numeric prompt must be in the reviewed transcript. Explicit answers are
# separated from accepted defaults; no generic response to an unknown question.
choices = {
    1: "N",
    2: "Y",
    3: "N",
    5: "",
    7: "Y",
    8: "",
    9: "",
    10: "Y",
    11: "",
    12: "",
    13: "",
    14: "",
    16: "",
    20: "",
    21: "",
    22: "",
    26: "",
    27: "",
    30: "",
    31: "",
    32: "",
    33: "",
    34: "",
    35: "",
    68: "N",
}
for _ in range(len(choices)):
    match = re.search(r"\n(\d+)\.\s+([^\n]+)[?:]\s*$", output)
    assert match and int(match[1]) in choices, output
    output = send(choices.pop(int(match[1])))
assert not choices
for prompt, answer in [
    ("Enter the device name", "DL"),
    ("RL01/RL02 units", "2"),
    ("Enter the next device", "."),
    ("own devices", "N"),
    ("extra device slots", "0"),
    ("introduction to terminal", "N"),
    ("local DL11 lines", "1"),
    ("remote DL11", "0"),
    ("CSR for the first (console)", "177560"),
    ("vector for the first (console)", "60"),
    ("DZ11 or DZV11", "Y"),
    ("DZ11 multiplexer support", "Y"),
    ("How many DZ multiplexers", "1"),
    ("local DZ lines", "1"),
    ("remote DZ lines", "0"),
    ("CSR for the first DZ", "160100"),
    ("vector for the first DZ", "300"),
    ("baud rate", "9600"),
    ("change any", "N"),
    ("source input device", "SY"),
    ("binary output device", "SY"),
    ("map output device", "SY"),
    ("retain the system OBJs", "Y"),
    ("retain the work files", "Y"),
]:
    assert prompt in output, (prompt, output)
    output = send(answer)
assert "END OF SYSGEN PROGRAM" in output
print("SYSGEN choices recorded; inspect generated files before building.")
