"""Negative controls, not reproductions of the original Go fault. Linux only."""
import os
from pathlib import Path
import signal
import sys
import tempfile
import unittest
from process_evidence import capture


class NativeStatusTests(unittest.TestCase):
    def test_exit_signal_timeout_and_exec_refusal_are_distinct(self):
        self.assertEqual(set(os.listdir('/sys/class/net')), {'lo'})
        with tempfile.TemporaryDirectory(prefix='m516-control-') as temporary:
            root = Path(temporary)
            explicit = capture([sys.executable, '-c', 'raise SystemExit(139)'], root / 'exit')
            self.assertEqual(explicit['exitCode'], 139)
            self.assertIsNone(explicit['signal'])
            signaled = capture([sys.executable, '-c', 'import os,signal; os.kill(os.getpid(),signal.SIGSEGV)'], root / 'signal')
            self.assertEqual(signaled['signal'], signal.SIGSEGV)
            self.assertIsNone(signaled['exitCode'])
            timeout = capture([sys.executable, '-c', 'import time; time.sleep(20)'], root / 'timeout', timeout=.1)
            self.assertEqual(timeout['signal'], signal.SIGKILL)
            self.assertIn('deadline-kill', [event['event'] for event in timeout['events']])
            refused = root / 'no-execute'
            refused.write_text('not executable')
            refused.chmod(0o600)
            failure = capture([str(refused)], root / 'permission')
            self.assertEqual(failure['preExecFailure']['errno'], 13)
            for result in [explicit, signaled, timeout, failure]:
                self.assertEqual(result['events'][-1]['event'], 'reaped')
            self.assertNotEqual(explicit['nativeWaitStatus'], signaled['nativeWaitStatus'])
            # All controls passed; retain a sanitized summary outside temporary data.
            destination = os.environ.get('M516_CONTROL_RESULT')
            if destination:
                import json
                Path(destination).write_text(json.dumps({'explicit139': explicit, 'signal11': signaled,
                    'timeout': timeout, 'permission': failure}, indent=2) + '\n')


if __name__ == '__main__':
    unittest.main()
