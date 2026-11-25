"""Four explicitly bounded peer-to-guest frames, only the private TAP/MAC/IP.
Two identical valid ICMP echo requests, one bad ICMP checksum, one truncated IPv4.
This one-shot diagnostic is separate from the passive observer and has no service API.
"""
import socket
import struct
import time
from isolation import inspect

inspect()
def checksum(data):
    if len(data) % 2:
        data += b'\0'
    total=sum(struct.unpack('!%dH'%(len(data)//2),data))
    while total >> 16:
        total = (total & 65535) + (total >> 16)
    return (~total)&65535
payload=b'M528-PEER-PROBE'
icmp=struct.pack('!BBHHH',8,0,0,0x5280,1)+payload
icmp=icmp[:2]+struct.pack('!H',checksum(icmp))+icmp[4:]
ip=struct.pack('!BBHHHBBH4s4s',0x45,0,20+len(icmp),0x5280,0,64,1,0,socket.inet_aton('172.30.28.1'),socket.inet_aton('172.30.28.2'))
ip=ip[:10]+struct.pack('!H',checksum(ip))+ip[12:]
ether=bytes.fromhex('0200005280020200005280010800')
frame=ether+ip+icmp
bad = bytearray(frame)
bad[36] ^= 1
with socket.socket(socket.AF_PACKET,socket.SOCK_RAW,socket.htons(3)) as sender:
    sender.bind(('tap528',0))
    for label,data in [('valid',frame),('duplicate',frame),('bad-icmp-checksum',bytes(bad)),('truncated-ipv4',ether+ip[:10])]:
        assert sender.send(data)==len(data)
        print(label,data.hex(),flush=True)
        time.sleep(.2)
