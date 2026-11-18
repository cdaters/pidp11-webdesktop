# Installation-guide review tests

Revision: 17 November 2026 · pre-Oscar review 1.

Run from the Web Desktop repository root on the Mac:

```sh
python3 docs/installation/tests/test_guide.py
```

The suite extracts the current guide's command blocks, so fixtures test the published helpers rather than an independently maintained copy. All 48 cases passed. The original review results are summarized below. The M5.2 publication check reruns this suite against the public guide; [provenance](../provenance.json) verifies its command blocks are unchanged.

Coverage:

- All 46 Bash blocks receive `bash -n`; all eight Python heredocs compile. Installation and monitoring blocks are not executed wholesale.
- Preservation: successful independent files, matching hashes, expected modes and retained checkout; collisions at the staging directory, original-directory destination and manifest, each as a directory, file or dangling link; missing/linked sources and required configuration; hardlinks, symlinks and FIFO; copy error, corrupt copy and second-rename failure. Preflight failures must leave the fixture snapshot unchanged. Copy failures cannot change live/pristine files or create the manifest. Second-rename failure restores the old live name.
- Configuration: multiple spaces, tabs and case in REALCONS commands; synthetic Blinky with a nested `PDP-11xx.ini`; DO, CALL and @ indirection; previous standalone output. Blinky/nested content is preserved and no misleading standalone file is generated. The fixture is source-shaped test data, not a newly downloaded original guest distribution.
- Manifest creation and read-only verification: success, existing-manifest refusal, changed/missing/extra/linked pristine data, changed/missing recovery resources and an unsafe relative path.
- Backup: both raw-intermediate and streaming alternatives, with real Zstandard 1.5.7 compression/decompression and hashes of a small regular fixture. Producer, compression, compressed integrity, decompression, byte count, hash comparison and unmount failure must prevent the final success statement. Successful output folders/files have modes 700/600. The shell's pipeline failure propagation catches an upstream producer failure even when compression can finish.

No test contacts the Pi, probes a network, opens a block device, runs a guest, changes GPIO or writes installation/media files. The `dd`, `sudo` and `diskutil` commands are restricted stand-ins; the producer emits fixture bytes and can fail intentionally. The guide's macOS `dd` operands were also checked against local manual documentation (`if=file`, `bs=n`, `m` multiplier). GNU `cp -a --sparse=always` is replaced with a regular-file copy stand-in on the Mac; sparse extents and full Linux filesystem behavior are not established. RPC listener checks, binary dependency/capability checks, process monitoring, actual backups and spare-card restoration require their own authorized environment and were not run.

Primary-source review also confirmed Raspberry Pi's `apt full-upgrade` guidance and all frequency/temperature/power flag definitions, the pinned upstream RPC transport/registration code, Zstandard's CLI semantics, and Oscar's supplied manual at printed page 53. The manual page was rendered and visually inspected without modifying the PDF. Original guest/restart/stability evidence was read from the root agent's authorized, checksum-verified private record copies; no original evidence was changed or copied into this test directory.

These checks support the corrections and failure handling. They do not establish a successful independent clean-card installation, actual hardware behavior, healthy power/thermal operation, complete filesystem transactions or a restored-card boot.
