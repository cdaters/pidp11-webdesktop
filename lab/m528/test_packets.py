"""Synthetic offline fixtures only; no guest, network socket or private capture."""
import struct
import unittest
from packets import MAX_BYTES, MAX_FRAMES, checksum, decode, summarize


def capture(*frames):
    header = struct.pack('<IHHIIII', 0xa1b2c3d4, 2, 4, 0, 0, 2048, 1)
    return header + b''.join(struct.pack('<IIII', 1, i*1000, len(f), len(f))+f for i, f in enumerate(frames))


def ipv4(payload, protocol=1, reverse=False):
    addresses = bytes([172,30,28,1,172,30,28,2])
    if reverse:
        addresses = addresses[4:] + addresses[:4]
    ip = struct.pack('!BBHHHBBH', 0x45, 0, 20+len(payload), 0, 0, 64, protocol, 0)+addresses
    ip = ip[:10]+struct.pack('!H', checksum(ip))+ip[12:]
    return bytes.fromhex('0200005280020200005280010800')+ip+payload


def echo(reply=False):
    payload = struct.pack('!BBHHH', 0 if reply else 8, 0, 0, 123, 1)+b'fixture'
    payload = payload[:2]+struct.pack('!H',checksum(payload))+payload[4:]
    return ipv4(payload, reverse=reply)


def tcp(data, sequence=1):
    segment = struct.pack('!HHIIBBHHH', 1000, 2300, sequence, 0, 0x50, 0x18, 4096, 0, 0)+data
    pseudo = bytes([172,30,28,1,172,30,28,2,0,6])+len(segment).to_bytes(2,'big')
    segment = segment[:16]+struct.pack('!H',checksum(pseudo+segment))+segment[18:]
    return ipv4(segment, 6)


class CaptureTests(unittest.TestCase):
    def test_empty_capture_retains_unknown_state(self):
        result = summarize(capture())
        self.assertEqual(result['current_state'], 'unknown')
        self.assertEqual(result['frame_count'], 0)

    def test_echo_pairs_duplicate_requests_once_each(self):
        result = summarize(capture(echo(),echo(),echo(True),echo(True),echo(True)))
        self.assertEqual(len(result['icmp_pairs']), 2)
        self.assertEqual(result['unmatched_echo_requests'], 0)

    def test_unanswered_request_is_not_success(self):
        self.assertEqual(summarize(capture(echo()))['unmatched_echo_requests'], 1)

    def test_bad_icmp_is_not_paired(self):
        bad = bytearray(echo(True)); bad[-1] ^= 1
        result = summarize(capture(echo(), bytes(bad)))
        self.assertEqual(result['icmp_pairs'], [])
        self.assertEqual(result['malformed'], {'ICMP length/checksum':1})

    def test_bad_ipv4_checksum(self):
        bad = bytearray(echo()); bad[22] ^= 1
        self.assertEqual(decode(capture(bytes(bad)))[0]['malformed'], 'IPv4 checksum')

    def test_short_ipv4(self):
        self.assertEqual(decode(capture(echo()[:24]))[0]['malformed'], 'IPv4 length')

    def test_tcp_duplicates_and_conflicts_are_segments(self):
        result = summarize(capture(tcp(b'a'), tcp(b'a'), tcp(b'b')))
        self.assertEqual(result['conflicting_tcp_segments'], 1)
        self.assertEqual(len(next(iter(result['tcp_payload_segments'].values()))), 1)
        self.assertNotIn('application_complete', result)

    def test_corrupt_tcp_checksum(self):
        bad = bytearray(tcp(b'a')); bad[-1] ^= 1
        self.assertEqual(decode(capture(bytes(bad)))[0]['malformed'], 'TCP length/checksum')

    def test_truncated_record(self):
        with self.assertRaises(ValueError): decode(capture(echo())[:-1])

    def test_truncated_record_header(self):
        with self.assertRaises(ValueError): decode(capture()+b'\0')

    def test_snapshot_truncation_rejected(self):
        bad = bytearray(capture(echo()));struct.pack_into('<I',bad,36,len(echo())+1)
        with self.assertRaises(ValueError): decode(bytes(bad))

    def test_unsupported_link_type(self):
        bad = bytearray(capture());struct.pack_into('<I',bad,20,101)
        with self.assertRaises(ValueError): decode(bytes(bad))

    def test_oversize_input(self):
        with self.assertRaises(ValueError): decode(b'\0'*(MAX_BYTES+1))

    def test_frame_limit(self):
        record = struct.pack('<IIII',1,0,14,14)+b'\0'*14
        with self.assertRaises(ValueError): decode(capture()+record*(MAX_FRAMES+1))

    def test_invalid_timestamp(self):
        bad=bytearray(capture(echo()));struct.pack_into('<I',bad,28,1000000)
        with self.assertRaises(ValueError): decode(bytes(bad))


if __name__ == '__main__':
    unittest.main()
