"""Independently verify guest-recovered RT-11 files and authored TAP structure.
Read-only, quiescent working disk required. Directory decoding follows DEC
AA-PD6PA-TC section 1.1.2. This never creates guest output or modifies a disk.
"""
import hashlib
import json
from pathlib import Path
import struct
import sys

ALPHABET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ$.%0123456789'


def radix50(word):
    assert 0 <= word < 64000
    return ''.join(ALPHABET[(word // divisor) % 40] for divisor in (1600, 40, 1))


def files_from_disk(path):
    image = path.read_bytes()
    assert len(image) == 10478080, 'Only the verified lab RL02 layout'
    # The retained distribution uses the standard first directory block six.
    segment = 1
    seen = set()
    result = {}
    while segment:
        assert 1 <= segment <= 31 and segment not in seen
        seen.add(segment)
        offset = (6 + 2 * (segment - 1)) * 512
        words = struct.unpack_from('<512H', image, offset)
        total, following, highest, extra, block = words[:5]
        assert 1 <= total <= 31 and extra % 2 == 0 and extra <= 64
        index = 5
        while index < len(words):
            status = words[index]
            if status & 0o4000:
                break
            assert index + 7 + extra // 2 <= len(words)
            name = (radix50(words[index + 1]) + radix50(words[index + 2])).rstrip() + '.' + radix50(words[index + 3]).rstrip()
            length = words[index + 4]
            assert (block + length) * 512 <= len(image)
            if status & 0o2000:
                assert name not in result and not status & 0o20, 'Duplicate or unsupported prefix block'
                result[name] = image[block * 512:(block + length) * 512]
            block += length
            index += 7 + extra // 2
        else:
            raise ValueError('Missing directory end marker')
        segment = following
    return result


def tape_records(path):
    data = path.read_bytes()
    pos = 0
    records = []
    while pos < len(data):
        start = pos
        assert pos + 4 <= len(data)
        size, = struct.unpack_from('<I', data, pos)
        pos += 4
        assert size <= 512 and size in (0, 512), 'Unexpected record or error flag'
        payload = data[pos:pos + size]
        if size:
            assert len(payload) == size
            pos += size + (size % 2)
            trailer, = struct.unpack_from('<I', data, pos)
            assert trailer == size
            pos += 4
        records.append({'offset': start, 'next': pos, 'bytes': size, 'label': payload[:4].decode('ascii') if payload[:4] in (b'VOL1', b'HDR1', b'EOF1') else ('filemark' if not size else 'data')})
    return records


def verify(root):
    expected = json.loads((root / 'tape/expected.json').read_text())
    tape = root / 'tape/input.tap'
    assert hashlib.sha256(tape.read_bytes()).hexdigest() == expected['sha256']
    actual = files_from_disk(root / 'disk0.work')
    matches = []
    for src, dst in [('RECA.TXT', 'READA.TXT'), ('RECB.TXT', 'READB.TXT')]:
        source = (root / 'tape' / src).read_bytes()
        assert actual[dst] == source, (src, dst, len(actual[dst]))
        matches.append({'source': src, 'recovered': dst, 'bytes': len(source), 'sha256': hashlib.sha256(source).hexdigest(), 'exact_match': True})
    return {'guest_output_files': matches, 'tape_sha256_unchanged': expected['sha256'], 'tape_records': tape_records(tape)}


if __name__ == '__main__':
    print(json.dumps(verify(Path(sys.argv[1])), indent=2))
