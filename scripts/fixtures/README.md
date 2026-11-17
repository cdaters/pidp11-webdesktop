# Offline BlinkenBone oracle

Run `python3 scripts/fixtures/generate.py` on a Mac with Xcode command-line tools. It compiles and executes **only** the local encoding driver and pinned generated XDR code against macOS libRPC. It does not compile or run a panel daemon, SIMH, GPIO code or rpcbind, and does not open any socket.

`original/` contains unmodified IDL, generated C header and generated XDR implementation from `obsolescence/pidp11` revision `26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75`, `src/07.0_blinkenlight_api/` (generated files in `rpcgen_linux/`). Their hashes are in `provenance.json`; the IDL contains Joerg Hoppe's MIT copyright/permission notice. `oracle.c` is our fixture driver, not upstream server code. Original generated files are test provenance, never compiled into the Go executable.

The JSON holds 14 C-generated vectors plus one Java-source-derived byte-vector variant. C covers info, panel/control descriptors, control values, parameter arguments/results, error replies, test transfers, multi-argument requests and an AUTH_NONE GETINFO call envelope encoded by system `xdr_callmsg`. Fixtures are small selected examples, not an exhaustive corpus or captured hardware traffic.

The Java variant follows `XdrEncodingStream.xdrEncodeByteVector` from the pinned BlinkenBone RemoteTea source: sign extension of bytes ≥0x80. No JVM oracle has been run. Do not label this case “Java interoperability tested.” The original Java library is not bundled. For future confidence, execute both original runtimes in disposable fixtures and test real request/reply sequences and schemas.

Generation currently targets macOS; Linux would require libtirpc include/link settings. Routine `go test` reads committed vectors and requires neither C nor RPC libraries. Compare regenerated JSON with Git; unexpected drift is a review gate. Bounds, strict padding and framing checks in the Go decoder intentionally protect the future boundary; error structs are still decoded as structs rather than mistaken for unions.
