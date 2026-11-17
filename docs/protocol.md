# BlinkenBone compatibility analysis

Inspected 2026-11-16: PiDP-11 `26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75`, BlinkenBone `1ce5c0657690ebd8e5f343f36fd4473a60d4402b`. The two top-level `rpc_blinkenlight_api.x` files are byte-identical. This began as source analysis. [M3](lab/M3.md) now records actual original C/REALCONS UDP/TCP interoperability evidence; [M4](lab/M4.md) records the broker experiments and safety counterexample. Neither is evidence about the installed Pi or exhaustive interoperability certification. Source links and cached-file hashes are in [sources](sources.md) and [manifest](source-manifest.json).

## Roles and original implementations

REALCONS calls the C `blinkenlight_api_client` to enumerate a panel, read input levels and send output values. The inspected C client actually selects **UDP** in `clnt_create`; a nearby comment says TCP, so trust executable code. The physical daemon registers both UDP and TCP, program **99**, application version **1**. ONC RPC itself uses RPC message version 2. Do not confuse these version numbers. Discovery uses portmapper/rpcbind; program number 99 is not a port number.

The physical C server maintains a global panel list, uses `svc_getreqset` after `select`, and invokes callbacks into GPIO conversion and LED averaging. Response objects in service procedures are static. The Java `RpcServer` subclasses generated RemoteTea stubs, reads/writes shared `Panel` and `Control` objects, and notifies the Swing panel on output changes. Its generated server registers both UDP and TCP. Locks around values coordinate Java threads, not remote ownership.

REALCONS performs input read → controller service → changed/forced lamp write, then schedules the next service after the work. Default interval is 20 ms; it is not a precise 50 Hz clock. The PDP-11/70 controller translates switch edges into SIMH commands and derives lamps from simulator signals. Preserve that controller. Java lamp rendering and C averaging illustrate display techniques but need not be ported wholesale.

