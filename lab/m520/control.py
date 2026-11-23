"""Private, bounded M5.20 observation approvals; no public monitor interface."""
import http.client
import json
import socket


class Control(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX)
        self.sock.settimeout(3)
        self.sock.connect('/tmp/m520-control/control.sock')


def request(method, route, payload=None):
    connection = Control('local')
    try:
        connection.request(method, route, json.dumps(payload) if payload is not None else None)
        response = connection.getresponse()
        data = response.read(8192)
        assert response.status == 200, data
        return json.loads(data)
    finally:
        connection.close()


def approve(identifier, operation, simulator, guest, **fields):
    status = request('GET', '/streams/status')
    row = next(row for row in status['devices'] if row['id'] == identifier)
    return request('POST', '/streams/' + operation, {
        'instance': status['instance'], 'id': identifier, 'revision': row['revision'],
        'simulator_generation': simulator, 'guest_generation': guest,
        'producer_verified': True, **fields,
    })
