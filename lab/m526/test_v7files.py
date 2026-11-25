"""Synthetic filesystem bounds only; no historical disk required."""
import hashlib
from pathlib import Path
import struct
import tempfile
import unittest
from v7files import V7Root

class DecoderTests(unittest.TestCase):
    def test_word_order_bounds_and_readonly(self):
        self.assertEqual(V7Root.long(bytes.fromhex('34127856')), 0x12345678)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'synthetic'
            data = bytearray(512 * 8)
            struct.pack_into('<HHH', data, 512, 3, 0, 8)
            # inode 1: a one-byte regular file in block 3.
            struct.pack_into('<H', data, 1024, 0o100600)
            data[1034:1036] = b'\x01\x00'
            data[1036:1039] = b'\x00\x03\x00'
            data[1536] = 65
            path.write_bytes(data)
            before = hashlib.sha256(data).digest()
            reader = V7Root(path)
            self.assertEqual(reader.inode(1)[1], b'A')
            for block in [0, 2, 8]:
                with self.assertRaises(AssertionError): reader.block(block)
            with self.assertRaises(AssertionError): reader.inode(9)
            self.assertEqual(hashlib.sha256(path.read_bytes()).digest(), before)

if __name__ == '__main__': unittest.main()
