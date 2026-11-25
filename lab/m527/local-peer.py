"""Independently operated, bounded peer; listens only inside network-none Linux.
This process knows nothing about SIMH, guests, modem commands or the browser.
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
root = Path('/work/local-peer')
root.mkdir(mode=0o700)
server = socket.socket()
server.bind(('127.0.0.1', 40200))
server.listen(1)
server.setblocking(False)
connection = None
received = bytearray()
sent = 0
generation = 0
running = True
(root / 'peer-ready.json').write_text(json.dumps({'pid': os.getpid()}))
try:
    while running:
        sockets = [server] + ([connection] if connection else [])
        for ready in select.select(sockets, [], [], .02)[0]:
            if ready is server:
                fresh, _ = server.accept()
                if connection:
                    fresh.close()
                    continue
                connection = fresh
                connection.settimeout(.25)
                generation += 1
                received.clear()
                sent = 0
            else:
                data = connection.recv(256)
                if not data:
                    connection.close()
                    connection = None
                else:
                    assert len(received) + len(data) <= 65536
                    received.extend(data)
                    (root / ('received-%d.bin' % generation)).write_bytes(received)
        request = root / 'peer-request.json'
        if not request.exists():
            continue
        message = json.loads(request.read_text())
        request.unlink()
        operation = message['op']
        if operation == 'send':
            data = base64.b64decode(message['data'], validate=True)
            assert connection and 0 < len(data) <= 4096
            connection.sendall(data)
            sent += len(data)
        elif operation in ('disconnect', 'finish'):
            if connection:
                connection.close()
                connection = None
            running = operation != 'finish'
        elif operation != 'status':
            raise ValueError('No arbitrary peer operation')
        result = {'id': message['id'], 'generation': generation,
                  'connected': connection is not None, 'sent': sent,
                  'received': base64.b64encode(received).decode()}
        temporary = root / 'peer-response.tmp'
        temporary.write_text(json.dumps(result))
        temporary.replace(root / 'peer-response.json')
finally:
    if connection:
        connection.close()
    server.close()
