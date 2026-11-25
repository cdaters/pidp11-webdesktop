"""Independent fixed-address TCP text peer with bounded Telnet negotiation.
No SIMH, console, media or browser API. Each connection is a new recorded session.
"""
import json
import os
from pathlib import Path
import signal
import socket
import time
from isolation import inspect

mode = os.environ.get('M528_PEER_MODE', 'normal')
if mode not in ('normal', 'slow', 'partial'):
    raise ValueError('Unsupported fixed peer mode')
root = Path('/peer')
(root / 'isolation.json').write_text(json.dumps(inspect(), indent=2))
listener = socket.socket()
listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
listener.bind(('172.30.28.1', 2300))
listener.listen(1)
listener.settimeout(.25)
running = True
signal.signal(signal.SIGTERM, lambda *_: globals().update(running=False))
start = time.monotonic()
(root / 'ready.json').write_text(json.dumps({'pid': os.getpid()}))
count = 0
try:
    while running and count < 8 and time.monotonic()-start < 600:
        try:
            connection, address = listener.accept()
        except socket.timeout:
            continue
        count += 1
        assert address[0] == '172.30.28.2'
        connection.settimeout(5)
        raw = bytearray()
        payload = bytearray()
        sent = bytearray()
        state = 0
        verb = 0
        began = time.monotonic()
        result = {'session': count, 'peer': list(address)}
        try:
            banner = b'M528-LOCAL-PEER-READY\r\n'
            connection.sendall(banner)
            sent.extend(banner)
            while len(raw) < 4096 and time.monotonic()-began < 15:
                data = connection.recv(min(256,4096-len(raw)))
                if not data:
                    break
                raw.extend(data)
                for value in data:
                    if state == 1:
                        if value == 255:
                            payload.append(value)
                            state = 0
                        elif value in (251,252,253,254):
                            verb = value
                            state = 2
                        else:
                            raise ValueError('Unsupported Telnet command')
                    elif state == 2:
                        if verb in (251,253):
                            answer=bytes([255,254 if verb==251 else 252,value])
                            connection.sendall(answer)
                            sent.extend(answer)
                        state = 0
                    elif value == 255:
                        state = 1
                    else:
                        payload.append(value)
                if payload.endswith(b'\n'):
                    response=b'M528-PEER-REPLY-8C42\r\n'
                    if mode == 'partial':
                        response = response[:9]
                    if mode == 'slow':
                        for byte in response:
                            connection.sendall(bytes([byte]))
                            sent.append(byte)
                            time.sleep(.05)
                    else:
                        connection.sendall(response)
                        sent.extend(response)
                    connection.shutdown(socket.SHUT_WR)
                    break
            result['complete_request'] = payload == b'M528-GUEST-REQUEST-2B71\r\n'
        except (OSError,ValueError) as error:
            result['error'] = str(error)
        finally:
            connection.close()
            result.update(raw_hex=raw.hex(), payload_hex=payload.hex(), sent_hex=sent.hex(), elapsed_seconds=time.monotonic()-began)
            (root / ('session-%d.json'%count)).write_text(json.dumps(result,indent=2))
finally:
    listener.close()
    (root / 'stopped.json').write_text(json.dumps({'sessions':count,'operator_stopped':not running}))
