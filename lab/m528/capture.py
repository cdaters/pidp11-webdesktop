"""Passive AF_PACKET capture on the explicitly owned TAP only; no send API.
Bounded to 600 seconds, 10,000 frames and 4 MiB. Capture loss never stops SIMH.
"""
import json
import os
from pathlib import Path
import signal
import secrets
import socket
import struct
import time
from isolation import inspect

os.umask(0o007)
root = Path('/capture')
identity = inspect()
identity['observation_generation'] = secrets.token_hex(16)
identity['guest_identity'] = os.environ['M528_GUEST_INSTANCE']
identity['identity_basis'] = 'independent operator attestation; not inferred from address'
identity['mode'] = 'retained-laboratory-capture; current state unknown'
(root / 'identity.json').write_text(json.dumps(identity, indent=2))
listener = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.htons(3))
listener.bind(('tap528', 0))
listener.settimeout(.25)
running = True

def stop(*_):
    global running
    running = False

signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
frames = size = 0
termination = "duration-or-size-bound"
start = time.monotonic()
try:
    with (root / 'frames.pcap').open('xb') as stream:
        stream.write(struct.pack('<IHHIIII', 0xa1b2c3d4, 2, 4, 0, 0, 2048, 1))
        (root / 'ready.json').write_text(json.dumps({'pid': os.getpid()}))
        while running and time.monotonic() - start < 600 and frames < 10000 and size < 4*1024*1024-2064:
            try:
                data, address = listener.recvfrom(2048)
            except socket.timeout:
                continue
            now = time.time_ns()
            stream.write(struct.pack('<IIII', now//1000000000, now//1000%1000000, len(data), len(data)))
            stream.write(data)
            stream.flush()
            frames += 1
            size += len(data)+16
except OSError as error:
    termination = "interface-unavailable: " + str(error)
    raise
finally:
    if not running:
        termination = "operator-stopped"
    listener.close()
    (root / 'capture-result.json').write_text(json.dumps({'frames': frames, 'record_bytes': size,
        'elapsed_seconds': time.monotonic()-start, 'operator_stopped': not running,
        'bounded': True, 'termination': termination, 'current_state': 'unknown'}, indent=2))
