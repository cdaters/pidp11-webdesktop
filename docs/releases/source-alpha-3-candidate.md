# Source Alpha 3 — qualification candidate

M5.29 prepares **PiDP-11 Web Desktop — Source Alpha 3**, proposed tag
`v0.5.29-source-alpha.3`, for owner review. No tag, GitHub Release, public release
asset, website deployment or announcement is authorized by this preparation.
[Source Alpha 2](M5.18-publication.md) remains the latest public source release.

The proposed archive name is `pidp11-webdesktop-m5.29-source-alpha.3.tar.gz`.
The final exact commit, member count, byte size, SHA-256 and extraction/build
results belong to the [M5.29 report](../lab/M5.29.md), written after qualification.
Do not substitute current main for that specific candidate revision.

**Source Alpha 3 is intended for local demonstrations and controlled
historical-computing laboratories. It is not an approved installation for physical
PiDP-11 hardware.** It contains project source and documentation, not guest disks,
model weights, simulator executables or a binary installer.

## Scope newer than Alpha 2

- Practical terminal workstation controls, explicit keyboard ownership and
  deliberate connection boundaries.
- Genuine supervised RSX/RT-11 printer and paper-tape subsets, exact output
  downloads, retained job history and explicit recovery of saved data.
- Captured disk/tape observations with age, provenance and unknown current state.
- Genuine V7 serial/local-modem text and a separate optional bounded modem actor,
  with read-only equipment observation. No arbitrary dialing or binary guarantee.
- Isolated laboratory tools and evidence for TM11 activity and BSD Ethernet.
  Those experiments are not installed by the ordinary application.

The default browser demonstration remains simulated. Genuine computing needs a
separately prepared and independently operated SIMH guest. The optional companion
never starts the emulator, changes boot selection, mounts media or controls GPIO.
Ordinary SIMH users do not need a physical replica for source development.

## Limits carried into review

The ordinary front panel remains simulated. Guest identity remains independently
operator-attested. RT-11 browser evidence is application I/O, not an independent
login shell; RSTS/E remains console-only. Optional AI explanations remain experimental.
The proposed Hacker Replicant 0.2 contract is separate from the earlier explicitly
modified-application lab and is not implemented upstream support.

TM11 passive activity requires a separate experimental hook/reader and missed its
incremental-memory target. Ethernet requires a separately built original-source
SIMH and an isolated TAP; only retained evidence is provided here. No real LAN,
Internet guest access, DECnet or physical networking is qualified.

The original ARM64 exit-139 incidents and V7 plotting timeout remain unresolved.
Independent security/historical review is outstanding. Hardware repair, original
physical-only operation, enforceable 96 MiB/zero-swap containment, guest ownership,
representative Pi measurements and renewed coexistence approval remain separate
physical gates. START-release and fail-safe control limitations are not repaired
by source packaging.

## Verification and review documents

- [Draft release notes](M5.29-source-alpha-3.md)
- [Current capabilities](../capabilities.md) and [limitations](../known-limitations.md)
- [Screenshot inventory/provenance](../screenshots/m529/README.md)
- [Local RetroRealm review](../website-sync/M5.29/README.md)
- [Qualification report and exact artifact](../lab/M5.29.md)

The owner should approve an exact archive identity and final notes only after
those checks complete. Site staging and source publication are separate decisions.
