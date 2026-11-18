# Verification and independent clean-card replay

Public community edition: 18 November 2026. Publication shares the work for review; it does not turn the reconstructed tutorial into an independently repeated installation.

## Established evidence

The original Pi installation passed recorded guest boot, persistence and shutdown checks with the limitations described in the [installation record](PIDP11-TRIXIE-INSTALLATION-RECORD.md). The [evidence appendix](PIDP11-EVIDENCE-APPENDIX.md) distinguishes exact records from gaps. Public documentation omits private credentials, network captures and disk images.

The 17 November review exercised 48 disposable local helper fixtures. Shell blocks were syntax-checked and Python heredocs compiled. These tests check preservation, collision/failure handling, metadata and backup-helper behavior using stand-ins; they do not run the complete installer or prove a spare-card restore. The [test scope](tests/README.md) gives the practical limits. M5.2 preserves all fenced guide blocks and reruns those local checks against the exported guide.

## Still needed for independent reproducibility

- [ ] A reader uses a fresh expendable card and records the actual OS image, hardware, package versions and source revision.
- [ ] Each guide checkpoint is followed in order; any failure stops the procedure and is retained in the record.
- [ ] Original downloads and base guest disks remain separate from writable copies, with hashes and failure handling verified on that environment.
- [ ] Guest-specific boot and shutdown observations are recorded without extending one guest's result to all systems.
- [ ] Power/thermal behavior, actual panel/serial hardware and network/RPC exposure are checked in the explicitly prepared environment.
- [ ] A separately retained backup is restored to a spare card and its operation verified before claiming a tested recovery route.

Please share corrections or a sanitized replay report through the repository. Do not post private card images, keys, passwords or host configuration. No correspondence or installation is performed merely by publishing this checklist.
