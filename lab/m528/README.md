# Isolated DEUNA / 2.11BSD Ethernet laboratory

This directory contains laboratory tools, not an installer or browser networking
service. Read the [M5.28 report](../../docs/lab/M5.28.md) before replay. The completed
experiment used original source and fresh legitimate guest copies on Mac-hosted
ARM64 Linux. No guest image, simulator executable, PCAP or private transcript is
included here. The ordinary Go/TypeScript application is unchanged.

## Preconditions and ownership

These are reconstructed replay instructions, not a promise that an arbitrary host
has the retained image, source or guest. Use the existing
[original-source laboratory](../../docs/lab/M3.md) and [BSD evidence](../m591/README.md).
Verify revision `26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75`, its retained source archive
and the relevant 270 source hashes against your independent record. An extracted
source tree is not a Git checkout: `git rev-parse` can accidentally report its
parent repository. Never substitute that result for provenance.

Allocate a fresh private work directory with at least 3 GiB available for two
working disks, outputs and evidence. Preserve the immutable original. The executed
sequence used additional fresh disks to preserve failed attempts. Record existing
containers and interfaces; never stop unrelated work. Refuse an occupied container
name, work directory or TAP name. Do not run these procedures on a physical Pi.

## Separate build

In a **Mac shell**, run `build.sh` inside a disposable `--network none` container
using the retained `pidp11-realcons-lab:local` image. Mount verified upstream at
`/upstream:ro`, this repository's `lab` at `/lab:ro`, and fresh private outputs at
`/work`. Use user `501:20`, read-only root, all capabilities dropped,
`no-new-privileges`, 512 MiB memory with equal memory-plus-swap (zero swap), two
CPUs, 128 PIDs and a 128 MiB writable temporary filesystem. No package downloads.
Run `sh /lab/m528/build.sh` and retain its complete output.

The script builds twice, compares the bytes, and writes a separately named
`pdp11-ethernet`. Expected SHA-256:
`515d0ef440bb9f66adacf77e1aa453486db61fdc4508609ac5ff86d279010d9c`.
This is reproducibility within the recorded image/toolchain, not every Linux host.
The original executable must still hash to
`f38167163e37dbb9578f33cc58f9740e3a6408829c4e357637b76835864c8237`.
Stop on any mismatch. No source patch, PCAP library or SLIRP is required.

## Network setup and gate

1. Create an exclusive namespace keeper using Docker `--network none`, read-only
   root, user `501:20`, no capabilities, no-new-privileges, 96 MiB/zero swap and no
   published ports. Set namespace sysctls `net.ipv4.ip_forward=0` and
   `net.ipv6.conf.all.disable_ipv6=1`. Bind an empty file at `/etc/resolv.conf:ro`;
   pass no proxy environment. Give the keeper an explicit TERM handler before
   waiting, for example `import signal,sys; signal.signal(signal.SIGTERM,
   lambda *_: sys.exit(0)); signal.pause()`. The original run's simpler PID-1
   keeper ignored TERM; INT stopped that empty keeper after TAP deletion.
2. Start one temporary setup container in `--network container:KEEPER`, with
   `--cap-drop ALL --cap-add NET_ADMIN`, user `0:20`, `/dev/net/tun`, read-only
   root, 32 MiB/zero swap, the same empty resolver and no-new-privileges.
   Mount `/lab:ro`, set `PIDP11_ISOLATED_LAB=1`, and execute
   `sh /lab/m528/setup-network.sh`. Wait for actual exit 0.
3. Independently run `python3 /lab/m528/isolation.py` in that namespace, without
   capabilities, using the same resolver and environment marker. Preserve JSON.
   Only `lo` and owned `tap528` may exist. The peer is `172.30.28.1/30`, with no
   default route, gateway, bridge, external interface, IPv6 route, DNS or proxy.
   The external route *query* must report unreachable; it sends no test packet.
   Stop before guest startup if any assertion fails.

The TAP has Linux owner 501/group 20 and MAC `02:00:00:52:80:01`. No Docker bridge,
NAT, host networking or host physical interface participates. Do not substitute
an existing TAP. Setting up a namespace is not permission to use the real LAN.

## Independent guest and peer

Copy the immutable BSD disk to a fresh `/work/bsd/disk.work`; preserve its baseline
hash/size/mode/mtime. Run `python3 /lab/m528/guest.py` in a separate container sharing
only the owned namespace, mounting lab read-only and work writable. It uses
`/dev/net/tun`, user 501:20, **no capabilities**, read-only root, no-new-privileges,
96 MiB/zero swap, two CPUs, 128 PIDs and a 64 MiB noexec temporary filesystem.
`M528_WORK` selects one of the explicit experiment directories in `guest.py`.
For the negative driver test only, `M528_CONTROLLER=DELQA` selects XQ instead.

