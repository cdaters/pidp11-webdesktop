# M4.3 RPC discovery and operation-budget research

2026-11-17. This document proposes an **optional isolated experiment**, not a production change or proven stop deadline. No C source, lab image, existing checkpoint, or Raspberry Pi installation was changed. Inspection used local pinned source, public Debian source, and a disposable read-only `--network none` container to read installed headers/package versions. No RPC connection was made during this research.

The subsequent optional implementation and measurements are documented in [M4.3 recovery](../lab/M4.3-recovery.md); the research-only scope above describes this investigation, not the later experiment.

## Evidence

The pinned PiDP source is revision `26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75`, recorded in `lab/source-manifest.json`. SHA-256 checks against that manifest passed for `blinkenlight_api_client.c`, generated `rpc_blinkenlight_api_clnt.c`, `realcons.c`, and `realcons_console_pdp11_70.c`.

The inspected local image was `sha256:564662bf3489f350e39b39ec46751454568689b0d8dd0d24b4527971c2f3836c`. Both `libtirpc3:arm64` and `libtirpc-dev:arm64` report **1.3.3+ds-1**. Its `/usr/include/tirpc/rpc/clnt.h` declares `clnt_create_timed`, `clnt_tp_create_timed`, `clnt_dg_create`, and the handle controls discussed below. Public Debian source matching the installed package version was read directly; no assumption about the Pi's library is made.

