"""Mac operator IPC, one outstanding command per channel; never replay on timeout."""
import json
from pathlib import Path
import sys
import time
import uuid

root = Path(sys.argv[1])
channel = sys.argv[2]
assert channel in ('guest', 'peer')
prefix = '' if channel == 'guest' else 'peer-'
request = root / (prefix + 'request.json')
assert not request.exists(), 'prior request unresolved'
message = json.loads(sys.argv[3])
message['id'] = str(uuid.uuid4())
temporary = root / (prefix + 'request.tmp')
with temporary.open('x') as stream:
    json.dump(message, stream)
temporary.replace(request)
for _ in range(350):
    time.sleep(.1)
    response = root / (prefix + 'response.json')
    if response.exists():
        value = json.loads(response.read_text())
        if value['id'] == message['id']:
            with (root / (prefix + 'requests-private.jsonl')).open('a') as record:
                record.write(json.dumps({'request': message, 'response': value}) + '\n')
            print(json.dumps(value))
            break
else:
    raise RuntimeError('uncertain completion; inspect without replay')
