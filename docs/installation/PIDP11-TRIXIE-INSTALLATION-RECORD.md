# PiDP-11 on Trixie ARM64: installation provenance and review record

**Craig Daters · [RetroRealm.org](https://retrorealm.org/)**

**17 November 2026 · pre-Oscar review 1.** Prepared for technical review by Oscar Vermeulen and possible later community publication. Community documentation; not an upstream endorsement. Companion: [the human-followable guide](PIDP11-TRIXIE-HEADLESS-GUIDE.md).

## Evidence rules

These labels preserve the evidence classifications of the earlier Pi-based review. This revision inspected 82 selected original records retrieved read-only with the owner’s authorization, then reviewed them on the Mac. No new system inspection, guest test, deployment or installation change was performed. “Current state” below means the state recorded during the earlier 17 November inspection, not a new observation. The [sanitized evidence appendix](PIDP11-EVIDENCE-APPENDIX.md) identifies exact supporting records, selected excerpts, original hashes and the remaining gaps.

The labels mean:

- **VERIFIED EXECUTED:** execution is supported by the original session transcript, installation log, package history or validation transcripts. This does not imply a command is necessary on every machine.
- **VERIFIED CURRENT STATE:** inspected at the recorded review time; does not establish how that state was created.
- **RECONSTRUCTED:** a command sequence assembled from recorded effects or earlier helper operations; not presented as an exact historical shell transcript.
- **RECOMMENDED:** a proposed fresh-card practice, not necessarily performed here.
- **UNVERIFIED:** needs independent execution evidence or a clean-install/hardware trial.

Owner-reported Mac work is attributed to the owner. Two local checksum text files provide additional backup metadata, as described below; they do not establish the original command exits or replace an image read. This editorial pass changes only local documentation copies. It does not modify the original Pi records, installation, guest images, services or hardware.

## Evidence index

Paths below are relative to the private working-record directory. Retain the originals privately; do not automatically publish their raw contents, network details or full shell history.

| ID | Evidence |
|---|---|
| A | `INSTALLATION-LOG.md`, chronological installation/validation entries; some early pending entries are superseded later |
| B | `baseline/etc__os-release`, `kernel.txt`, `packages.txt`, `upstream-commit.json`; `validation/upstream-commit.txt`; additional private baseline records |
| C | `README-INSTALLATION.md`: Phase 2 operating guide and deliberate omissions |
| D | `/var/log/apt/history.log`, retained as `apt/history.log`: owner-run upgrade before inspection, then exact dependency installation transaction |
| E | `resources/download-sha256.json`, `resources/pristine-manifest.json`, archive inventories, source symlink inventory and `resources/headless-config.patch` (partial earlier configuration diff, not the complete final transformation) |
| F | `validation/simh-basic.ini` / `.log`; `{rt11,unix7,bsd,rsx}-console.log` / `-reboot.log`; `launcher-hardcopy.log`, `launcher-rt11-hardcopy.log`, `installed-packages.txt`, `pristine-verification.json`, `final-installation-checks.json` (all under `validation/`) |
| G | `phase3/PHASE3-REPORT.md`, `additional-guests.json`, per-guest Screen logs |
| H | `phase3/stability-plan.json`, `phase3/monitor.py`, `phase3/stability-samples.jsonl`, `phase3/stability-summary.json`, console checkpoint/final logs |
| I | `phase3/preservation-verification.json`, `phase3/git-bundle-verify.txt`, `phase3/git-fsck.txt`, `phase3/retained-archive-checksums.sha256`; completed reboot section of `phase3/PHASE3-REPORT.md` |
| J | `phase3/ASSEMBLY-CHECKLIST.md`, `STARTUP-EVALUATION.md`, `MACOS-MICROSD-BACKUP.md` |
| K | Read-only 17 November inspection: installed Git files, service definitions, package database, binary comparisons and current-boot journal; selected results below |
| L | Original conversation/tool transcript: exact commands and Python heredocs where durable logs summarize rather than reproduce them |

## Tested environment and last recorded state

**VERIFIED CURRENT STATE:** Pi 3 Model B Plus Rev 1.3; Debian 13.7 Trixie with Raspberry Pi packages; ARM64 (`arm64`/`aarch64`); kernel `6.18.60+rpt-rpi-v8`; user `pi`; hostname `pidp11`; checkout `/opt/pidp11`; upstream remote `https://github.com/obsolescence/pidp11.git`; HEAD `26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75` (10 April 2026, “add unix v4”). No fetch, pull or checkout was performed during the earlier read-only review; this revision only retrieved selected records read-only. The retrieved baseline identifies Debian 13 Trixie; the point release 13.7 remains the earlier 17 November review’s recorded designation.

The starting machine was already provisioned and network-accessible. Exact Imager release, OS image filename/checksum, original SSH/Wi-Fi provisioning and card-writing commands are **UNVERIFIED**. They cannot be reconstructed from a successful SSH session alone. New Imager instructions in the guide are **RECOMMENDED**.

APT records show `apt upgrade`, requested by user `pi`, at 14:38–14:42 on 16 November, **before the installation inspection**. It installed the newer kernel. Do not describe this as an agent-run upgrade or a Trixie compatibility patch. The inspection initially saw the older running kernel despite newer packages being present. Approved user reboots activated the installed kernel and later validated restart behavior. No SSH, boot, authentication or partition changes were made by this work.

## Chronological reconstruction

1. **Before agent inspection:** APT records the owner's ordinary upgrade on 16 November, 14:38–14:42. The installed newer kernel had not yet been activated.
2. **Phase 1 / initial Phase 2:** host inspection and baseline capture, then user-performed controlled reboot to the installed 6.18.60 kernel. No original OS-card preparation was witnessed.
3. **Before dependency installation finished:** source/resource inspection and downloads into the home-directory preparation area. Source archive staging, main/BSD/RSX downloads, pristine extraction and hashing overlapped the user's APT transaction (15:34–15:42). Resource modified times help order these events but are not an exact shell-execution transcript.
4. **After user confirmed prerequisites/target ownership:** Git clone and commit verification, selection of official ARM64 runtimes, standalone CPU test, separate working-copy construction. Early guest tests used the staging working directory while other copies completed.
5. **Phase 2 validation/configuration:** UNIX/RT-11/BSD/RSX tests, persistence and shutdown; Git source bundle preservation; final live systems-directory move, headless config generation and user-local utility links.
6. **Later Phase 2:** optional Nankervis download/decompression/copy, menu correction, pristine manifest expansion to 76 files, attachment checks and restoration of checkout-original idled.
7. **Phase 3:** eight additional successful boots plus one incomplete V4 login test; 30-minute dedicated run on 16 November, 23:16:06–23:46:06 UTC; archive verification; stopped-state capture; user reboot and direct post-reboot checks recorded in the completed Phase 3 report.
8. **Later owner work / earlier documentation:** owner-reported Mac golden-image backup, subsequent boot and read-only power/status audit. The owner identifies the backup method as direct `dd` streaming into Zstandard. Exact historical command flags and tool versions are not retained in these publication copies.
9. **Pre-Oscar editorial pass:** local documentation and source-reference checks on the Mac, including the supplied ARM64 binary hashes and the two existing backup checksum text files. The owner also authorized read-only retrieval of 82 selected original records; their local hashes match the retrieval manifest. No new system inspection, guest run, Pi write or backup-image read.

### 25 directly evidenced preparation/installation actions

The IDs below group related operations for review; their numeric order is not a claim of a single sequential shell script. Use the timeline above for overlapping execution.

This is the counting basis for “25 directly evidenced steps.” It includes preparation and preservation, excludes guest-validation operations and excludes the pre-existing OS installation. Python helper bodies are not all saved as executable scripts; their actions are supported by A/E/F/L. The guide deliberately identifies its replacement, consolidated heredocs as **RECONSTRUCTED**, not byte-for-byte historical commands.

| ID | VERIFIED EXECUTED action / command where retained | Why; affected files | Privilege; result and validation | Fresh installation? |
|---|---|---|---|---|
| E01 | Captured baseline with `dpkg-query`, `uname`, `ip`, `systemctl`, `lsblk`, configuration copies/hashes through a Python helper | Preserve pre-change evidence in `baseline/` | `pi`; records exist (A/B/L) | Recommended, not a runtime dependency |
| E02 | Approved user `sudo reboot`, then kernel/health checks | Activate already-installed kernel | Root for reboot; `6.18.60+rpt-rpi-v8` verified (A/G/L) | Only if a kernel update needs activation |
| E03 | Downloaded GitHub API source tarball at recorded SHA; staged regular files with Python | Preserve source; absolute upstream symlinks rejected by safe extraction, then recorded/skipped in staging | `pi`; tarball and `source-archive-links.json` retained (A/E/L) | Optional; do not install from incomplete staging |
| E04 | User ran `sudo apt-get update` and exact dependency command below | Add Screen, runtime/build libraries and PDF tools | Root; APT transaction and package database agree (A/D/F) | Yes, with package-state checks |
| E05 | `sudo install -d -o pi -g pi -m 0755 /opt/pidp11` | Establish a pi-owned empty target | Root; ownership now `pi:pi`, mode 0755 (A/K/L) | Yes if absent; never reuse nonempty target blindly |
| E06 | `git clone https://github.com/obsolescence/pidp11.git /opt/pidp11` and `git -C /opt/pidp11 rev-parse HEAD` | Official checkout, verified against recorded main commit | `pi`; HEAD matches (A/B/F/K/L) | Yes; guide additionally pins explicitly |
| E07 | Python `shutil.copyfile` copied three files from `bin/backup64bit-binaries` to runtime targets listed below | Select supplied ARM64 executables | `pi`; byte comparisons passed (A/F/K/L) | Yes on this tested ARM64 route |
| E08 | Same helper applied `.chmod(0o755)` to the three runtime files | Make copied runtime files executable | `pi`; 0755, no setuid, capabilities absent (A/F/K/L) | Yes, or equivalent `install -m 0755` |
| E09 | Used checkout's existing absolute `client11`, `server11`, `scansw` symlinks | Preserve official runtime routing | No new links needed at these paths; targets resolve (E/K) | Verify rather than recreate blindly |
| E10 | `curl -fL --retry 2 --connect-timeout 15 --max-time 300 -o resources/systems.tar.gz https://obsolescence.dev/pidp11/systems.tar.gz` | Main guest collection via HTTPS | `pi`; archive/hash/inventory retained (A/E/L) | Yes; content is mutable |
| E11 | Downloaded BSD `boot.ini` and `2.11BSD_rq.dsk.xz` from Chase Covello's raw GitHub `master` URLs | Updated BSD image | `pi`; retained hashes; patch 482 boot verified (A/E/F/L) | Optional updated guest; revision not independently pinned |
| E12 | curl downloads of the disk and tape (full recorded commands below) | Updated RSX disk and recovery tape | `pi`; compressed downloads retained, BL87 boot verified (A/E/F/L) | Optional; anonymous FTP has no TLS authenticity |
| E13 | Python `tarfile` with `filter='data'`, `lzma.open` and `gzip.open` extracted/decompressed into `pristine/systems`; copied RSX config from `install/boot.ini.bilquist` | Preserve unbooted originals separately from writable guests | `pi`; archive/expanded manifests retained (A/E/L) | Yes for this preservation design |
| E14 | Hashed pristine files using SHA-256 and `.chmod(0o444)` | Detect changes, discourage accidental writes | `pi`; later independent verification passed (A/E/F/I/L) | Strongly recommended; not immutable protection |
| E15 | `cp -a --sparse=always pristine/systems /opt/pidp11/systems-working` | Separate writable disks, reduce zero-block allocation | `pi`; distinct inodes/size checks passed (A/F/L) | Yes; can take minutes on a Pi 3 |
| E16 | Applied 0644 to working files with Python | Undo copied read-only mode on working disks/configs | `pi`; working writes/persistence tested (A/F/L) | Yes, only on the working tree |
| E17 | Renamed checkout `systems` to `systems-upstream-original`, then `systems-working` to `systems` using `Path.rename` | Install full collection without discarding checkout originals | `pi`; paths/menu checks passed (A/F/L) | Yes in the proposed layout |
| E18 | Python rewrote selected working `boot.ini` commands | Disable VT11 for Lite, omit Ethernet/extra terminal attachments and absent DECUS disk, enable RSX disk boot | `pi`; changes in E's patch and current configs; RT-11 official launcher passed (A/E/F/L) | Yes for same text-only isolated setup |
| E19 | Generated `boot-headless.ini` with absolute working directory and top-level REALCONS commands commented | Intended standalone SIMH test path; the original conversion did not resolve nested command files or every whitespace variant | `pi`; representative standalone guest boots passed (A/F/G/L), not universal configuration independence | The revised guide excludes Blinky and checks eligible files; panel-capable `boot.ini` remains |
| E20 | Fixed `unixv1`→`unix1`; added `0211 211bsd+` and `2024 rsx11bq` | Match actual directory names/new guests | `pi`; menu target checks passed (A/E/F/L) | Yes for these exact archives |
| E21 | Python `Path.symlink_to` created `~/.local/bin/pdp11` and `pdp11control` | Convenient access to unchanged official scripts | `pi`; links resolve; no profile edit (A/K/L) | Optional; full paths work |
| E22 | `git -C /opt/pidp11 bundle create .../resources/pidp11-upstream.bundle --all` | Offline source recovery | `pi`; Git bundle verified complete (A/I/L) | Recommended, optional for runtime |
| E23 | curl download (full recorded command below), then nested gzip/tar extraction | Add optional historical multi-disk collection; download has two gzip layers | `pi`; 19 additional files hashed (A/E/L) | Optional; transport packaging is version-sensitive |
| E24 | Python sparse-copy/hash helper copied Nankervis files; corrected `1000 nkrvs`→`1000 nankervis` | Complete the optional menu | `pi`; 14 disks/three tapes attached in test (A/E/F/L) | Only with optional collection |
| E25 | Restored checkout-original `idled/boot.ini` with `shutil.copyfile`, regenerated its standalone counterpart | Avoid unnecessary archive-version differences | `pi`; current tracked idled file unmodified (A/K/L) | Yes in equivalent consolidated setup |

The earlier `headless-config.patch` records only part of the configuration work. It is not a complete recipe for the final installed tree. In particular, commenting a top-level `set realcons` line does not remove commands in included files: Blinky uses `do PDP-11xx.ini 70 4m`. The revised tutorial treats Blinky as panel-dependent and excludes it from standalone conversion; a whitespace-aware expression alone cannot solve nested includes. These corrections describe the guide, not changes made to the existing Pi.

The dependency command transcribed in the earlier review from APT history was:

```bash
sudo apt-get install --no-install-recommends \
  git screen poppler-utils libsdl2-dev libpcap-dev libreadline-dev \
  libtirpc-dev libdbus-1-dev rpcbind
```

Additional exact recorded shell invocations (relative destinations assumed the original working directory):

```bash
# Core clone and source verification
 git clone https://github.com/obsolescence/pidp11.git /opt/pidp11
 git -C /opt/pidp11 rev-parse HEAD
# Separate working copy
 cp -a --sparse=always pristine/systems /opt/pidp11/systems-working
# Updated RSX originals
 curl -fL --connect-timeout 15 --max-time 180 -o resources/rsx-pidp.dsk.gz ftp://ftp.dfupdate.se/pub/pdp11/rsx/pidp/pidp.dsk.gz
 curl -fL --connect-timeout 15 --max-time 180 -o resources/rsx-pidp.tap.gz ftp://ftp.dfupdate.se/pub/pdp11/rsx/pidp/pidp.tap.gz
# Optional Nankervis original
 curl -fL --connect-timeout 15 --max-time 180 -o resources/nankervis.tar.gz https://obsolescence.dev/pidp11/nankervis.tar.gz
# Verified manual launcher/control commands
 /opt/pidp11/bin/pdp11control.sh start 0000
 /opt/pidp11/bin/pdp11control.sh status
 /opt/pidp11/bin/pdp11control.sh stop
 /home/pi/.local/bin/pdp11control start 0003
 TERM=vt100 /home/pi/.local/bin/pdp11
```

These commands are historical evidence, not an instruction to run them against the existing installation. The guide uses equivalent shorter download forms but clearly labels its consolidated operations. Internal Python copy/extraction/configuration operations have the methods and affected paths recorded above; the newer guide heredocs must not be described as the exact old helper bodies.

It installed many transitive graphics/development libraries, but no complete desktop environment. Build tools, Python, curl, wget and xz were already available; the guide makes these fresh-card assumptions explicit rather than silently inheriting them.

### Exact runtime mapping

| Backup under `/opt/pidp11/bin/backup64bit-binaries/` | Runtime under `/opt/pidp11/` |
|---|---|
| `pdp11_realcons` | `src/02.3_simh/4.x+realcons/bin-rpi/pdp11_realcons` |
| `scansw` | `src/11_pidp_server/scanswitch/scansw` |
| `pidp1170_blinkenlightd` | `src/11_pidp_server/pidp11/bin-rpi/pidp1170_blinkenlightd` |

**VERIFIED CURRENT STATE:** pi-owned 0755 runtimes; no added file capabilities. Existing checkout symlinks route to these files. GUI frontend executables were not selectively copied by this procedure. SIMH was not recompiled or replaced with an independent newer SIMH tree. Recorded runtime: V4.0-0 REALCONS, build 1 December 2024; panel server v1.4.1, build 2 December 2024. These are supplied December 2024 builds, selected from the pinned checkout rather than compiled during the installation. During this Mac review, the three cached official backup files independently matched the SHA-256 values recorded below and were identified as dynamically linked AArch64 ELF files. That corroborates their upstream byte identity, not their present installation permissions or dependencies on the Pi.

### Installed package versions (17 November read-only check)

| Package | Version |
|---|---|
| git | 1:2.47.3-0+deb13u1 |
| screen | 4.9.1-3 |
| poppler-utils | 25.03.0-5+deb13u4 |
| libsdl2-dev | 2.32.4+dfsg-1 |
| libpcap-dev | 1.10.5-2 |
| libreadline-dev | 8.2-6 |
| libtirpc-dev | 1.3.6+ds-1 |
| libdbus-1-dev | 1.16.2-2 |
| rpcbind | 1.2.7-1 |
| build-essential | 12.12 |
| python3 | 3.13.5-1 |
| curl | 8.14.1-2+deb13u7 |
| wget | 1.25.0-2 |
| xz-utils | 5.8.1-1+deb13u2 |

Full historical package list: `validation/installed-packages.txt`. Versions are evidence, not a guarantee that these packages remain obtainable forever.

## Comparison with the installer at the recorded commit

Inspected using `git show <recorded-SHA>:install/install.sh`; it was **not executed**. Official instructions remain [Oscar's instructions](https://github.com/obsolescence/pidp11). Our route is community-tested on one machine, not officially supported or endorsed. The building page documents a headless/Wayland installation limitation; our investigation did not diagnose its exact mechanism or demonstrate a fix to the installer.

| Upstream operation | Our treatment and reason |
|---|---|
| Require `/opt/pidp11`, non-root installer user; recursive ownership correction | Same destination/user outcome; root created pi-owned empty directory first, then ordinary-user Git clone. No recursive ownership repair needed |
| apt dependency block | Same SDL2, PCAP, readline, Screen, tirpc packages; additional Git, PDF tooling and DBus development package. DBus development supports the source-build fallback considered but never needed |
| Choose `backup64bit-binaries` when architecture is arm64 | Same three core binary choices/targets; copied as owner rather than through sudo. No Trixie binary patch |
| Copy VT52, sty, Tek4010 binaries | Omitted selective frontend installation; text-only target, no GUI customization |
| Set scheduling capability and setuid bits | Omitted. GPIO group/gpiomem access already existed. RT-priority warning observed; timing with physical panel still unverified. Do not infer owner-pi setuid would grant root |
| Set `cap_net_raw,cap_net_admin` on emulator | Omitted because host Ethernet capture/guest networking were not used |
| Enable/start rpcbind explicitly | APT installation yielded active/enabled packaged service/socket; no explicit `systemctl enable/start` execution is established for our sequence. The earlier review recorded both enabled and port-111 exposure; no local binding override was documented. The panel server also registers separate UDP/TCP RPC transports; its actual listening addresses/ports were not captured in these copies |
| Create `/usr/local/bin` commands and `~/pdp.sh` | User-local `~/.local/bin` symlinks instead. Those system-wide/home links are absent in current inspection |
| `.profile` or desktop autostart | Both omitted intentionally; manual start only. No systemd emulator unit |
| Main images extracted directly into live installation | Download retained, originals extracted/hashes/read-only first, separate sparse working copies used |
| BSD live download, config edits, menu 0211 | Same upstream resource family/menu; retained compressed/pristine files. Recorded downloaded config already had the sensor attachment commented and REALCONS enabled; no claim those particular edits were needed/executed |
| RSX anonymous FTP disk/tape, menu 2024 | Same upstream endpoint and supplied `boot.ini.bilquist`; curl rather than interactive wget/email. Retained originals; added disk boot and omitted host network listeners/attachments in working configuration |
| Desktop icons, libfm settings, wallpaper, fonts | Omitted; no display/desktop needed for intended operation |
| GPIO boot changes | None in our procedure; no overlays, pin remapping, group edits, capability grants or physical verification |
| Trixie-specific code change | None established. Packaging/runtime compatibility verified here; library installation plus working guest configuration, not a C-source port |

Historical retrieval diagnostics also matter: the legacy Nankervis HTTPS path at pidp.net produced an expired-certificate error, so the official obsolescence.dev HTTPS endpoint was used; no TLS-check bypass was applied. RSX documentation at older HTTPS endpoints timed out/failed, while the maintainer's HTTP page and official anonymous FTP image endpoint were reachable. These are observations from the earlier run, not promises of present availability.

No `DISPLAY`, `WAYLAND_DISPLAY`, `SDL_VIDEODRIVER`, login-shell or global environment setting was added. Interactive console checks used `TERM=vt100` where recorded. The official launcher starts its GPIO/RPC server even when an explicit boot number bypasses switch scanning. The reviewed server code creates both UDP and TCP transports and its request handlers provide no application-level authentication. `set realcons host=localhost` selects the SIMH client destination; it does not bind the server to loopback. Protecting port 111 alone does not establish isolation of the separate registered service ports, and disabling guest Ethernet does not secure this host service. The guide now provides a future fresh-install `ss`/`rpcinfo` before-and-after checkpoint; no server listening address is inferred for our Pi.

## Validation chronology and exact scope

1. **VERIFIED EXECUTED:** standalone CPU test through `/opt/pidp11/bin/client11` and `validation/simh-basic.ini`: CLR R0, INC R0, HALT; R0 `000001`, PC `001006`. No panel connection required. Evidence F.
2. **VERIFIED EXECUTED:** official control start `0000` (idled), attach/detach, REALCONS inspection and stop; official start `0003` (RT-11), reconnect/read and stop. Early non-PTY tool launches did not persist, and overlapping cleanup briefly removed the shared command file. A retained interactive parent and sequential cleanup succeeded. This is not evidence of a required production patch. A/F/L.
3. **VERIFIED EXECUTED:** RT-11SJ V5.03, UNIX V7, updated 2.11BSD patch 482 and updated RSX-11M+ V4.6 BL87: boots, console commands, marker-file persistence across emulator restart and appropriate shutdown. BSD tested single-user; no multiuser/network claim. F/G.
4. **VERIFIED EXECUTED:** Phase 3 extra guests below, mostly via named Screen sessions around standalone configs. Boot-number mappings are installed state, not proof every number was exercised through `pdp11control`. G.
5. **VERIFIED EXECUTED:** 30-minute RT-11 official-launcher/panel-server run: 181 samples, fixed RSS 16,056 KiB/2,784 KiB; mean CPU 93.7%/21.9% of one core; 58.0–67.7°C; soft limiting in 176 samples. No process-read failures; undervoltage and generic-throttling bits (0, 2, 16, 18) remained clear, while soft-temperature bits were recorded. Concurrent guest/checksum work contributed host load. H.
6. **VERIFIED EXECUTED:** independent hash verification of 76 pristine files and 18 recovery resources, Git integrity and complete bundle checks; controlled Phase 3 reboot, SSH reconnection and no autostart. I/G. The post-reboot helper script was prepared but not run; evidence was recorded directly in the final report.

| Additional guest | Installed boot code | Actual result / shutdown qualification |
|---|---|---|
| UNIX V6 | 0106 | Root shell, listing, Screen reconnect; three completed sync commands then SIMH exit |
| UNIX V5 | 0105 | Same successful checks/shutdown |
| RSTS V7.0-07 | 0002 | Login, BASIC arithmetic, reconnect; SHUTUP completed to bootstrap prompt; pack recovery and missing optional RTS warnings; historical 1986 date |
| DOS/BATCH V10-01A | 0004 | Login/reconnect; idle monitor stop and disk detach only, no dedicated guest-shutdown/write-persistence validation; historical date; LOGOUT rejected |
| UNIX System III | 0113 | Single-user shell/listing/reconnect; three sync commands then SIMH exit |
| UNIX System V | 0115 | Same successful checks/shutdown |
| Reconstructed UNIX V1 | 0101 | Root shell/listing/reconnect; no guest sync/shutdown per supplied notes; stopped idle shell, detached/flushed RF buffer, exited; redundant RHA-disable warning investigated |
| UNIX V4 | 0104 | **Incomplete** usable login; missing DH device warning and runtime 11/45/bootstrap retry documented; no speculative VH substitution; guest filesystem cleanliness unproven |
| Original RSX-11M+ V4.6 BL87 | 0001 | Full startup/TIME/reconnect; SHUTUP completed final dismount/HALT despite bundled optional/network cleanup warnings |

Nankervis code 1000 attached 14 disks and three tapes successfully; its individual OSs were not boot-tested. IDLED and Blinky are demonstrations, not operating systems. Blinky remains panel-dependent in the revised standalone procedure. Graphics, serial hardware, guest networking, physical switches/LEDs and multiday stability remain unverified. The panel server's ACTIVE status is not physical detection.

## Recorded power and status investigation, 17 November

**VERIFIED CURRENT STATE:** temperature approximately 50–51°C at initial inspection; `get_throttled` repeatedly `0x50000`. Bits 16 and 18 mean **undervoltage has occurred** and **throttling has occurred**. Low current-state bits are clear. This is not proof the supply path is resolved, and the throttle history bit alone does not identify temperature as its cause. Official definitions: [Raspberry Pi vcgencmd documentation](https://www.raspberrypi.com/documentation/computers/os.html#vcgencmd).

The earlier review transcribed the then-current boot journal: at **15.136 seconds after boot**, “Undervoltage detected!”, and at **17.152 seconds**, “Voltage normalised”. Wall-clock journal timestamps precede current synchronized time; monotonic offsets are preferable for this observation. No power hardware was measured or changed. Supply, cable, connection resistance, startup load and other causes have not been distinguished. Current temperature is not a retrospective diagnostic. Earlier Phase 3 readings `0x80008`/`0x80000` describe soft-temperature limiting in that earlier boot; the final Phase 3 reboot check read `0x0` at that time. These are different observations, not a permanent health guarantee. Original reports' phrase “hard throttling” should be read against the official generic “throttling” bit definition, not as proof of a thermal cause.

**VERIFIED CURRENT STATE:** SSH/NetworkManager/rpcbind active; zero failed units; no Screen sessions or running emulator. GPIO group membership/gpiomem permissions exist, no new capabilities. No emulator systemd units or desktop autostart directory; no login startup added. Known earlier Wi-Fi SDIO and startup warnings remain in the original record; no claim of permanent repair.

The earlier review reproduced `"$HOME/.local/bin/pdp11control" status` silence, explained by the source: the `status` branch filters `screen -ls pidp11` for matching sessions and prints nothing when none match. A trailing unconditional `exit 0` masks the pipeline's exit status. `"$HOME/.local/bin/pdp11control" stat` prints “PiDP-11 is down.” on stderr; it also exits 0. Neither exit code is a reliable stopped/running distinction. `screen -ls pidp11` plus process inspection is the diagnostic; no emulator was started to demonstrate the running case.

Git working-tree differences are expected: the three tracked runtime binaries differ because official ARM64 backup files were selected, `systems/selections` is changed, and guest/standalone-config directories are untracked. No textual C-source or launcher/control diff was found. The three installed runtime files were re-compared read-only during the earlier Pi-based review: all match their backup bytes and mode 0755. SHA-256: emulator `340c3311d2be6a04a5f3cc05c97747f524be58de3ea4d13fec97991a09df454e`; scanner `5c0c05dc885946c5ef324b4e90eb7b42a0c2f20215292831b8b517daa686bb07`; panel server `8d1cd3b97ae0155b1b0874b75a94deaf7530a8727f87464db2d0a2025ccbcf02`.  A dirty Git tree does not itself establish corruption; do not use reset/clean to hide these installation changes.

## Backup provenance and editorial corrections

The owner reports a completed **macOS dd → Zstandard → SHA-256** golden-card backup, using direct streaming into Zstandard and verified byte-for-byte. That supersedes the earlier report's then-correct statement that no image had yet been created. The older Phase 3 backup document describes a **proposed gzip workflow**, not the later actual compression method. Original files have intentionally not been rewritten.

Two small local records are now available: `Backups/2026-11-16/source-card.sha256` and `image-content.sha256`. They contain the same SHA-256 value, recorded in the evidence appendix. This pass read those text files only; it did not read the source card, decompress the image, verify a compressed-file digest or reproduce the original command exits. The detailed `dd`/Zstandard transcript, compression flags and tool versions remain unavailable. The guide therefore labels its private-directory, permission and streaming instructions **RECOMMENDED equivalents**. A spare-card restore-and-boot trial remains separate. Keep the golden image private because it contains host keys and credentials; no guest disks or backup images are included with this review.

Other points requiring review: identify the original Imager/OS artifact if exact blank-card replay is desired; validate every consolidated guide command on a spare fresh card; and record any kernel, package or archive changes. The recorded SHA-256 values identify downloaded bytes; they are not maintainer signatures.

## Reproducibility verdict

The earlier Pi-based review classified the installed result and the 25 actions above as supported by its original records. This revision inspected the selected original records listed in the evidence appendix and preserves the distinction between those records and the later review results whose raw captures were not included. **The public guide has not been followed from a blank card by an independent reader.** Explicit checkout pinning, fresh-card prerequisite additions, simplified installation commands, consolidated configuration helpers, checksum gates and the proposed Zstandard command sequence are not all original execution transcripts. They are tagged in the guide and must pass the clean-install checklist before being advertised as independently reproduced.

The documentation is suitable for Oscar's technical review as a review draft, with the current power limitation prominently retained. It is not an officially supported Trixie installer, a general Pi-model compatibility claim, or a publication-ready claim of independent reproducibility.

Historical documentation validation: the prior four-file review reported its static checks, a 101-file original-record/configuration hash comparison with no differences, and byte equality of the three installed ARM64 runtimes with their backups. Those Pi-based comparisons were not repeated in this Mac pass. The current local checks and remaining human review tasks are listed in [the checklist](PUBLICATION-CHECKLIST.md); precise supporting claims and gaps are in [the evidence appendix](PIDP11-EVIDENCE-APPENDIX.md).
