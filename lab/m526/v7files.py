"""Bounded read-only extraction from this lab's V7 root filesystem.
PDP-11 longs store high 16-bit word first; packed addresses are high8,low8,mid8.
Only direct/single-indirect file blocks are supported; reject larger files.
Never use this helper to modify media or claim a live filesystem is consistent.
"""
from pathlib import Path
import struct

class V7Root:
    def __init__(self, path):
        self.path = Path(path)
        with self.path.open('rb') as stream:
            stream.seek(512)
            superblock = stream.read(512)
        self.inode_end = struct.unpack_from('<H', superblock)[0]
        self.blocks = self.long(superblock[2:6])
        assert 2 < self.inode_end < self.blocks and self.blocks * 512 <= self.path.stat().st_size

    @staticmethod
    def long(data):
        high, low = struct.unpack('<HH', data)
        return (high << 16) | low

    def block(self, number):
        assert self.inode_end <= number < self.blocks
        with self.path.open('rb') as stream:
            stream.seek(number * 512)
            data = stream.read(512)
        assert len(data) == 512
        return data

    def inode(self, number):
        assert 1 <= number <= (self.inode_end - 2) * 8
        with self.path.open('rb') as stream:
            stream.seek(1024 + (number - 1) * 64)
            raw = stream.read(64)
        mode = struct.unpack_from('<H', raw)[0]
        size = self.long(raw[8:12])
        assert size <= (10 + 128) * 512, 'larger files need a separately reviewed decoder'
        addresses = [(raw[i] << 16) | raw[i+1] | (raw[i+2] << 8) for i in range(12, 51, 3)]
        blocks = addresses[:10]
        if size > 5120:
            indirect = self.block(addresses[10])
            blocks.extend(self.long(indirect[i:i+4]) for i in range(0, 512, 4))
        data = b''.join(self.block(address) if address else bytes(512)
                        for address in blocks[:(size + 511)//512])[:size]
        return mode, data

    def read(self, path):
        number = 2
        for part in path.strip('/').split('/'):
            mode, data = self.inode(number)
            assert mode & 0o170000 == 0o040000, 'directory required'
            entries = {data[i+2:i+16].split(b'\0')[0].decode('ascii'): struct.unpack_from('<H', data, i)[0]
                       for i in range(0, len(data), 16)}
            number = entries[part]
            assert number
        mode, data = self.inode(number)
        return mode, data
