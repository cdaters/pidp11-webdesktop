"""Mac-only, one outstanding private lab request; never retry uncertain input.
Usage: request.py WORK_DIRECTORY guest|supervisor JSON_OBJECT
This is operator test orchestration, not a browser or production interface.
"""
import argparse
import json
from pathlib import Path
import time
import uuid

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('root', type=Path)
parser.add_argument('channel', choices=['guest', 'supervisor'])
parser.add_argument('payload')
args = parser.parse_args()
prefix = '' if args.channel == 'guest' else 'supervisor-'
key = 'id' if args.channel == 'guest' else 'request_id'
request = args.root / (prefix + 'request.json')
assert not request.exists(), 'Outstanding request; inspect without replay'
message = json.loads(args.payload)
message[key] = str(uuid.uuid4())
temporary = args.root / (prefix + 'request.tmp')
assert not temporary.exists(), 'Preserve uncertain prior write'
with temporary.open('x') as stream:
    json.dump(message, stream)
temporary.replace(request)
for _ in range(350):
    time.sleep(.1)
    response = args.root / (prefix + 'response.json')
    if response.exists():
        value = json.loads(response.read_text())
        if value.get(key) == message[key]:
            print(json.dumps(value))
            break
else:
    raise SystemExit('Timeout; preserve evidence, do not replay')
