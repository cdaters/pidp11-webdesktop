# Evidence appendix for the PiDP-11 review draft

**Craig Daters · [RetroRealm.org](https://retrorealm.org/)**

**17 November 2026 · pre-Oscar review 1.** This appendix connects the installation claims to selected original records without publishing private network, account or credential data.

## Review scope and provenance

The owner authorized read-only retrieval of selected original installation records from the Pi for this review. Eighty-two files were copied to a private Mac research directory; their hashes matched the retrieval manifest locally, and the retrieval process compared the remote and local hashes. The original records were not edited. This was document retrieval, not a new system inspection, guest test, installation, deployment or hardware exercise. Neither guest disks nor the golden image were read.

Paths below identify original records relative to the private installation-record directory, except `apt/history.log`, copied from `/var/log/apt/history.log`. They are locators for review, not public download links. The brief excerpts omit surrounding private material and terminal control characters; they are selected recorded text, not newly executed commands. The [installation record](PIDP11-TRIXIE-INSTALLATION-RECORD.md) retains the wider chronology and its execution/reconstruction labels.

## Claims and original support

| Claim | Specific original support inspected | Scope and limitations |
|---|---|---|
| Upstream revision | `validation/upstream-commit.txt`; `baseline/upstream-commit.json` | Both identify `26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75`. This records the installation revision, not a newly queried HEAD. |
| ARM64 Trixie environment | `baseline/etc__os-release`, `baseline/kernel.txt`, `post-reboot/kernel.txt` | Baseline records Debian 13 Trixie and initially kernel 6.18.50; post-reboot record identifies 6.18.60+rpt-rpi-v8 AArch64. The more precise 13.7 designation remains from the earlier 17 November publication review; do not derive it from the baseline's generic version 13. |
| Official supplied ARM64 runtimes | `resources/precompiled-arm64-inspection.txt`; `validation/final-installation-checks.json`; `validation/simh-basic.log`; `validation/launcher-hardcopy.log` | Final checks list all three official binary matches. The emulator log identifies a 1 December 2024 compile date, and the server hardcopy identifies v1.4.1 and 2 December 2024. These are supplied builds, not binaries compiled during this installation. The local byte comparison appears below. |
| Dependencies and preceding owner upgrade | `apt/history.log`, `validation/installed-packages.txt` | Separate 16 November transactions: `apt upgrade` at 14:38–14:42; dependency installation at 15:34–15:42. Dependency command excerpt below. Development packages are not a proven minimum runtime set. |
| CPU/launcher checks | `validation/simh-basic.ini` and `.log`; `validation/launcher-hardcopy.log`; `validation/launcher-rt11-hardcopy.log` | Basic program produces R0 `000001`, PC `001006`. Launcher records separately establish idled/RT-11 operation; they do not prove every guest used that launcher. |
| RT-11, V7, updated BSD and RSX persistence | `validation/rt11-console.log`, `rt11-reboot.log`, `unix7-console.log`, `unix7-reboot.log`, `bsd-console.log`, `bsd-reboot.log`, `rsx-console.log`, `rsx-reboot.log`, plus their `.ini` files | Actual marker/restart records inspected; selected output below. These were standalone validation configurations. BSD was single-user, patch 482; RSX identifies V4.6 BL87. No full networking/multiuser claim. |
| Additional guests | `phase3/additional-guests.json`; `phase3/PHASE3-REPORT.md`, “Additional guest tests” | Eight successful boots and incomplete UNIX V4 login. V1/DOS shutdown assurance remains limited; V4 image cleanliness is not established. |
| Thirty-minute stability run | `phase3/stability-plan.json`, `monitor.py`, `stability-samples.jsonl`, `stability-summary.json`, `stability-console-checkpoint.log`, `stability-console-final.log` | RT-11 prompt and original panel server, stock unthrottled/noidle configuration. Summary below. This does not measure assembled-panel LED load or multiday stability. |
| Preservation | `phase3/preservation-verification.json`; `resources/pristine-manifest.json`; `resources/download-sha256.json`; `validation/final-installation-checks.json`; `phase3/git-bundle-verify.txt`; completed Phase 3 report | 76 pristine files and 18 recovery resources checked with no failures. Bundle verifier records complete history. Earlier `validation/pristine-verification.json` checked 57 files before collection expansion; do not mix those counts. No preserved images were rehashed during this editorial review. |
| Controlled reboot | `phase3/PHASE3-REPORT.md`, “Controlled reboot and post-reboot checks” | Completed at 23:56:53 UTC, 16 November: reconnection, expected kernel/services, no emulator autostart and no configuration differences reported. The prepared post-reboot helper was not executed; observations were entered directly. |
| Later power warning | [17 November status investigation](PIDP11-TRIXIE-INSTALLATION-RECORD.md#recorded-power-and-status-investigation-17-november) | The earlier publication review transcribes `0x50000` and undervoltage/normalization at 15.136/17.152 seconds after boot. Its original journal capture was not among the retrieved records. This later finding remains unresolved and supersedes any implication that the previous reboot's `0x0` proves power health. |

### Dependency transaction

The retained APT transaction contains this command. Private requesting-account metadata is omitted.

```text
apt-get install --no-install-recommends git screen poppler-utils libsdl2-dev libpcap-dev libreadline-dev libtirpc-dev libdbus-1-dev rpcbind
```

### Marker and shutdown evidence

All four guest tests used marker text `PIDP11-PERSIST-20261116` and retained both the initial write/read and a separate emulator-restart read. Selected restart excerpts:

```text
RT-11 — validation/rt11-reboot.log
.TYPE PIDP.TXT
PIDP11-PERSIST-20261116

UNIX V7 — validation/unix7-reboot.log
# cat /pidpcheck
PIDP11-PERSIST-20261116

2.11BSD — validation/bsd-reboot.log
# cat /pidpcheck
PIDP11-PERSIST-20261116

RSX-11M+ — validation/rsx-reboot.log
>PIP TI:=PIDP.TXT
PIDP11-PERSIST-20261116
```

The initial RT-11 transcript entered `COPY TT:PIDP.TXT`, received a `To ?` prompt and supplied the destination there; the guide's cleaner syntax is a recommended procedure, not a verbatim original command. V7 records `sync` operations before SIMH stop/exit, with some prompt/input interleaving. BSD records `halt` followed by `syncing disks... done` and a HALT. RSX records `RUN $SHUTUP` and completion before the emulator exits. These guest-specific observations should not be generalized to the unresolved V4 or limited V1/DOS cases.

### Stability and reboot excerpts

The aggregate `phase3/stability-summary.json` records 23:16:06–23:46:06 UTC on 16 November, 1,800 seconds and 181 samples. RT-11/client RSS was constant at 16,056 KiB; panel-server RSS was constant at 2,784 KiB. Mean CPU was 93.7% and 21.9%, respectively, where 100% means one core. Temperature ranged 58.0–67.7°C. Soft-limit-active samples numbered 176; sampled undervoltage and throttling current/history counts were zero, and process-read errors were empty. The original summary calls one field “hard throttling”; that label does not diagnose a thermal cause. These measurements describe the original Pi software run, not Web Desktop performance.

The completed Phase 3 report's reboot section says: “PASS — completed 2026-11-16, 23:56:53 UTC (16:56:53 Arizona time).” Its recorded checks include SSH/NetworkManager/rpcbind active, zero failed units, no emulator processes or Screen sessions, no added emulator autostart, and no configuration differences. Raw network, boot/session identifiers and login details are intentionally excluded here.

### Selected original-record identities

These SHA-256 values identify the privately retained original bytes, not the shortened excerpts above. They provide provenance, not independent certification of every reported action.

| Original record | SHA-256 |
|---|---|
| `validation/upstream-commit.txt` | `601c406f067ac4e3cdc14707fa9edbb4267445f2e5bde3be78bf2c9674b0a9f6` |
| `apt/history.log` | `05f546b155cb17a7acf1e34c08c978af8ac1ee76ee79e7edac2b4e5af04fac0e` |
| `validation/rt11-reboot.log` | `4278fd1f0d0208d9651450795407914d59c67055b5d32d074e5f2f0fac7b1190` |
| `validation/unix7-reboot.log` | `3604d176eb4c0d013b003e5488a126455cd6ba83e5ce64972bf3e35db43e98f5` |
| `validation/bsd-reboot.log` | `868a3c6bb09f0776891d97d759f2884611ca96d7b32125613459358044722aba` |
| `validation/rsx-reboot.log` | `858a90bf2181cacd1de2594f2e1042935fbe0cb1f4ddf0d9f82a1b5d283162a0` |
| `phase3/stability-summary.json` | `2a40ac859c151b59842b4fd46ac9e693bdc26404a0ba8304b6691434cfae3f89` |
| `phase3/preservation-verification.json` | `654dea973ee4116e48055a607dc73a6361e27f99e9eaf8f695724dcfee233e36` |
| `phase3/PHASE3-REPORT.md` | `e806a4083c9db3d0b8565ce6651a3d261f858b2af11a83fe97c5a93d6eeff774` |

## Local corroboration performed for this revision

### Official backup bytes

The local source manifest identifies revision `26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75` and source-archive SHA-256 `3f857439ec9ab63de1f227dc7779c5c69df99d050f90e52209359330a6d9c070`. The following files in its `bin/backup64bit-binaries/` directory were read and hashed locally; `file` identified all three as dynamically linked AArch64 ELF executables. None was executed for this check.

| Official file | Bytes | SHA-256, matching the earlier record's installed-file value |
|---|---:|---|
| `pdp11_realcons` | 2,037,232 | `340c3311d2be6a04a5f3cc05c97747f524be58de3ea4d13fec97991a09df454e` |
| `pidp1170_blinkenlightd` | 541,056 | `8d1cd3b97ae0155b1b0874b75a94deaf7530a8727f87464db2d0a2025ccbcf02` |
| `scansw` | 166,848 | `5c0c05dc885946c5ef324b4e90eb7b42a0c2f20215292831b8b517daa686bb07` |

The source is available in the [pinned official backup directory](https://github.com/obsolescence/pidp11/tree/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/bin/backup64bit-binaries). This confirms correspondence between cached official bytes and the published hashes. It does not recheck installed ownership, capabilities or dependency resolution on the Pi. The recorded emulator/server build dates are December 2024; no runtime recompilation is claimed for the installation.

### RPC source distinction

The pinned server's [`main.c`](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/11_pidp_server/pidp11/main.c#L342) creates UDP and TCP transports with `RPC_ANYSOCK` at lines 342 and 352 and registers them at lines 347 and 357. The reviewed generated dispatcher and application handlers do not add application-level authentication. This explains why the guide now distinguishes the client's `localhost` destination from server listening scope. No socket listing from the Pi's running panel server was available here, so its actual listening addresses and additional service ports are not asserted.

### Backup metadata

The local text files `Backups/2026-11-16/source-card.sha256` and `Backups/2026-11-16/image-content.sha256` both contain:

```text
a37ed900f3d34b14d9110b21a02dfe64506e93ebb3c623b953c2f172d456f04e
```

These two metadata files agree. Their contents alone do not prove successful original `dd`/compression exits, decompression integrity, total byte count or a restore-and-boot test. This review did not read the card or image. The owner reports a direct streaming `dd` → Zstandard backup; exact flags/tool versions and the execution transcript remain unavailable. The older `MACOS-MICROSD-BACKUP.md` describes a proposed raw-image/gzip workflow and is not evidence that it was used.

### Web Desktop evidence is separate

The local Web Desktop repository has checkpoint `checkpoint/m4.3` at `a30303942dec8b7213dbde20c63c43e0d7a565da`. Its `docs/lab/M4.3.md`, `docs/lab/M4.3-performance.md` and `docs/lab/m43/` contain Mac/network-isolated laboratory results. Those support the desktop's implemented mock interfaces and isolated interoperability work. They do not validate the Pi installation, GPIO, real guest browser sessions or production control. The presentation-polish changes retain that boundary.

## Remaining evidence gaps

The original Imager/image-writing details, Mac backup execution transcript/flags/tool versions and spare-card restore test are not available. The later `0x50000` journal capture and the earlier review's 101-file protection snapshot were not in the selected retrieval. The original conversation's complete helper invocations were not independently rechecked; the durable installation records support their effects, while the revised guide clearly labels consolidated replacements as reconstructed or recommended. A clean-card replay and assembled-panel testing remain future work. No missing transcript is replaced with invented successful output.
