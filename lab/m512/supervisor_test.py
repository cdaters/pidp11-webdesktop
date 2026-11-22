"""Disposable Linux tests: real pidfds and sockets, no physical hardware."""

import json, os, pathlib, socket, subprocess, sys, time, unittest
from supervisor import Producer, PendingAcceptance

CHILD = r"""
import socket,sys,os
s=socket.socket();s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
s.bind(('127.0.0.1',0));s.listen();port=s.getsockname()[1]
print(port,flush=True)
peers=[]
for command in sys.stdin:
 if command.strip()=='accept': peers.append(s.accept()[0]);print('accepted',flush=True)
 elif command.strip()=='replace':
  s.close();s=socket.socket();s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);s.bind(('127.0.0.1',port));s.listen();print('replaced',flush=True)
 elif command.strip()=='exec':
  print('exec',flush=True);os.execl('/bin/sleep','sleep','30')
 elif command.strip()=='exit': break
"""


class IdentityTests(unittest.TestCase):
    def child(self):
        child = subprocess.Popen(
            [sys.executable, "-u", "-c", CHILD],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
        )
        self.addCleanup(self.stop, child)
        address = "127.0.0.1:" + child.stdout.readline().strip()
        return child, address

    def stop(self, child):
        if child.poll() is None:
            child.terminate()
        child.wait(timeout=3)
        child.stdin.close()
        child.stdout.close()

    def observer(self, child, address):
        observer = Producer(child.pid, address)
        self.addCleanup(observer.close)
        return observer

    def command(self, child, command):
        child.stdin.write(command + "\n")
        child.stdin.flush()
        return child.stdout.readline().strip()

    def test_live_socket_then_listener_replacement(self):
        child, address = self.child()
        observer = self.observer(child, address)
        peer = socket.create_connection(("127.0.0.1", int(address.split(":")[1])))
        self.addCleanup(peer.close)
        self.assertEqual(self.command(child, "accept"), "accepted")
        local = "%s:%d" % peer.getsockname()
        self.assertEqual(observer.observe(local), observer.listener)
        self.assertEqual(self.command(child, "replace"), "replaced")
        self.assertNotEqual(observer.observe(local), observer.listener)

    def test_other_process_cannot_claim_endpoint(self):
        child, address = self.child()
        other, _ = self.child()
        # Explicit cleanup because failed construction has already opened pidfd.
        before = len(list(pathlib.Path("/proc/self/fd").iterdir()))
        with self.assertRaises(RuntimeError):
            Producer(other.pid, address)
        self.assertEqual(len(list(pathlib.Path("/proc/self/fd").iterdir())), before)

    def test_exit_and_simulated_pid_path_reuse(self):
        child, address = self.child()
        observer = self.observer(child, address)
        self.command(child, "exit")
        child.wait(timeout=3)
        replacement, _ = self.child()
        # Deliberately redirect pathname lookup, modelling recycled PID lookup.
        # The real kernel PID was not recycled; the pinned old pidfd must reject.
        observer.root = pathlib.Path("/proc") / str(replacement.pid)
        with self.assertRaisesRegex(RuntimeError, "exited"):
            observer.observe()

    def test_exec_changes_identity_without_process_exit(self):
        child, address = self.child()
        observer = self.observer(child, address)
        self.command(child, "exec")
        for _ in range(100):
            if (observer.root / "exe").resolve() == pathlib.Path("/usr/bin/sleep"):
                break
            time.sleep(0.01)
        self.assertEqual(observer.poll.poll(0), [])
        with self.assertRaises(RuntimeError):
            observer.observe()


if __name__ == "__main__":
    assert os.environ.get("PIDP11_ISOLATED_LAB") == "1"
    unittest.main()
