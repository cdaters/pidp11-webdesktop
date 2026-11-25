"""Independent bounded raw-serial test peer; fixed container-loopback target.
No retries, discovery, arbitrary addresses, host shell or emulator control.
Private request/response files belong to the independent lab operator only.
"""
import base64
import json
import os
from pathlib import Path
import select
import socket
import time

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}
root = Path('/work')
assert not (root / 'peer-ready.json').exists()
connection = None
received = bytearray()
generation = 0
sent = 0
running = True

try:
    (root / 'peer-ready.json').write_text(json.dumps({'pid': os.getpid(), 'target': 'DC11 line 3, fixed loopback'}))
    while running:
        if connection is not None and select.select([connection], [], [], .02)[0]:
            chunk = connection.recv(4096)
            if not chunk:
                connection.close()
                connection = None
            else:
                assert len(received) + len(chunk) <= 65536, 'bounded receive buffer exhausted'
                received.extend(chunk)
        else:
            time.sleep(.02)
        path = root / 'peer-request.json'
        if not path.exists():
            continue
        message = json.loads(path.read_text())
        path.unlink()
        operation = message['op']
        if operation == 'connect':
            assert connection is None
            connection = socket.create_connection(('127.0.0.1', 40103), timeout=1)
            generation += 1
            received.clear()
            sent = 0
        elif operation == 'send':
            assert connection is not None
            data = base64.b64decode(message['data'], validate=True)
            assert 0 < len(data) <= 4096
            connection.sendall(data)
            sent += len(data)
        elif operation in ('disconnect', 'finish'):
            if connection is not None:
                connection.close()
                connection = None
            running = operation != 'finish'
        elif operation != 'status':
            raise ValueError('unsupported peer operation')
        result = {'id': message['id'], 'connected': connection is not None,
                  'generation': generation, 'sent': sent,
                  'received': base64.b64encode(received).decode(), 'buffered': len(received)}
        temporary = root / 'peer-response.tmp'
        temporary.write_text(json.dumps(result))
        temporary.replace(root / 'peer-response.json')
finally:
    if connection is not None:
        connection.close()
    (root / 'peer-final.json').write_text(json.dumps({'generation': generation, 'sent': sent, 'received': base64.b64encode(received).decode()}))
