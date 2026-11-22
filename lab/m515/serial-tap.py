"""Bounded read-through trace for one owned, offline V7 DC11 lab line.

Listens only on 40200 and forwards only to original SIMH at 40100. Raw bytes
are private evidence, never a browser feature or emulator control channel.
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
os.umask(0o077)
trace = Path('/work/serial-private.jsonl').open('x')
server = socket.socket()
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(('127.0.0.1', 40200))
server.listen(1)
connection = 0
budget = 1024*1024

def record(event, **fields):
    trace.write(json.dumps({'time': time.time(), 'connection': connection, 'event': event, **fields})+'\n')
    trace.flush()

record('ready')
while True:
    downstream, _ = server.accept()
    connection += 1
    with downstream, socket.create_connection(('127.0.0.1', 40100), timeout=5) as upstream:
        upstream.settimeout(None)
        record('connected')
        while True:
            ready, _, _ = select.select([downstream, upstream], [], [], 60)
            if not ready:
                record('idle')
                continue
            ended = False
            for source in ready:
                chunk = source.recv(65536)
                if not chunk:
                    ended = True
                    break
                budget -= len(chunk)
                if budget < 0:
                    record('trace-limit')
                    raise SystemExit('Trace bound reached; inspect, do not replay')
                record('bytes', direction='simh-to-bridge' if source is upstream else 'bridge-to-simh',
                       data=base64.b64encode(chunk).decode())
                (downstream if source is upstream else upstream).sendall(chunk)
            if ended:
                record('closed')
                break
