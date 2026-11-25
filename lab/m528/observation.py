"""Explicitly selected retained evidence, with no live network or guest authority.
The expected identity comes from the operator's capture record, never IP/MAC reuse.
"""
import argparse
import json
from pathlib import Path
from packets import MAX_BYTES, summarize


def observe(data, identity, expected):
    """Reject a substituted capture identity; every successful result stays historical."""
    for field in ('observation_generation', 'guest_identity', 'network_namespace'):
        if not expected.get(field) or identity.get(field) != expected[field]:
            raise ValueError('Retired or mismatched observation: '+field)
    links = [link for link in identity.get('links', []) if link.get('ifname') == 'tap528']
    if len(links) != 1 or links[0].get('ifindex') != expected.get('interface_index'):
        raise ValueError('Retired or mismatched interface index')
    if identity.get('identity_basis') != 'independent operator attestation; not inferred from address':
        raise ValueError('Independent guest attestation required')
    result = summarize(data)
    result['observation'] = {**expected, 'controller': 'XU/DEUNA', 'guest_interface': 'de0',
        'identity_basis': identity['identity_basis'], 'backend': 'isolated TAP',
        'freshness': 'retained; live state unavailable'}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--generation', required=True)
    parser.add_argument('--guest-instance', required=True)
    parser.add_argument('--namespace', required=True)
    parser.add_argument('--interface-index', required=True, type=int)
    args = parser.parse_args()
    with (args.directory/'identity.json').open('rb') as stream:
        raw = stream.read(16385)
    if len(raw) > 16384:
        raise ValueError('Identity exceeds bound')
    with (args.directory/'frames.pcap').open('rb') as stream:
        data = stream.read(MAX_BYTES+1)
    result = observe(data, json.loads(raw), {'observation_generation':args.generation,
        'guest_identity':args.guest_instance, 'network_namespace':args.namespace,
        'interface_index':args.interface_index})
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
