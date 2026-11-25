"""Bounded, offline Ethernet-PCAP summary; retained evidence, never live identity.
Only classic little-endian PCAP, complete Ethernet frames and unfragmented IPv4
are interpreted. Unsupported protocols remain named counts, not guest claims.
"""
from collections import Counter, defaultdict, deque
import hashlib
import json
from pathlib import Path
import socket
import struct
import sys

MAX_BYTES = 4 * 1024 * 1024
MAX_FRAMES = 10000


def checksum(data):
    if len(data) % 2:
        data += b'\0'
    total = sum(struct.unpack('!%dH' % (len(data)//2), data))
    while total >> 16:
        total = (total & 65535) + (total >> 16)
    return (~total) & 65535


def decode(data):
    if not 24 <= len(data) <= MAX_BYTES:
        raise ValueError('capture size outside bound')
    magic, major, minor, zone, precision, snap, link = struct.unpack_from('<IHHIIII', data)
    if (magic, major, minor, link) != (0xa1b2c3d4, 2, 4, 1) or not 14 <= snap <= 2048:
        raise ValueError('unsupported capture format')
    offset = 24
    frames = []
    while offset < len(data):
        if len(frames) >= MAX_FRAMES or offset+16 > len(data):
            raise ValueError('record bound or truncated header')
        sec, usec, length, original = struct.unpack_from('<IIII', data, offset)
        offset += 16
        if not 14 <= length <= snap or original != length or usec >= 1000000 or offset+length > len(data):
            raise ValueError('truncated or invalid Ethernet record')
        packet = data[offset:offset+length]
        offset += length
        frame = {'time_us': sec*1000000+usec, 'bytes': length,
                 'destination_mac': packet[:6].hex(':'), 'source_mac': packet[6:12].hex(':'),
                 'ether_type': '%04x' % int.from_bytes(packet[12:14], 'big')}
        if frame['ether_type'] == '0806':
            if len(packet) >= 42 and packet[14:20] == b'\0\1\x08\0\6\4':
                frame.update(arp_operation=int.from_bytes(packet[20:22], 'big'),
                             arp_sender=socket.inet_ntoa(packet[28:32]), arp_target=socket.inet_ntoa(packet[38:42]))
            else:
                frame['malformed'] = 'ARP'
        elif frame['ether_type'] == '0800':
            ip = packet[14:]
            header = (ip[0] & 15)*4 if ip else 0
            total = int.from_bytes(ip[2:4], 'big')
            if len(ip) < 20 or ip[0] >> 4 != 4 or not 20 <= header <= total <= len(ip):
                frame['malformed'] = 'IPv4 length'
            elif checksum(ip[:header]):
                frame['malformed'] = 'IPv4 checksum'
            elif int.from_bytes(ip[6:8], 'big') & 0x3fff:
                frame['unsupported'] = 'fragmented IPv4'
            else:
                payload = ip[header:total]
                frame.update(source_ip=socket.inet_ntoa(ip[12:16]), destination_ip=socket.inet_ntoa(ip[16:20]), protocol=ip[9])
                if ip[9] == 1:
                    if len(payload) < 8 or checksum(payload):
                        frame['malformed'] = 'ICMP length/checksum'
                    else:
                        frame.update(icmp_type=payload[0], icmp_code=payload[1],
                                     identifier_sequence_hex=payload[4:8].hex(), payload_hex=payload[8:].hex())
                elif ip[9] == 6:
                    tcp_header = (payload[12] >> 4)*4 if len(payload) >= 20 else 0
                    pseudo = ip[12:20]+bytes([0, 6])+len(payload).to_bytes(2, 'big')
                    if not 20 <= tcp_header <= len(payload) or checksum(pseudo+payload):
                        frame['malformed'] = 'TCP length/checksum'
                    else:
                        frame.update(source_port=int.from_bytes(payload[:2], 'big'), destination_port=int.from_bytes(payload[2:4], 'big'),
                                     sequence=int.from_bytes(payload[4:8], 'big'), tcp_flags=payload[13], payload_hex=payload[tcp_header:].hex())
        frames.append(frame)
    return frames


def summarize(data):
    frames = decode(data)
    waiting = defaultdict(deque)
    pairs = []
    streams = defaultdict(dict)
    conflicts = 0
    for frame in frames:
        if frame.get('icmp_type') in (0, 8):
            key = (frame['identifier_sequence_hex'], frame['payload_hex'])
            if frame['icmp_type'] == 8:
                waiting[(frame['source_ip'], frame['destination_ip'], *key)].append(frame['time_us'])
            else:
                pending = waiting[(frame['destination_ip'], frame['source_ip'], *key)]
                if pending:
                    pairs.append({'request_source': frame['destination_ip'], 'identity_bytes': key[0],
                                  'tap_request_to_reply_ms': (frame['time_us']-pending.popleft())/1000})
        if 'source_port' in frame and frame['payload_hex']:
            key = '%s:%d -> %s:%d' % (frame['source_ip'], frame['source_port'], frame['destination_ip'], frame['destination_port'])
            previous = streams[key].get(frame['sequence'])
            if previous is not None and previous != frame['payload_hex']:
                conflicts += 1
            streams[key][frame['sequence']] = frame['payload_hex']
    return {'mode': 'retained-laboratory-capture', 'current_state': 'unknown',
            'sha256': hashlib.sha256(data).hexdigest(), 'capture_bytes': len(data),
            'frame_count': len(frames), 'frame_bytes': sum(f['bytes'] for f in frames),
            'first_us': frames[0]['time_us'] if frames else None, 'last_us': frames[-1]['time_us'] if frames else None,
            'ether_types': dict(Counter(f['ether_type'] for f in frames)),
            'malformed': dict(Counter(f['malformed'] for f in frames if 'malformed' in f)),
            'arp_operations': dict(Counter(str(f['arp_operation']) for f in frames if 'arp_operation' in f)),
            'icmp_pairs': pairs, 'unmatched_echo_requests': sum(map(len, waiting.values())),
            'tcp_payload_segments': {key: [{'sequence': seq, 'hex': payload} for seq, payload in sorted(parts.items())] for key, parts in streams.items()},
            'conflicting_tcp_segments': conflicts,
            'limits': 'Socket/TAP observations; no physical throughput, current guest identity or complete application receipt inferred.'}


if __name__ == '__main__':
    with Path(sys.argv[1]).open('rb') as source:
        data = source.read(MAX_BYTES+1)
    print(json.dumps(summarize(data), indent=2))