Sources: [C client](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/07.0_blinkenlight_api/blinkenlight_api_client.c#L90), [physical daemon](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/11_pidp_server/pidp11/main.c#L329), [Java server](https://github.com/j-hoppe/BlinkenBone/blob/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/07.0_blinkenlight_api/java/blinkenbone/blinkenlight_api/RpcServer.java), [REALCONS cycle](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/02.3_simh/4.x%2Brealcons/src/REALCONS/realcons.c#L430).

## Procedure map

| Procedure | Number | Semantics / minimum adapter behavior |
|---|---:|---|
| NULL | 0 | Standard generated RPC reachability call |
| GETINFO | 1 | Error code plus server information (max 1024 bytes) |
| GETPANELINFO | 2 | Panel index → name, input/output counts, total logical byte counts |
| GETCONTROLINFO | 3 | Panel and control indices → name, direction, type, radix, bit length, byte length |
| SETPANEL_CONTROLVALUES | 4 | Write **all outputs** (lamps) of panel in discovered output order |
| GETPANEL_CONTROLVALUES | 5 | Return **all inputs** (switches/knobs) in discovered input order |
| PARAM_GET / PARAM_SET | 100 / 101 | Class/object/parameter/value; panel mode and board state |
| TEST_DATA_TO/FROM_SERVER | 1000 / 1001 | Diagnostic transfer procedures; bounded implementation or documented unsupported reply |

Input/output direction is relative to the simulated computer. No procedure sets switches from a remote client or reads cached lamp values. Panel/control errors are payload `error_code`s, distinct from ONC RPC accept/reject errors. Error structs still have fields on the wire; do not treat them as discriminated unions. Enumerate descriptors with limits and validate counts and total byte sizes before enabling control.

Mode values are NORMAL=0, LAMPTEST=1, ALLTEST=2, POWERLESS=3. An older comment describes bit flags; the named constants are the relevant contract to test. Panel parameter class=2; board state handle=1, mode handle=2. Board states are OFF=0, TRISTATE=1, ACTIVE=2; physical Pi callbacks need not implement meaningful hardware tri-state. Do not present these as verified GPIO capabilities.

## Two encoding layers — critical

1. A control value is flattened into `value_bytelen = ceil(value_bitlen/8)` **little-endian logical bytes**. Concatenate only inputs or only outputs, preserving their relative descriptor order.
2. The `.x` declares `unsigned char value_bytes<>`, **not** `opaque value_bytes<>`. The C generator uses `xdr_array(..., xdr_u_char)`: a 32-bit count followed by one four-byte XDR integer for every logical byte. XDR integers are big-endian. The `error_code` precedes the vector.

Example: one 16-bit control with value `0x1234` becomes logical bytes `34 12`; a successful control-values payload is:

```text
00 00 00 00   error = 0
00 00 00 02   logical byte count = 2
00 00 00 34   first byte (LSB)
00 00 00 12   second byte
```

This excludes the RPC envelope and, for SET, the preceding panel index. Dynamic strings use normal XDR byte-length plus padded opaque string bytes. `is_input`, despite its C `unsigned char` type, also occupies four wire bytes. A payload of N logical bytes occupies `8 + 4N` bytes before any envelope. Native in-memory C structure layout is irrelevant.

Java's RemoteTea `xdrEncodeByteVector` deliberately sign-extends Java bytes: `0x80` may encode as `ff ff ff 80`, while C emits `00 00 00 80`. A compatibility decoder must accept both canonical zero extension and the observed Java sign extension, normalizing the low eight bits; reject unrelated high-bit patterns. Include `0x7f`, `0x80`, `0xff` in differential tests. This is an observed implementation quirk, not a new XDR format.

Sources: [IDL](https://github.com/j-hoppe/BlinkenBone/blob/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/07.0_blinkenlight_api/rpc_blinkenlight_api.x), [generated C](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/07.0_blinkenlight_api/rpcgen_linux/rpc_blinkenlight_api_xdr.c#L130), [RemoteTea vector encoding](https://github.com/j-hoppe/BlinkenBone/blob/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/3rdparty/remotetea/src/org/acplt/oncrpc/XdrEncodingStream.java#L208), [XDR standard](https://www.rfc-editor.org/rfc/rfc4506), [RPC standard](https://www.rfc-editor.org/rfc/rfc5531).

## Schema differences and panel semantics

The panel name is `11/70`. Core names include SR (22 bits), ADDRESS (22), DATA (16), LOAD_ADRS, EXAM, DEPOSIT, CONT, HALT, S_BUS_CYCLE, START, POWER, PANEL_LOCK, ADDR_SELECT (3) and DATA_SELECT (2). Indicator groups include parity, errors, run/pause/master, MMR0 mode and address width. Discover by name **and direction**, then validate width; never hardcode wire positions from a screenshot.

The Java panel creates POWER/PANEL_LOCK before SR; the Pi daemon starts with SR/LAMPTEST. Java treats lamp test locally and does not add it as an API input; Pi exposes LAMPTEST. Pi declares MMR0_MODE with three bits; Java uses two. Java's model includes knob enum=3 although the IDL lists switch=1 and lamp=2. Feedback controls and physical rotary encoding need explicit semantic mapping. The Java file also contains another PANEL_LOCK construction; enumeration must detect duplicates instead of silently taking an arbitrary match. Define per-peer tested profiles and fail closed on ambiguity.

START has rising- and falling-edge actions. CONT with HALT steps, without HALT continues; START with HALT initializes, and without HALT starts on release. A broker must preserve edge transitions across poll cycles and handle lost browser releases. Source semantics must be fixture-tested; the prototype's scratchpad controls are an interaction demonstration, not an implementation of REALCONS.

Sources: [Pi control definitions](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/11_pidp_server/pidp11/main.c#L580), [Java panel](https://github.com/j-hoppe/BlinkenBone/blob/1ce5c0657690ebd8e5f343f36fd4473a60d4402b/projects/09_javapanelsim/src/blinkenbone/panelsim/panelsim1170/Panel1170.java#L225), [REALCONS edges](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/02.3_simh/4.x%2Brealcons/src/REALCONS/realcons_console_pdp11_70.c#L834).

## Concurrency, safety and conformance plan

Multiple network callers may reach the server, but there is no session identity, owner token, revision, subscription, atomic handoff or per-client output bank in this API. Multiple output writers overwrite shared values. Do not infer multi-panel-client safety from UDP/TCP support or Java synchronization. One emulator writer and one broker-to-physical client is the proposed topology, not a proven configuration.

The inspected C handler exits the process on a wrong output-vector length. Its IDL vectors are unbounded. Never fuzz that production daemon. The replacement boundary must cap packet/vector/string/control counts before allocating, reject invalid lengths, mask unused control bits and time out malformed/partial TCP records. Test TCP record fragmentation, UDP duplicate XIDs/retries/out-of-order messages, unknown program/version/procedure, invalid handles, authentication flavors, disconnected peers and portmapper restart. Do not blindly replay an RPC mutation after an uncertain result.

Test in disposable local fixtures first: generate canonical C encodings, compare Java high-bit encodings, enumerate actual schemas, round-trip all procedures used by REALCONS, then connect an isolated REALCONS simulator with no physical hardware. Preserve the original 20 ms behavior independently of browser display rate. Prove lease revocation and safe START release before enabling any virtual controls. The normal desktop remains mock-only; M3/M4 add experimental RPC control solely inside the isolated Linux lab. Milestone 0.2 includes offline wire-codec tests against 14 original-C vectors and one Java-source-derived vector, bounded record framing and fuzz tests. See [implemented scope and unresolved protocol questions](backend-milestone.md#offline-rpc-compatibility-implemented). A JVM oracle remains outstanding. Original C transport and REALCONS poll/edge tests now run in [M3/M4](lab/M4.md), including a demonstrated in-flight START-release limitation.

## M4.1 compatibility boundary

See [ADR 0004](decisions/0004-independent-access.md) and the [M4.1 consumer interlock](lab/M4.1-interlock.md). The optional lab hook keeps the original BlinkenBone wire protocol unchanged and validates consumer-owned generations before controller service and command dispatch. Mode A remains independent; passive Mode B is the first future live target. Broker-only M4 safety claims are not strengthened retroactively. No production authorization is implied.

## M4.2 passive publication and timeout experiment

[Observation contract](lab/M4.2-observation.md): a nonblocking copy of an existing REALCONS cycle, with no extra RPC, no wire-protocol extension and no registration change. Control feedback outputs retain their full bitmaps. A separate optional UDP client-handle timeout experiment overrides the generated 25-second per-call timeout; it does not bound discovery or cancel committed commands. Original M3 UDP/TCP and M4/M4.1 regressions remain required.
