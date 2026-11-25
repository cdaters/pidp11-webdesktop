"""Independent, read-only gate for the single owned TAP lab; sends no packets."""
import grp
import json
import os
from pathlib import Path
import subprocess


def inspect():
    def command(*args):
        return subprocess.check_output(args, text=True)
    assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
    assert set(os.listdir('/sys/class/net')) == {'lo', 'tap528'}
    assert not Path('/etc/resolv.conf').read_text().strip()
    assert not any(value for key, value in os.environ.items() if key.lower().endswith('_proxy'))
    assert Path('/proc/sys/net/ipv4/ip_forward').read_text().strip() == '0'
    links = json.loads(command('ip', '-j', '-d', 'link', 'show'))
    tap = next(row for row in links if row['ifname'] == 'tap528')
    assert 'master' not in tap and tap['address'] == '02:00:00:52:80:01'
    assert tap['linkinfo']['info_kind'] == 'tun'
    detail = tap['linkinfo']['info_data']
    group = detail['group']
    group_id = grp.getgrnam(group).gr_gid if isinstance(group, str) else group
    assert detail['type'] == 'tap' and detail['user'] == 501 and group_id == 20
    routes = json.loads(command('ip', '-j', 'route', 'show', 'table', 'all'))
    for row in routes:
        assert row.get('dev') in ('lo', 'tap528') and row.get('dst') != 'default'
        assert 'gateway' not in row
    assert not json.loads(command('ip', '-j', '-6', 'route', 'show', 'table', 'all'))
    probe = subprocess.run(['ip', 'route', 'get', '198.51.100.1'], capture_output=True, text=True)
    assert probe.returncode != 0 and 'unreachable' in probe.stderr.lower()
    addresses = json.loads(command('ip', '-j', 'address', 'show'))
    actual = next(row for row in addresses if row['ifname'] == 'tap528')['addr_info']
    assert len(actual) == 1 and actual[0]['local'] == '172.30.28.1' and actual[0]['prefixlen'] == 30
    return {'network_namespace': os.readlink('/proc/self/ns/net'), 'links': links,
            'addresses': addresses, 'routes': routes, 'external_route_query': probe.stderr.strip(),
            'dns_empty': True, 'proxy_empty': True, 'forwarding': False}


if __name__ == '__main__':
    print(json.dumps(inspect(), indent=2))
