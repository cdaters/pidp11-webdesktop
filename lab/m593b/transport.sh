#!/bin/sh
# Disposable pidp11-m593b ARM64 Linux only. Requires openssh-server installed
# during VM preparation; external interface is now DOWN. No Pi or host SSH use.
set -eu
[ "$(hostname)" = pidp11-m593b ]
[ "$(uname -m)" = aarch64 ]
[ "$(cat /sys/class/net/eth0/operstate)" = down ]
root=/root/m593b-transport
[ ! -e "$root" ]; mkdir -m 700 "$root"; cd "$root"
umask 077
ssh-keygen -q -t ed25519 -N '' -f host-key
ssh-keygen -q -t ed25519 -N '' -f client-key
printf 'restrict,port-forwarding,permitopen="127.0.0.1:11436",command="/bin/false" ' > authorized_keys
cat client-key.pub >> authorized_keys
printf '[127.0.0.1]:2222 ' > known_hosts
cat host-key.pub >> known_hosts
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 1 -subj /CN=127.0.0.1 -addext subjectAltName=IP:127.0.0.1 2>/dev/null
openssl rand -hex 24 > token
printf 'header = "Authorization: Bearer %s"\n' "$(cat token)" > curl-secret
cat > sshd.conf <<CONFIG
Port 2222
ListenAddress 127.0.0.1
HostKey $root/host-key
AuthorizedKeysFile $root/authorized_keys
PidFile $root/sshd.pid
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
PermitRootLogin prohibit-password
AllowUsers root
PermitTTY no
AllowAgentForwarding no
X11Forwarding no
AllowTcpForwarding local
AllowStreamLocalForwarding no
PermitOpen 127.0.0.1:11436
ForceCommand /bin/false
StrictModes yes
CONFIG
mkdir -p /run/sshd
fixture_pid= gateway_pid= sshd_pid= tunnel_pid=
cleanup(){
 for pid in "$tunnel_pid" "$gateway_pid" "$fixture_pid" "$sshd_pid"; do
  if [ -n "$pid" ]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi
 done
}
trap cleanup EXIT INT TERM
/tmp/model-fixture > fixture.log 2>&1 & fixture_pid=$!
start_gateway(){
 /tmp/model-gateway -cert "$root/cert.pem" -key "$root/key.pem" -token-file "$root/token" -model fixture -runner http://127.0.0.1:19191/api/chat > gateway.log 2>&1 & gateway_pid=$!
}
start_gateway
/usr/sbin/sshd -D -e -f "$root/sshd.conf" > sshd.log 2>&1 & sshd_pid=$!
sleep 1
ssh -N -T -p 2222 -i client-key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$root/known_hosts" -o ExitOnForwardFailure=yes -o ServerAliveInterval=2 -o ServerAliveCountMax=1 -L 127.0.0.1:11435:127.0.0.1:11436 root@127.0.0.1 > tunnel.log 2>&1 & tunnel_pid=$!
sleep 1
base=https://127.0.0.1:11435
[ "$(curl -sS --cacert cert.pem -o unauth.json -w '%{http_code}' "$base/v1/models")" = 401 ]
[ "$(curl -sS --cacert cert.pem --config curl-secret -o models.json -w '%{http_code}' "$base/v1/models")" = 200 ]
[ "$(curl -sS --cacert cert.pem --config curl-secret -o answer.json -w '%{http_code}' -H 'Content-Type: application/json' -d '{"model":"fixture","messages":[{"role":"user","content":"test"}]}' "$base/v1/chat/completions")" = 200 ]
grep -q 'DETERMINISTIC TRANSPORT FIXTURE' answer.json
[ "$(curl -sS --cacert cert.pem --config curl-secret -o denied.json -w '%{http_code}' -X POST "$base/api/pull")" = 404 ]
# A wrong host pin cannot establish the control connection.
if ssh -N -T -p 2222 -i client-key -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/dev/null -o ConnectTimeout=2 root@127.0.0.1 > bad-pin.log 2>&1; then exit 1; fi
# End the runner fixture: no automatic replacement, retry or hidden provider.
kill "$fixture_pid"; wait "$fixture_pid" 2>/dev/null || true; fixture_pid=
[ "$(curl -sS --cacert cert.pem --config curl-secret -o outage.json -w '%{http_code}' -H 'Content-Type: application/json' -d '{"model":"fixture","messages":[{"role":"user","content":"test"}]}' "$base/v1/chat/completions")" = 502 ]
# Tunnel loss makes the forwarded endpoint unavailable.
kill "$tunnel_pid"; wait "$tunnel_pid" 2>/dev/null || true; tunnel_pid=
if curl -sS --connect-timeout 2 --cacert cert.pem --config curl-secret "$base/v1/models" > after-loss.json 2>after-loss.log; then exit 1; fi
printf '%s\n' 'PASS: ARM64 loopback SSH forward, pinned host key, TLS validation, token auth, fixed target, refused management, runner outage and tunnel loss. Synthetic provider only; no guest.'
