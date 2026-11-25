"""Retained-capture identity checks, without opening a socket or a guest."""
import unittest
from observation import observe
from test_packets import capture


class ObservationTests(unittest.TestCase):
    def setUp(self):
        self.expected = {'observation_generation':'capture-A', 'guest_identity':'guest-A',
                         'network_namespace':'namespace-A', 'interface_index':2}
        self.identity = {**self.expected, 'links':[{'ifname':'tap528','ifindex':2}],
                         'identity_basis':'independent operator attestation; not inferred from address'}

    def test_valid_is_still_historical(self):
        self.assertEqual(observe(capture(), self.identity, self.expected)['current_state'], 'unknown')

    def test_replacement_generation_rejected(self):
        self.identity['observation_generation'] = 'capture-B'
        with self.assertRaises(ValueError): observe(capture(),self.identity,self.expected)

    def test_guest_change_same_interface_rejected(self):
        self.identity['guest_identity'] = 'guest-B'
        with self.assertRaises(ValueError): observe(capture(),self.identity,self.expected)

    def test_namespace_change_rejected(self):
        self.identity['network_namespace'] = 'namespace-B'
        with self.assertRaises(ValueError): observe(capture(),self.identity,self.expected)

    def test_reused_interface_name_rejected(self):
        self.identity['links'][0]['ifindex'] = 3
        with self.assertRaises(ValueError): observe(capture(),self.identity,self.expected)

    def test_absent_expected_identity_rejected(self):
        with self.assertRaises(ValueError): observe(capture(),self.identity,{})

    def test_mac_is_not_attestation(self):
        self.identity['identity_basis'] = 'MAC inferred'
        with self.assertRaises(ValueError): observe(capture(),self.identity,self.expected)


if __name__ == '__main__':
    unittest.main()
