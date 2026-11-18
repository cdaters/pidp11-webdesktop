"""Mac shell: create fresh, private pilot credentials and a loopback certificate.

Requires the local openssl command. Creates a new directory, refuses reuse, and
never installs trust, contacts a Pi, or writes into an existing installation.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("destination", type=Path)
args = parser.parse_args()
os.umask(0o077)
args.destination.mkdir(mode=0o700)  # Deliberately fail if the destination exists.
root = args.destination.resolve()
for name in ["terminal", "observer"]:
    (root / (name + ".token")).write_text(secrets.token_hex(32))
(root / "terminals.json").write_text(json.dumps([{
    "id": "unix7-dc0", "label": "UNIX V7 Pi pilot · DC11 tty00",
    "address": "127.0.0.1:40100", "kind": "raw-guest-line",
}], indent=2) + "\n")
(root / "certificate.cnf").write_text("""[req]
prompt = no
distinguished_name = subject
x509_extensions = server
[subject]
CN = PiDP11 M5.3 temporary loopback pilot
[server]
subjectAltName = IP:127.0.0.1
basicConstraints = critical,CA:false
keyUsage = critical,digitalSignature
extendedKeyUsage = serverAuth
""")
subprocess.run(["openssl", "ecparam", "-genkey", "-name", "prime256v1",
                "-out", str(root / "terminal-key.pem")], check=True)
subprocess.run(["openssl", "req", "-new", "-x509", "-sha256", "-days", "1",
                "-key", str(root / "terminal-key.pem"), "-out", str(root / "terminal-cert.pem"),
                "-config", str(root / "certificate.cnf")], check=True)
print("Fresh pilot files created; certificate lasts one day. No trust settings changed.")