| Primary source | SHA-256 of downloaded source bytes |
| --- | --- |
| [clnt_generic.c](https://sources.debian.org/src/libtirpc/1.3.3%2Bds-1/src/clnt_generic.c/) | `484f43309ce2c26f7ec6d60657ff5129add7a0dfca37e8f9e540bb7a02f64509` |
| [rpcb_clnt.c](https://sources.debian.org/src/libtirpc/1.3.3%2Bds-1/src/rpcb_clnt.c/) | `e615e080b9861a8a657918c19d1850b58622702a66633bc63253d73a20ab7da7` |
| [clnt_dg.c](https://sources.debian.org/src/libtirpc/1.3.3%2Bds-1/src/clnt_dg.c/) | `644e6d7382498b321592774e329f2cafe376df9c0f8c421c8fcad580760906cc` |
| [rpc_soc.c](https://sources.debian.org/src/libtirpc/1.3.3%2Bds-1/src/rpc_soc.c/) | `cf497b0e8332e294beab57ee1cc12aee36fab674a2535e1b5340bc8a32740399` |
| [pmap_getport.c](https://sources.debian.org/src/libtirpc/1.3.3%2Bds-1/src/pmap_getport.c/) | `339bdf8e32993adf7cfdf471ab8ff993b3a60d8bd70da4166224f04efb45c375` |

## The blocking path is larger than one RPC

The original client calls `clnt_create(host,99,1,"udp")` at `blinkenlight_api_client.c:110`; the nearby TCP comment is misleading. Generated calls use a 25-second `TIMEOUT`. The M4.2 optional patch sets `CLSET_TIMEOUT=200ms` and UDP retry=50ms **after** creation. It therefore cannot bound creation/discovery or the sum of subsequent calls.

Original connection sequence (`realcons.c:315–385`):

1. Create the RPC handle, including service discovery.
2. Enumerate panels until an application error sentinel; enumerate each panel's controls similarly. A one-panel, 29-control schema requires 2 panel queries and 30 control queries, including the terminating errors.
3. Read initial switch values, reset controller state, then mark connected.
4. Set board state ACTIVE; call `event_connect`, which performs another panel-mode parameter RPC; send initial outputs.

That is **36 application RPCs** for this schema after discovery. The original panel enumeration ignores the return value from `get_controls`; a descriptor-query transport error is not reliably propagated to the outer function. A deadline experiment must fail the entire attach on such an error, not accept a partial descriptor model. Bound descriptor counts and validate the exact schema before activating the controller.

Ordinary service (`realcons.c:430–501`) reads inputs, calls controller logic, then writes outputs if needed. Input failure calls `realcons_disconnect`. The PDP-11/70 disconnect callback calls `realcons_power_mode`, issuing a parameter RPC, then disconnect sends outputs. Thus a silent input failure can entail **three successive waits**: failed read, disconnect parameter write, disconnect output write. With the original timeout, approximately 75 seconds of configured waits are possible; with M4.2's handle timeout, approximately 600ms. These arithmetic totals exclude local work and scheduling and are not measured maxima. Output failure has analogous additional cleanup calls.

There is also a hidden service RPC: lamp-test transitions inside `realcons_console_pdp11_70_service` call `realcons_lamp_test`, which performs a parameter write. M4.1's `wd_service_begin` holds `wd_mu` across that controller call. A stalled lamp-test write can therefore delay the watchdog thread's STATUS/REVOKE mutex acquisition. Input/output calls outside this region do not demonstrate that the whole service is free of blocking while the safety lock is held. Do not remove that lock casually: it protects generation checking and command construction against a revocation race.

Sources: [pinned C client](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/07.0_blinkenlight_api/blinkenlight_api_client.c), [pinned REALCONS](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/02.3_simh/4.x%2Brealcons/src/REALCONS/realcons.c), local `lab/interlock/upstream.patch` and `lab/interlock/wd_fence.c`.

## API choices

### Smallest change: timed generic creation, with limited claims

`clnt_create_timed(host,99,1,"udp",&timeout)` is available and reduces configured discovery waits. Prefer `getnetconfigent("udp")` plus `clnt_tp_create_timed` if the experiment needs exactly one configured transport, and release the configuration with `freenetconfigent`.

Neither is a reliable whole-operation wall-clock deadline. The generic routine can try multiple network configurations. `rpcb_clnt.c` calls `getaddrinfo(host,"sunrpc",...)` without the supplied timeout; rpcbind version fallback uses the same timeval again for later calls. Subsequent creation/local work is not charged to one monotonic deadline. Restricting a lab hostname to numeric IPv4 removes DNS intent but does not transform this API into a cancellable deadline primitive. [Generic creation source](https://sources.debian.org/src/libtirpc/1.3.3%2Bds-1/src/clnt_generic.c/), [rpcbind client source](https://sources.debian.org/src/libtirpc/1.3.3%2Bds-1/src/rpcb_clnt.c/)

### Recommended bounded IPv4 lab discovery: explicit UDP handles

For a stronger, narrowly scoped experiment, preserve actual rpcbind registration but avoid implicit discovery and DNS:

1. Accept only the lab's literal `127.0.0.1`; build `sockaddr_in` directly with `inet_pton`. Create an `AF_INET` datagram socket, close-on-exec and nonblocking, bound to loopback with ephemeral local port. No broadcast, hostname, IPv6 fallback, or service-name lookup.
2. Wrap explicit `127.0.0.1:111` in a `struct netbuf`, then call `clnt_dg_create(fd,&address,PMAPPROG,PMAPVERS,sendSize,recvSize)`. This is portmapper program **100000**, version **2**, not application program 99. Pass fixed reasonable buffers, e.g. 8192 bytes, and use the existing bounded fixture schema.
3. Set `CLSET_FD_CLOSE` on successful handle creation; close the fd yourself on creation failure. Check every control result. Set `CLSET_TIMEOUT` and `CLSET_RETRY_TIMEOUT` before the discovery call.
4. Call `PMAPPROC_GETPORT` with `struct pmap {pm_prog=99, pm_vers=1, pm_prot=IPPROTO_UDP, pm_port=0}`, `xdr_pmap` arguments and an unsigned XDR integer result. A `u_long`/`xdr_u_long` result allows explicit validation that the returned value is in 1–65535 before conversion to network-order port. Reject zero as not registered.
5. Destroy the discovery handle. Create a new datagram handle for program 99/version 1 using the **explicit nonzero returned port**; configure call/retry controls and retain it for generated C stubs. Optionally set `CLSET_CONNECT=1` to bind UDP peer filtering to that endpoint, documenting this behavioral difference from the original client. UDP connect has no remote handshake and does not prove server readiness; descriptor calls establish usable service.

This deliberately supports IPv4 portmapper-v2 discovery only, which the existing lab rpcbind registration already exercises. It is not a generic rpcbind-v3/v4/IPv6 replacement. A separate explicit-port variant can isolate application-call failures, but must be labeled as bypassing discovery.

Avoid `clntudp_create`/`clntudp_bufcreate` with `sin_port=0`: the compatibility path invokes `pmap_getport`, whose source configures a 60-second total call timeout and 5-second retry. Supplying the `wait` argument does not bound that implicit lookup. Explicit `clnt_dg_create` addresses avoid that path. [Socket compatibility implementation](https://sources.debian.org/src/libtirpc/1.3.3%2Bds-1/src/rpc_soc.c/), [port lookup implementation](https://sources.debian.org/src/libtirpc/1.3.3%2Bds-1/src/pmap_getport.c/)

## Shared operation budget, not renewed per call

Proposed initial **experimental targets**, chosen to extend M4.2's 200/50ms settings, not inferred Pi guarantees:

| Operation | Shared monotonic budget | Individual RPC ceiling | Retry interval |
| --- | --- | --- | --- |
| Discovery + full attach, including descriptors and initial outputs | 2000ms | 200ms | 50ms, reduced if remaining budget is smaller |
| One REALCONS service cycle, including nested parameter calls and error disconnect | 300ms | 200ms | 50ms, similarly reduced |
| Explicit disconnect outside another operation | 200ms | Remaining shared budget | 50ms |
| Lab supervisor observation window after a fault/revocation | 1000ms | Not an RPC timeout | Observe/report; containment policy separate |

Add an opt-in helper to a **new copied source tree**, e.g. `/budgeted`, rather than modifying `/upstream`, `/fenced`, `/observed`, or M4.2 `/bounded`. Build a new binary path. Keep generated RPC/XDR source untouched. Require a dedicated feature flag and `PIDP11_ISOLATED_LAB=1`; default to the original path.

At outer operation entry, capture `CLOCK_MONOTONIC` and an absolute deadline. Nested functions inherit that deadline; disconnect must not start a fresh budget when called on error. Immediately before **every** generated call, compute remaining time and set `CLSET_TIMEOUT=min(remaining,200ms)` on the sole-thread-owned handle. Do not merely pass a shorter `clnt_call` timeout while a previous handle override is active: the override wins. Clamp timeval microseconds properly. If less than 1ms remains, fail locally before calling; libtirpc rounds the timeout to milliseconds. Do not use zero-time calls as a cancellation mechanism.

After every return, recheck the absolute deadline and consumer generation before consuming input or committing actions. A successful late read is still stale. If the budget expires, revoke/disarm through the existing consumer mechanism, discard uncommitted commands and input edges, and perform local cleanup without starting further remote notification RPCs. Preserve the distinction between intentional best-effort panel notification and required local safety. Remote cleanup writes must never delay local revocation or create an execution edge.

Include all wrappers (`getinfo`, descriptor reads, input/output values and parameter get/set), plus ignored-return handling during attach. Return the existing client error status on budget exhaustion with a distinct diagnostic; leave protocol and generated codecs intact. A shared helper alone is insufficient if callers ignore its failure and continue into controller activation. One client handle must have a single owner thread: rpcgen uses static result storage, and libtirpc serializes operations on the fd.

## Timeout, cancellation, revocation and quiescence

These are separate observable facts:

- **RPC timeout:** the caller did not obtain a usable reply within its configured wait policy. A remote operation may already have happened; its reply may be lost.
- **Cancellation request:** an intent to stop work. In libtirpc 1.3.3, `clnt_dg_abort` is an empty function, so `CLNT_ABORT` does not cancel the datagram call. Controls and destruction wait for the active fd operation. Do not call `clnt_destroy`, close its fd, or change its timeout concurrently and claim safe interruption.
- **Consumer revocation:** the generation/lease becomes invalid and new panel dispatch is fenced. It cannot undo an already committed START, deposit or other action. A blocked safety mutex may delay acknowledgment.
- **Confirmed quiescence:** the consumer reaches the instrumented stop/idle boundary and reports the matching generation stopped. Missing RPC replies, stalled counters or a revoked lease alone are not this evidence.
- **Process containment:** a supervisor terminates or stops an isolated process. This may end execution but loses graceful-state semantics; it is not a successful RPC cancellation or consumer quiescence acknowledgment.

The datagram implementation accounts timeout using integer millisecond counters around polling; it is not a monotonic total-operation stopwatch. Short and wrong-XID packets also decrement the counter (so a claim that they necessarily keep a call alive forever would be incorrect). Lock acquisition, scheduler delays, XDR/local work and interrupt handling still prevent treating a configured timeval as a hard real-time maximum. [Datagram implementation, call/control/abort/destroy](https://sources.debian.org/src/libtirpc/1.3.3%2Bds-1/src/clnt_dg.c/)

The proposed cooperative budgets bound how much new work the experiment attempts and reduce waits in the tested failure model. They do not safely interrupt a stuck library call. A stricter design would put RPC ownership and generated stubs in a separate helper process with bounded IPC and a supervisor deadline, keeping authoritative consumer state outside that helper. That is a larger architectural experiment, not a minimal patch, and still cannot roll back already transmitted requests. Thread cancellation or SIGALRM/longjmp through libtirpc is not recommended: locks, static results and cleanup invariants require a separate audit.

## Required offline experiments

For each case record monotonic timestamps for operation entry, each RPC start/end, timeout/revocation, service-lock exit, run-loop exit, generation and final quiescence acknowledgment. Record configured budget and actual elapsed duration separately; do not discard failing samples.

| Fault | Acceptance evidence |
| --- | --- |
| Port 111 silent, absent or malformed response | Attach fails within measured budget envelope; no fallback outside loopback; no activation; fd count returns to baseline. |
| Discovery succeeds, application UDP endpoint silent | Application call budget applies independently; no automatic fallback or rearm. |
| Descriptor replies each delayed but individually below 200ms | Total attach stops at its shared deadline rather than taking 36 separate ceilings; no partial-model activation. |
| Input read expires, disconnect notifications also silent | Cleanup inherits remaining cycle budget; no two fresh waits; local fence remains active. |
| Output reply lost after peer processed it | Report outcome unknown/possibly committed; never claim cancellation or replay action automatically. |
| Lamp-test parameter response held | Measure watchdog mutex delay; same cycle budget covers nested RPC; no removal of safety lock without separate race proof. |
| Late reply after revoke/new generation | Old input/command discarded at consumer boundary even if RPC succeeds. |
| Duplicate/wrong-XID/short datagrams and EINTR | No crash, decode corruption or unintended acceptance; actual elapsed bounds measured rather than assumed from API name. |
| Reconnect after deadline | Fresh discovery/schema validation, no queued edge or command replay, explicit baseline and fresh authorization required. |
| Consumer stopped/scheduler stalled | Supervisor reports unavailable/unconfirmed; does not label a timeout as quiescence. |

Retain original M3 UDP/TCP/rpcbind interoperability, original M4 stale-START counterexample, M4.1 consumer fencing and patched-disabled behavior, and all M4.2 observation/recovery results. The new UDP experiment must not claim TCP connection/recovery coverage. Preserve the original and M4.2 binary/source hashes and save its own build metadata and traces separately.

No proposed budget, helper, cancellation mechanism, or additional recovery experiment was executed by this research task. API/header availability and source behavior were inspected; runtime fault results remain an implementation milestone.
