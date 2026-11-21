"""Publish the two independently verified, completed CPU-program device exports.
Run only inside the network-none M5.9.1 V7 demonstration container. These exports
come from the earlier diskless CPU test, not from the running V7 guest driver.
"""
import hashlib
import http.client
import json
import os
import pathlib
import socket

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
assert set(os.listdir('/sys/class/net')) == {'lo'}

class LocalControl(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX)
        self.sock.settimeout(3)
        self.sock.connect('/tmp/m551-control/control.sock')

def request(method, route, data=None):
    connection = LocalControl('local')
    try:
        connection.request(method, route, body=json.dumps(data) if data else None)
        response = connection.getresponse()
        payload = response.read(4096)
        assert response.status == 200, payload
        return json.loads(payload)
    finally:
        connection.close()

for identifier, filename, expected in [
    ('lp11', 'lp11.out', '056cbc92a013b9c90650e6e73e870cba8a5b130b312935926a381c9123dfdae1'),
    ('punch', 'punch.bin', '6a86e3d92e3aff9fc10f607180240b577ffff02033ff3dbe5977b16d8b811317'),
]:
    assert hashlib.sha256((pathlib.Path('/work') / filename).read_bytes()).hexdigest() == expected
    status = request('GET', '/devices/status')
    device = next(row for row in status['devices'] if row['id'] == identifier)
    request('POST', '/devices/publish', {
        'instance': status['instance'], 'id': identifier, 'revision': device['revision'],
        'simulator_generation': 'm591-diskless-original-simh',
        'guest_generation': 'pdp11-device-programs', 'sha256': expected,
        'completed_and_verified': True,
    })
    print(identifier + ': completed CPU-device export published')
