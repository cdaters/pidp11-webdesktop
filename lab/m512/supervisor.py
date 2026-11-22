"""Linux-only, read-only observer for an explicitly owned disposable SIMH.

This laboratory tool is NOT installed by the package. It uses a pidfd to pin
process lifetime and verifies listening/connected TCP sockets owned by that
process. It never signals, launches, reads memory from, or controls SIMH.
An unchanged process/socket does not identify its guest OS. The operator must
stop this observer/bridge before a guest change and supply fresh approval.
"""

import argparse
from contextlib import closing
import hashlib
import http.client
import json
import os
import pathlib
import select
import socket
import stat
import time


class UnixHTTP(http.client.HTTPConnection):
    def __init__(self, path):
        super().__init__("local", timeout=0.35)
        self.path = path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX)
        self.sock.settimeout(self.timeout)
        self.sock.connect(self.path)


def control(path, operation, body=None):
    with closing(UnixHTTP(path)) as client:
        client.request(
            "GET" if body is None else "POST",
            "/" + operation,
            None if body is None else json.dumps(body),
            {"Content-Type": "application/json"},
        )
        response = client.getresponse()
        data = response.read(8193)
        if response.status != 200 or len(data) > 8192:
            raise RuntimeError("private control refused or exceeded bound")
        return json.loads(data)


def bounded(path, maximum=1048576):
    with open(path, "rb") as source:
        data = source.read(maximum + 1)
    if len(data) > maximum:
        raise RuntimeError("observation exceeds bound")
    return data


def tcp_address(value):
    host, port = value.split(":")
    # This bounded experiment accepts IPv4 loopback only, not arbitrary hosts.
    if host != "127.0.0.1":
        raise RuntimeError("explicit IPv4 loopback required")
    return "0100007F:%04X" % int(port)


class PendingAcceptance(RuntimeError):
    """The kernel connected; SIMH has not yet accepted its descriptor."""


class Producer:
    def __init__(self, pid, address):
        if pid <= 1:
            raise RuntimeError("explicit non-init owned PID required")
        self.pid = pid
        self.address = tcp_address(address)
        self.pidfd = os.pidfd_open(pid)
        self.poll = select.poll()
        self.poll.register(self.pidfd, select.POLLIN)
        self.root = pathlib.Path("/proc") / str(pid)
        try:
            self.identity = self.fingerprint()
            self.listener = self.observe()
        except BaseException:
            os.close(self.pidfd)
            raise

    def close(self):
        os.close(self.pidfd)

    def fingerprint(self):
        if self.poll.poll(0):
            raise RuntimeError("producer exited")
        data = bounded(self.root / "stat", 4096).decode()
        fields = data[data.rfind(")") + 1 :].split()
        if len(fields) < 20 or fields[0] in ("Z", "X"):
            raise RuntimeError("producer not live")
        namespace = os.readlink(self.root / "ns/net")
        if namespace != os.readlink("/proc/self/ns/net"):
            raise RuntimeError("network namespace mismatch")
        executable = (self.root / "exe").stat()
        values = [
            self.pid,
            fields[19],
            namespace,
            os.readlink(self.root / "ns/pid"),
            bounded("/proc/sys/kernel/random/boot_id", 128).decode(),
            executable.st_dev,
            executable.st_ino,
        ]
        if self.poll.poll(0):
            raise RuntimeError("producer exited during observation")
        return hashlib.sha256(json.dumps(values).encode()).hexdigest()

    def observe(self, peer=None):
        if self.fingerprint() != self.identity:
            raise RuntimeError("producer identity changed")
        owned = set()
        with os.scandir(self.root / "fd") as entries:
            for count, entry in enumerate(entries):
                if count >= 4096:
                    raise RuntimeError("producer descriptor bound exceeded")
                try:
                    link = os.readlink(entry.path)
                except FileNotFoundError:
                    continue
                if link.startswith("socket:["):
                    owned.add(link[8:-1])
        rows = [
            line.split()
            for line in bounded("/proc/self/net/tcp").decode().splitlines()[1:]
        ]
        listeners = [
            row[9]
            for row in rows
            if len(row) >= 10 and row[1] == self.address and row[3] == "0A"
        ]
        if len(listeners) != 1 or listeners[0] not in owned:
            raise RuntimeError("unique producer-owned listener absent")
        if peer is not None:
            connected = [
                row[9]
                for row in rows
                if len(row) >= 10
                and row[1] == self.address
                and row[2] == tcp_address(peer)
                and row[3] == "01"
            ]
            if len(connected) != 1 or connected[0] not in owned:
                raise PendingAcceptance(
                    "connected socket not owned by approved producer"
                )
        if self.fingerprint() != self.identity:
            raise RuntimeError("producer changed during socket observation")
        return hashlib.sha256((self.identity + ":" + listeners[0]).encode()).hexdigest()


def run(args):
    if os.environ.get("PIDP11_ISOLATED_LAB") != "1":
        raise RuntimeError("isolated lab opt-in required")
    if not args.guest_and_line_verified or len(args.operator_epoch) < 16:
        raise RuntimeError("fresh independent operator verification required")
    producer = Producer(args.pid, args.address)
    try:
        socket_info = os.stat(args.socket, follow_symlinks=False)
        if not stat.S_ISSOCK(socket_info.st_mode):
            raise RuntimeError("private control socket required")
        status = control(args.socket, "status")
        line = next(line for line in status["lines"] if line["id"] == args.endpoint)
        if not line["supervision_required"] or line["state"] not in (
            "detached",
            "unavailable",
        ):
            raise RuntimeError("fresh supervised detached line required")
        proof = {
            "process": producer.identity,
            "endpoint": producer.listener,
            "operator_epoch": args.operator_epoch,
        }
        status = control(
            args.socket,
            "attach",
            {
                "instance": status["instance"],
                "id": args.endpoint,
                "revision": line["revision"],
                "guest_and_line_verified": True,
                "supervision": proof,
            },
        )
        instance = status["instance"]
        line = next(line for line in status["lines"] if line["id"] == args.endpoint)
        revision = line["revision"]
        sequence = 1
        acceptance_deadline = time.monotonic() + 2.5
        while True:
            current_socket = os.stat(args.socket, follow_symlinks=False)
            if (socket_info.st_dev, socket_info.st_ino) != (
                current_socket.st_dev,
                current_socket.st_ino,
            ):
                raise RuntimeError("control listener replaced")
            try:
                observed = producer.observe(line["local_address"])
            except PendingAcceptance:
                # TCP connect can finish before SIMH's polling accepts the fd.
                # No browser access exists yet; do not retry an attach operation.
                if sequence != 1 or time.monotonic() >= acceptance_deadline:
                    raise
                time.sleep(0.02)
                continue
            if observed != producer.listener:
                raise RuntimeError("terminal listener replaced")
            status = control(
                args.socket,
                "renew",
                {
                    "instance": instance,
                    "id": args.endpoint,
                    "revision": revision,
                    "sequence": sequence,
                    "supervision": proof,
                },
            )
            if sequence == 1:
                print(
                    "Supervised attachment active; OS remains operator-attested",
                    flush=True,
                )
            sequence += 1
            time.sleep(0.2)
    finally:
        producer.close()
        # No detach with a newly fetched revision: a newer owner's approval must
        # never be invalidated by this failed observer. The original lease expires.


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pid", type=int, required=True)
    parser.add_argument("--address", required=True)
    parser.add_argument("--socket", required=True)
    parser.add_argument("--endpoint", required=True)
    parser.add_argument("--operator-epoch", required=True)
    parser.add_argument("--guest-and-line-verified", action="store_true")
    run(parser.parse_args())
