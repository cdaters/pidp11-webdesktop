"""Mac operator IPC with one outstanding request and no replay on timeout.
This helper sends only an explicitly supplied console action; it is not a service.
"""
import json
from pathlib import Path
import subprocess
import sys


def request(root, data, wait=1):
    result = subprocess.check_output(['python3', 'lab/m526/request.py', str(root), 'guest',
                                     json.dumps({'op': 'console', 'data': data, 'wait': wait})], text=True)
    return json.loads(result)


def text_session(root, output):
    first = request(root, '/usr/ucb/telnet 172.30.28.1 2300\r', .7)
    assert 'Connected to 172.30.28.1' in first['output'] and 'M528-LOCAL-PEER-READY' in first['output'], first
    second = request(root, 'M528-GUEST-REQUEST-2B71\r', 2)
    Path(output).write_text(json.dumps([first, second], indent=2))
    return second


if __name__ == '__main__':
    assert len(sys.argv) == 3
    print(json.dumps(text_session(Path(sys.argv[1]), sys.argv[2])))