The harness checks both executable identities, isolation and XU vector before
boot. XU must be enabled while auto-configuration is active, **before** manually
setting DZ vector 310. XU uses CSR 17774510, vector 120 and MAC
`02:00:00:52:80:02`. The original XU implementation has no `SET XU VECTOR` option.
Monitor commands now wait for their actual reply, not the shared helper's 150 ms
read interval. No original simulator code was changed.

Use the existing Mac operator IPC, one request at a time:

```sh
python3 lab/m526/request.py PRIVATE_WORK/bsd guest '{"op":"console","data":"unix\r","wait":8}'
```

Verify the full console reaches the single-user `#` prompt; a request returning
before a prompt is not permission to replay it. At the **2.11BSD console**, enter
these commands individually, verifying each response:

```text
/sbin/mount /dev/ra0g /usr
/sbin/ifconfig de0
/sbin/ifconfig de0 inet 172.30.28.2 netmask 255.255.255.252 broadcast 172.30.28.3 -trailers up
/usr/ucb/netstat -rn
/bin/ping -n -c 3 172.30.28.1
```

Require `attaching de0 csr 174510`, interface RUNNING/UP and only the connected
172.30.28 route. Do not execute `/etc/netstart` or enter multiuser mode: retained
startup adds a default route. There is no new kernel module or kernel rebuild.

Run `peer.py` in a separate nonroot, capability-free container, same isolated
namespace, read-only root, 32 MiB/zero swap, `/lab:ro`, empty resolver and its own
writable `/peer`. It listens only at `172.30.28.1:2300`. Wait for `ready.json`.
Use `console_operator.py PRIVATE_WORK/bsd PRIVATE_RESULT.json` from the Mac for
the distinctive installed-Telnet exchange. Require the distinct reply, foreign
closure and `#`, and compare the independent peer record. A refused Telnet
connection leaves a `telnet>` prompt: explicitly enter `quit` before shell work.
The helper is not an automatic retry mechanism. Peer lifetime is 600 seconds,
eight sessions, 4 KiB input/session, five-second read timeouts and a bounded
connection loop. `M528_PEER_MODE=slow` or `partial` deliberately alters the reply.
Wait for a stopped peer's **actual exit** before reusing its port.

## Optional observation and faults

`capture.py` is outside the transport path. Its only socket operation is receiving
AF_PACKET frames on the owned TAP. In the tested container configuration, nonroot
NET_RAW was insufficient; capture ran as container root with **only NET_RAW**,
read-only root, no-new-privileges and 32 MiB/zero swap. Its sole writable mount is
a fresh `/capture` directory. Set `M528_GUEST_INSTANCE` to an independently attested
experiment ID. Capture is capped at 600 seconds, 10,000 frames and 4 MiB; packet
size is 2,048 bytes on a 1,500-byte-MTU test link. No arbitrary interface argument.

Stop capture with TERM and wait for exit. Link-down fails the capture; it never
reopens a reused interface. A new capture requires a fresh directory, generation
and independent guest attestation. Capture failure does not stop SIMH. Run the
four-frame `packet-probe.py` only in a separate, explicitly owned NET_RAW container;
it is an active diagnostic, never part of passive observation.

For offline inspection in a **Mac shell**:

```sh
python3 -m unittest discover -s lab/m528 -p 'test_*.py' -v
python3 lab/m528/packets.py PRIVATE_CAPTURE/frames.pcap
python3 lab/m528/observation.py PRIVATE_CAPTURE --generation RECORDED_GENERATION --guest-instance RECORDED_GUEST --namespace RECORDED_NAMESPACE --interface-index RECORDED_INDEX
```

Supply expected identity from the operator's record, not whatever a replacement
capture currently claims. The last command rejects a changed generation, guest,
namespace or interface index. Its result always says **retained/current unknown**.
It is not cryptographic authentication or automatic OS identification. The parser
accounts for checksummed frames and TCP segments; it does not reassemble or prove
a complete application stream. No browser status latency was measured.

## Shutdown and recovery

Stop and wait for the actual peer and capture. At a verified idle guest shell,
request `{"op":"finish","guest_idle_verified":true}`. The harness requires a `#`
prompt and three successful sync replies, then stops the CPU and quits SIMH.
If it refuses, inspect the independent console; do not kill a guest to bypass it.

After all guests close TAP descriptors, save logs/inspect records. Use a final
NET_ADMIN-only setup container to delete **only the owned** `tap528`. Verify only
loopback remains. Stop the empty keeper, wait for exit and remove only recorded
owned containers; do not use global prune or broad process termination. Recheck
original hashes/metadata and compare the complete baseline container inventory.
Preserve failed attempts and working disks privately. A fresh trial must never
silently reuse its predecessor's guest or observation identity.
