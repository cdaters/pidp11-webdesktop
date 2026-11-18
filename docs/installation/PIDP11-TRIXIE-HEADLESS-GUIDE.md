# Installing PiDP-11 on Raspberry Pi OS Trixie Lite (64-bit): A Step-by-Step Headless Guide

**Craig Daters · [RetroRealm.org](https://retrorealm.org/)**

**Public community guide · published with M5.2, 18 November 2026**

Technical content: 17 November 2026 review revision. This is a guide to Oscar's original software, not a Web Desktop installer.

This guide reconstructs a successful Pi 3B+ installation of Oscar Vermeulen's official GitHub software. It is **not an official installer or an endorsement by Oscar**. The installed machine works, but an independent reader has **not yet repeated this complete tutorial from a blank card**. Review the companion [installation record](PIDP11-TRIXIE-INSTALLATION-RECORD.md) and [publication/clean-install checklist](PUBLICATION-CHECKLIST.md) before treating the complete tutorial as independently reproduced.

> **Read first:** the command blocks below are instructions for a **new, expendable installation**, not maintenance commands for an existing PiDP-11. Stop at a failed checkpoint. Do not overwrite an existing `/opt/pidp11`, reuse writable guest disks, or run the upstream installer in addition to this procedure.

Our later read-only review found historical undervoltage/throttling flags (`0x50000`); earlier testing also observed soft-temperature limiting. **Power and thermal behavior are not fully resolved.** The guide documents that limitation rather than claiming a fault-free power supply.

## Part 1 — What you are building

Oscar's PiDP-11/70 is a reproduction of the PDP-11/70 front panel. Inside, a Raspberry Pi runs Linux and hosts the emulated computer. Three layers cooperate:

1. **SIMH**, originally created by Bob Supnik and developed by its contributors, emulates the PDP-11 processor and peripherals. Old operating systems see an emulated PDP-11, not a Raspberry Pi.
2. **BlinkenBone/REALCONS**, associated with Jörg Hoppe's work, connects simulator state and controls to a front panel.
3. **PiDP-11 software**, curated and integrated by Oscar and contributors, provides the Pi panel server, launch scripts, boot menu and guest configurations.

You can prepare and test the software before soldering the physical kit. That is what we did. The normal launcher still runs its GPIO/RPC panel server; a boot number selects an OS without reading absent switches. A separate standalone configuration can test SIMH without connecting to that server.

You will encounter two computers in one terminal: the **Pi's Linux shell** launches programs; the **PDP-11 guest console** accepts RT-11, UNIX or RSX commands. SIMH also has a `sim>` control prompt. Always check which prompt you are using.

### Verification checkpoint

**Run:** on a computer already online, open the [official repository](https://github.com/obsolescence/pidp11) and [building instructions](https://obsolescence.dev/pidp-11-building-instructions.html).

**Expected result:** PiDP-11 project documentation. No Pi command is needed yet.

**If it fails:** resolve network access before depending on remote downloads. Do not substitute an unidentified disk-image bundle.

**Continue when:** you understand that this installs a Linux-hosted emulator, with hardware tests deferred.

## Part 2 — Gather the equipment

Required: a compatible Pi, microSD and reader, suitable regulated supply/cable, another computer with SSH, and a local network. We tested **Pi 3 Model B Plus Rev 1.3**, approximately 1 GB RAM, a 32 GB card, and Wi-Fi. A larger card provides room for preserved originals and working copies. Allow several gigabytes for expanded guest images; optional collections add more. A 64 GB card is a practical fresh-install choice, not a requirement demonstrated by our original installation.

Optional: Ethernet, heatsink/ventilation, HDMI/keyboard for recovery, physical PiDP-11 kit, and a spare card for restore testing. Other Pi models may be supported upstream but were not validated by this guide's tests.

The recovered baseline records establish Debian **13 Trixie with Raspberry Pi OS packages**, ARM64, kernel `6.18.60+rpt-rpi-v8`, target `/opt/pidp11`. The commands use the conventional example username `pi` and hostname `pidp11`; these are not credentials. A future Trixie image may have different package/kernel versions; record them and treat differences as a new test environment.

Use a reliable Pi-appropriate power path. Do not raise voltage or alter thermal limits to make warnings disappear. On a Pi 3B+, the manual specifically cautions about powering through the panel/key-switch traces; begin with the Pi's normal micro-USB input and defer alternative wiring. Our current `0x50000` history cannot be attributed to a specific cable or supply from software evidence alone.

### Verification checkpoint

**Run:** inspect the Pi model and supply labeling while powered off; confirm the card may be erased.

**Expected result:** suitable hardware, an identifiable card and a stable intended supply arrangement. This is a physical check, not validated by a terminal command.

**If it fails:** resolve the equipment uncertainty before imaging or applying power.

**Continue when:** the card is expendable and the initial power path does not depend on unverified panel wiring.

## Part 3 — Prepare a blank microSD

**RECOMMENDED, not recovered historical preparation:** the original machine was already installed when inspection began. Its precise Imager version and OS image checksum are unknown.

1. Obtain [Raspberry Pi Imager](https://www.raspberrypi.com/software/) for macOS, Windows or Linux.
2. Select your Pi model and **Raspberry Pi OS Lite (64-bit)** based on Trixie. Avoid confusing Lite with a desktop image or the 32-bit edition. Imager labels can change; consult its [current official setup instructions](https://www.raspberrypi.com/documentation/computers/getting-started.html).
3. Select the intended microSD. **Writing erases it.** Keep protection against selecting system disks enabled.
4. In OS customization, set hostname `pidp11`, username `pi`, your own private authentication settings, correct locale/time zone and Wi-Fi/regulatory settings if needed. Enable SSH. Do not publish your password or keys. Keep unrelated remote-access features optional.
5. Write and verify the card, eject it, insert it in the Pi, connect networking as appropriate and power up. Allow first boot to finish.

Using `pi` and `/opt/pidp11` avoids the path assumptions in this software revision. Adapting other usernames is outside this tested procedure.

### Verification checkpoint

**Run:** in Terminal on macOS/Linux or an SSH-capable PowerShell/terminal on Windows, on your other computer:

```bash
ssh pi@pidp11.local
```

**Expected result:** a Linux shell after you authenticate. The exact banner is version-dependent, not an example captured from our first boot.

**If it fails:** check power, first-boot time, Wi-Fi details and SSH enablement. If `.local` discovery fails, find the Pi's address in your router and use that address. Verify host identity before accepting SSH key changes; do not blindly remove an old key warning.

**Continue when:** you can log in as `pi` over SSH.

## Part 4 — Inspect Linux and review updates

All commands until explicitly labeled otherwise run **in the Pi's Linux shell**, not on your Mac/PC or inside a guest.

```bash
whoami
hostname
cat /etc/os-release
dpkg --print-architecture
uname -m
uname -r
cat /proc/device-tree/model
df -h /
free -h
vcgencmd measure_temp
vcgencmd get_throttled
```

`sudo` runs an administrative command; enter your own Pi password only when prompted in your terminal. It is normal for the password not to echo. Do not disable sudo password checks for this tutorial.

**RECOMMENDED fresh-card update review:** refresh package metadata, inspect pending changes and available space, then update within the configured Trixie repositories. Raspberry Pi recommends `apt full-upgrade` because it can handle changing package dependencies. That command may install or remove packages; it does **not** by itself switch Debian releases. Changing release repositories is a separate operation, and Raspberry Pi recommends a new OS image for a major-release change. Review the proposed transaction before accepting it. [Official update guidance](https://www.raspberrypi.com/documentation/computers/os.html#update-your-current-raspberry-pi-software).

```bash
sudo apt update
apt list --upgradable
df -h /
```

If you choose to apply the reviewed updates on this **new card**:

```bash
sudo apt full-upgrade
```

If an installed kernel update needs activation, finish the update and reboot, then reconnect:

```bash
sudo reboot
```

In our actual history the owner had already upgraded packages before inspection; an approved reboot activated the installed kernel. We did not run an upgrade as a Trixie compatibility fix.

### Verification checkpoint

**Run:** repeat `whoami`, `dpkg --print-architecture`, `uname -m`, `uname -r`, and `vcgencmd get_throttled` after reconnecting.

**Expected result:** `pi`, `arm64`, `aarch64`; a recorded running kernel. Our tested kernel was `6.18.60+rpt-rpi-v8`. Ideally flags read `0x0`; see Part 14 for history/current-state interpretation.

**If it fails:** stop for a wrong user/architecture. Active power or thermal flags require investigation before stressing the Pi. Historical flags still deserve investigation; rebooting merely to clear them is not a repair.

**Continue when:** the architecture matches, package operations completed successfully, and you have a usable, stable host with power observations recorded.

## Part 5 — Install the prerequisites

**VERIFIED EXECUTED dependency selection:** this was the actual user-run installation command. It includes development libraries for the considered source-build fallback; it is a historical matching set, not a claim of minimum runtime size.

> **Network exposure:** `rpcbind` is the service directory, commonly on port 111. The normal launcher also starts Oscar's panel RPC server, which creates **UDP and TCP transports on additional registered ports**. The reviewed request handlers do not provide application-level authentication. `set realcons host=localhost` tells the SIMH client where to connect; it does not restrict the server's listening address. Protecting port 111 alone is not evidence that the panel server is isolated. Before using the normal launcher on a fresh installation, prepare an appropriately isolated network/firewall policy and complete the before/after listener check in Part 9. Disabling guest Ethernet does not secure these Linux-hosted RPC sockets. No specific panel-server listening address or port on our Pi is asserted here. [Pinned server creation code](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/11_pidp_server/pidp11/main.c), [reviewed dispatcher](https://github.com/obsolescence/pidp11/blob/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75/src/07.0_blinkenlight_api/rpcgen_linux/rpc_blinkenlight_api_svc.c).

```bash
sudo apt-get update
sudo apt-get install --no-install-recommends \
  git screen poppler-utils libsdl2-dev libpcap-dev libreadline-dev \
  libtirpc-dev libdbus-1-dev rpcbind
```

**RECOMMENDED explicit fresh-card tools:** these were already available on our Pi; making them explicit avoids a hidden assumption:

```bash
sudo apt-get install --no-install-recommends \
  build-essential python3 curl wget xz-utils ca-certificates file libcap2-bin
```

| Package/tool | Purpose |
|---|---|
| Git | Retrieve and identify the official source |
| GNU Screen | Keep the PDP-11 console running while an SSH viewer detaches |
| SDL2 | Linked by the supplied emulator, even for text-only use |
| libpcap | Linked networking support; installing it does not configure guest networking |
| readline | SIMH command editing |
| tirpc / rpcbind | REALCONS/panel-server RPC communication and service lookup |
| DBus development files | Supports the source-build route considered, not a desktop requirement |
| Python, curl, xz | Download/extract/preserve guest resources in this procedure |
| poppler-utils | Inspect the PDF manual; optional for running the emulator |
| build-essential | Compiler/Make fallback tools; no compilation was needed here |

SDL2 development dependencies bring graphics libraries. This does **not** install or require a complete desktop, graphical login or Wayland session for the console workflow.

### Verification checkpoint

**Run:**

```bash
git --version
screen --version
python3 --version
systemctl is-active rpcbind
systemctl --failed --no-pager
```

**Expected result:** commands available; Python 3.13 on the tested Trixie setup; rpcbind active; no unexplained failed services. Historical versions are in the companion record.

**If it fails:** read the APT error and service journal before changing anything. `journalctl -u rpcbind --no-pager -n 30` is diagnostic. If the packaged service is inactive on a fresh machine, a reviewed `sudo systemctl start rpcbind` is a possible **RECOMMENDED** administrative action, not a command proven necessary in our original sequence.

**Continue when:** dependencies are installed and RPC support is understood and available for the normal launcher.

## Part 6 — Obtain and identify Oscar's source

1. Confirm `/opt/pidp11` does not already contain an installation. **Stop if it does.** This procedure is not an update/repair recipe.
2. Prepare the directory as root, then clone as `pi`. Ownership determines who may write the files; it does not make the emulator run as root.

```bash
sudo install -d -o pi -g pi -m 0755 /opt/pidp11
git clone https://github.com/obsolescence/pidp11.git /opt/pidp11
```

3. **RECOMMENDED reproducibility addition:** explicitly check out the tested commit. Originally we cloned `main` and verified that it already matched this SHA; an explicit detached checkout was not recorded then.

```bash
git -C /opt/pidp11 checkout --detach 26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75
git -C /opt/pidp11 remote get-url origin
git -C /opt/pidp11 rev-parse HEAD
```

This pin is the tested 2026 source snapshot, not a promise about later upstream releases. Do not follow this guide's binary/configuration assumptions against a different revision without review.

4. Preserve source and a small local preparation directory. The Git bundle command was used historically; the chosen workspace layout below follows our recorded layout.

```bash
mkdir -p "$HOME/pidp11-work/resources" "$HOME/pidp11-work/pristine" "$HOME/pidp11-work/validation"
git -C /opt/pidp11 bundle create "$HOME/pidp11-work/resources/pidp11-upstream.bundle" --all
git -C /opt/pidp11 bundle verify "$HOME/pidp11-work/resources/pidp11-upstream.bundle"
```

### Verification checkpoint

**Run:**

```bash
stat -c '%U:%G %a %n' /opt/pidp11
git -C /opt/pidp11 rev-parse HEAD
test -f /opt/pidp11/bin/backup64bit-binaries/pdp11_realcons && echo 'ARM64 backup present'
```

**Expected result:** `pi:pi 755`, the full SHA above, an ARM64 backup present, successful bundle verification.

**If it fails:** check ownership, URL and clone completion. Do not fix a nonempty installation by deleting it, resetting it or rerunning a clone over it.

**Continue when:** the checkout is identified, writable by `pi`, and preserved.

## Part 7 — Selectively install the core software

Oscar's normal instructions run `/opt/pidp11/install/install.sh`. His building page describes a headless/Wayland installation limitation. Our route used official files and reviewed individual operations instead. It is a community-tested alternative; it does not establish why that installer limitation occurs or claim to fix it.

### 7.1 Read the installer, without running it

```bash
less /opt/pidp11/install/install.sh
```

Press `q` to leave `less`. The relevant choices include dependencies, ARM64 backups, permissions/capabilities, RPC, console links, guest downloads, desktop customization and startup. We omitted GUI setup, emulator autostart, PCAP capabilities, setuid changes and real-time capability grants.

### 7.2 Install the three official ARM64 runtime binaries

**RECONSTRUCTED command form:** historically a Python helper copied these same three files and set mode 0755. `install -m 0755` below gives that result without pretending to be the original heredoc. Run as `pi`, without sudo, because the checkout is pi-owned.

```bash
install -m 0755 /opt/pidp11/bin/backup64bit-binaries/pdp11_realcons \
  /opt/pidp11/src/02.3_simh/4.x+realcons/bin-rpi/pdp11_realcons
install -m 0755 /opt/pidp11/bin/backup64bit-binaries/scansw \
  /opt/pidp11/src/11_pidp_server/scanswitch/scansw
install -m 0755 /opt/pidp11/bin/backup64bit-binaries/pidp1170_blinkenlightd \
  /opt/pidp11/src/11_pidp_server/pidp11/bin-rpi/pidp1170_blinkenlightd
```

The repository already supplies `bin/client11`, `bin/server11` and `bin/scansw` symlinks. A symlink is a pointer to another file; verify its target rather than replacing it. These paths are hardcoded under `/opt/pidp11` in this revision.

### Verification checkpoint

**Run:** in the Pi's Linux shell. This inspection loop stops on a mismatch; it grants no additional privileges.

```bash
bash <<'SH'
set -eu
base=/opt/pidp11
for pair in client11:pdp11_realcons server11:pidp1170_blinkenlightd scansw:scansw; do
    link=${pair%%:*}
    backup=${pair#*:}
    target=$(readlink -f "$base/bin/$link")
    test -n "$target"
    test -f "$target" && test -x "$target"
    printf '\n%s -> %s\n' "$link" "$target"
    file "$target"
    stat -c '%U:%G %a %n' "$target"
    cmp "$base/bin/backup64bit-binaries/$backup" "$target"
    sha256sum "$base/bin/backup64bit-binaries/$backup" "$target"
    getcap "$target"
    description=$(file -b "$target")
    case "$description" in
        *ELF*aarch64*) ;;
        *) printf 'Unexpected architecture: %s\n' "$target" >&2; exit 1 ;;
    esac
    case "$description" in
        *'statically linked'*) printf 'Static executable: no dynamic-library check needed\n' ;;
        *)
            libraries=$(ldd "$target")
            printf '%s\n' "$libraries"
            if printf '%s\n' "$libraries" | grep -q 'not found'; then
                printf 'Resolve missing libraries before continuing\n' >&2
                exit 1
            fi
            ;;
    esac
done
SH
```

**Expected result:** all three links resolve to the runtime paths in 7.2; each is an ARM aarch64 ELF, owned by `pi:pi`, mode `755`. Each `cmp` succeeds silently and each pair of SHA-256 values matches. Dynamic binaries have no missing libraries; `getcap` is blank because this route grants no capabilities. A different path, owner, mode or capability is a review finding even if the loop finishes. These are supplied **December 2024 builds**, not binaries rebuilt from the 2026 source checkout.

**If it fails:** check the resolved path, architecture and package installation. Missing SDL2 was an actual pre-dependency finding. Do not add setuid bits, capabilities or root execution to satisfy this checkpoint.

**Continue when:** all three official runtimes match their backups and their ownership, permissions and dependencies are understood.

### 7.3 Add user-local console commands

**RECONSTRUCTED shell equivalent of recorded symlink creation:** first check that these two destinations do not already exist. If they do, inspect them rather than forcing replacement.

```bash
mkdir -p "$HOME/.local/bin"
ln -s /opt/pidp11/bin/pdp11control.sh "$HOME/.local/bin/pdp11control"
ln -s /opt/pidp11/etc/pdp.sh "$HOME/.local/bin/pdp11"
```

We did not create the installer's `/usr/local/bin` links or add a `.profile` startup line. The guide uses full user-local paths so it does not depend on your PATH environment. No GUI or global environment settings are needed. `TERM=vt100` is used in recorded console tests, not as a global profile edit.

### Verification checkpoint

**Run:**

```bash
readlink "$HOME/.local/bin/pdp11control"
readlink "$HOME/.local/bin/pdp11"
"$HOME/.local/bin/pdp11control" stat
screen -ls pidp11
id -nG
ls -l /dev/gpiomem
```

**Expected result:** official script targets; `stat` reports “PiDP-11 is down.”; no running Screen session yet. Our user already belonged to `gpio` and could access group-owned `/dev/gpiomem`. We did not add the group or change device permissions.

**If it fails:** wrong link target/ownership or missing GPIO access needs inspection. Do not run the whole emulator as root as a shortcut. Other Pi models and permission layouts need separate review.

**Continue when:** commands resolve, the emulator is stopped, and the expected GPIO access exists for the normal launcher. The panel server may warn about real-time priority without a capability; physical timing remains a later test.

### 7.4 Test SIMH independently

This small CPU test was actually executed before guest validation. It does not mount a guest disk or connect to REALCONS.

```bash
cat > "$HOME/pidp11-work/validation/simh-basic.ini" <<'EOF'
show version
show cpu
deposit 1000 005000
deposit 1002 005200
deposit 1004 000000
go 1000
examine r0
examine pc
exit
EOF
/opt/pidp11/bin/client11 "$HOME/pidp11-work/validation/simh-basic.ini"
```

### Verification checkpoint

**Run:** inspect the output of the preceding test.

**Expected result:** the following are **recorded output excerpts**, not invented examples:

```text
HALT instruction, PC: 001006 (HALT)
R0:     000001
PC:     001006
Goodbye
```

**If it fails:** resolve binary/library/architecture issues before downloading and booting guest disks. Our supplied binary identified itself as V4.0-0 REALCONS built 1 December 2024; it was not recompiled.

**Continue when:** the test exits normally with the expected register values.

## Part 8 — Preserve and install guest operating systems

Guest systems live in disk-image files. **Pristine** means the original unbooted bytes; **working** means a separate writable copy. Booting an image may change it even if you do not edit a document inside it. Do not use hardlinks between the two sets.

This tutorial links to upstream resources. Guest disk images and the golden-card backup are not included in the documentation package.

### 8.1 Download the main collection

```bash
cd "$HOME/pidp11-work/resources"
curl --fail --location --output systems.tar.gz \
  https://obsolescence.dev/pidp11/systems.tar.gz
echo '14bcf83610737c2383ffbfa411ebbd067590705fd1c42caa679d1a5a63f60bd9  systems.tar.gz' | sha256sum -c -
```

### Verification checkpoint

**Run:** the checksum check above before extracting.

**Expected result:** `systems.tar.gz: OK` **only for the exact recorded download**.

**If it fails:** stop. The endpoint may have changed or the download may be incomplete. Do not disable the check to force a different collection through a pinned guide. Resolve against the authoritative values in the companion record/publication review first.

**Continue when:** your bytes match the recorded archive or a separately reviewed newer revision has its own validation plan.

### 8.2 Extract originals

**RECONSTRUCTED consolidated helper:** this uses Python 3.13's safe extraction filter, as the historical work did. It is for an empty fresh preparation area only.

```bash
python3 - <<'PY'
from pathlib import Path
import tarfile
r = Path.home() / 'pidp11-work'
if (r / 'pristine/systems').exists() or (r / 'pristine/systems').is_symlink():
    raise SystemExit('STOP: pristine systems path already exists')
with tarfile.open(r / 'resources/systems.tar.gz') as archive:
    archive.extractall(r / 'pristine', filter='data')
print('Extracted pristine/systems; nothing has been booted')
PY
```

The Git source archive is a different case: it has absolute runtime symlinks, which safe extraction rejected during staging. We installed from Git instead. Do not weaken extraction safety or run an archive extractor as root to work around that source-staging incident.

### Verification checkpoint

**Run:**

```bash
ls "$HOME/pidp11-work/pristine/systems"
cat "$HOME/pidp11-work/pristine/systems/selections"
```

**Expected result:** guest directories including `rt11`, `unix7`, `211bsd`, `rsx11mp`, and a boot-selection file. At the recorded revision its UNIX V1 and Nankervis menu directory names need corrections made below.

**If it fails:** inspect the archive listing with `tar -tzf` and stop before creating working disks.

**Continue when:** originals exist under `pristine`, with no emulator running against them.

### 8.3 Optional updated BSD and RSX

This subsection is **one combined optional preparation step** for updated BSD **and** RSX: its download/hash/decompression blocks expect both resource sets. Run the whole subsection or skip it. Preparing only one is possible, but requires a separately reviewed subset of these commands; do not run the four-file checksum block with half the downloads missing. The upstream installer selects these resource families, but their mutable URLs are **not pinned by the PiDP-11 source commit**.

```bash
cd "$HOME/pidp11-work/resources"
curl --fail --location --output 211bsd-boot.ini \
  https://raw.githubusercontent.com/chasecovello/211bsd-pidp11/master/boot.ini
curl --fail --location --output 2.11BSD_rq.dsk.xz \
  https://raw.githubusercontent.com/chasecovello/211bsd-pidp11/master/2.11BSD_rq.dsk.xz
curl --fail --location --output rsx-pidp.dsk.gz \
  ftp://ftp.dfupdate.se/pub/pdp11/rsx/pidp/pidp.dsk.gz
curl --fail --location --output rsx-pidp.tap.gz \
  ftp://ftp.dfupdate.se/pub/pdp11/rsx/pidp/pidp.tap.gz
```

Anonymous FTP is the recorded RSX transport and provides no TLS authentication. The following hashes identify our recorded downloads, not a maintainer signature:

```bash
sha256sum -c - <<'EOF'
602712bd41fb59e8cf3095279eecb39daa2265fb2a8080c599f89639e8ab0b3d  211bsd-boot.ini
b3e6b8321e6e1ec28e1aebdef4282d6596bc1691ad9600fcac8072a8a119f1d0  2.11BSD_rq.dsk.xz
afc77f1701d904c92988dd05db9cb6b06e43042bc30f70052c276caadf6a1bfd  rsx-pidp.dsk.gz
94d4948595770db3dcebee84a03ad92e5fb8579fef751bcee3516730687411e0  rsx-pidp.tap.gz
EOF
```

**After all four hashes pass**, decompress without deleting the downloads:

```bash
python3 - <<'PY'
from pathlib import Path
import gzip, lzma, shutil
r = Path.home() / 'pidp11-work'
s = r / 'pristine/systems'
for folder, source, opener, target in [
    ('211bsd+', '2.11BSD_rq.dsk.xz', lzma.open, '2.11BSD_rq.dsk'),
    ('rsx11bq', 'rsx-pidp.dsk.gz', gzip.open, 'pidp.dsk'),
    ('rsx11bq', 'rsx-pidp.tap.gz', gzip.open, 'pidp.tap'),
]:
    destination = s / folder
    destination.mkdir(exist_ok=True)
    with opener(r / 'resources' / source, 'rb') as a, (destination / target).open('xb') as b:
        shutil.copyfileobj(a, b)
shutil.copyfile(r / 'resources/211bsd-boot.ini', s / '211bsd+/boot.ini')
shutil.copyfile('/opt/pidp11/install/boot.ini.bilquist', s / 'rsx11bq/boot.ini')
PY
```

### Verification checkpoint

**Run:** inspect the hash results and `ls -lh "$HOME/pidp11-work/pristine/systems/211bsd+" "$HOME/pidp11-work/pristine/systems/rsx11bq"`.

**Expected result:** four matching compressed/config hashes; expanded disks and the RSX tape/config retained separately. Our BSD later reported patch 482 and the updated RSX booted as V4.6 BL87.

**If it fails:** do not overwrite partial files and rerun blindly. Preserve the error, inspect download completeness/available space, and restart only the failed optional preparation in a new empty location.

**Continue when:** originals are complete and version drift is resolved. You may instead omit this optional subsection entirely.

### 8.4 Optional Nankervis collection

This adds additional historical disk/tape systems and diagnostics. The recorded download has **two gzip layers**; treating it as an ordinary single `.tar.gz` failed. Do not generalize that packaging quirk to every archive.

```bash
cd "$HOME/pidp11-work/resources"
curl --fail --location --output nankervis.tar.gz \
  https://obsolescence.dev/pidp11/nankervis.tar.gz
echo '1a524aeb0b63dcce47564964e977a06561e4e6a01b579cd9ed955768a8323ad5  nankervis.tar.gz' | sha256sum -c -
```

After that exact hash passes:

```bash
python3 - <<'PY'
from pathlib import Path
import gzip, tarfile
r = Path.home() / 'pidp11-work'
if (r / 'pristine/systems/nankervis').exists() or (r / 'pristine/systems/nankervis').is_symlink():
    raise SystemExit('STOP: Nankervis destination already exists')
with gzip.open(r / 'resources/nankervis.tar.gz', 'rb') as outer:
    with tarfile.open(fileobj=outer, mode='r|gz') as archive:
        archive.extractall(r / 'pristine', filter='data')
PY
```

### Verification checkpoint

**Run:** `ls "$HOME/pidp11-work/pristine/systems/nankervis"`.

**Expected result:** a boot configuration, guide PDF, RK/RL/RP disks and TM tapes. The actual installation later attached 14 disks and three tapes successfully; it did not boot every OS in them.

**If it fails:** stop on a hash/format difference. Do not try arbitrary repeated decompression against an unidentified download.

**Continue when:** the optional collection is intact, or skip it and let the menu builder below omit its unavailable entry.

### 8.5 Hash originals and make separate working copies

This **RECONSTRUCTED fresh-install helper** preserves the historical separation of unbooted originals and writable copies. Its ordering has been corrected for this review: every source, destination and manifest is checked before a copy, permission change or rename. Run it once, with no emulator running and no other process changing these directories.

```bash
python3 - <<'PY'
from pathlib import Path
import hashlib, json, os, stat, subprocess
r = Path.home() / 'pidp11-work'
b = Path('/opt/pidp11')
pristine = r / 'pristine'
source = pristine / 'systems'
stage = b / 'systems-working'
original = b / 'systems-upstream-original'
manifest_path = r / 'resources/pristine-manifest.json'

def fail(message):
    raise SystemExit('STOP: ' + message)

def real_directory(path):
    if path.is_symlink() or not path.is_dir():
        fail('Expected a real directory: ' + str(path))

def absent(path):
    if os.path.lexists(path):  # Includes files, directories and dangling symlinks.
        fail('Destination already exists; nothing will be merged: ' + str(path))

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return {'size': path.stat().st_size, 'sha256': h.hexdigest()}

# Complete preflight: no filesystem mutation above or in this section.
for path in (r, pristine, source, r / 'resources', b, b / 'systems'):
    real_directory(path)
for path in (stage, original, manifest_path):
    absent(path)
for path in (source / 'rt11/boot.ini', b / 'systems/idled/boot.ini'):
    if path.is_symlink() or not path.is_file():
        fail('Required configuration missing or linked: ' + str(path))
files = []
for path in sorted(pristine.rglob('*')):
    mode = path.lstat().st_mode
    if stat.S_ISLNK(mode) or not (stat.S_ISDIR(mode) or stat.S_ISREG(mode)):
        fail('Unexpected linked/special pristine entry: ' + str(path))
    if stat.S_ISREG(mode):
        if path.stat().st_nlink != 1:
            fail('Pristine hardlink needs review: ' + str(path))
        files.append(path)
if not files:
    fail('No pristine files found')
manifest = {str(path.relative_to(pristine)): digest(path) for path in files}

# mkdir reserves a new empty staging directory; cp cannot merge old contents.
stage.mkdir()
subprocess.run(['cp', '-a', '--sparse=always', str(source) + '/.', str(stage)], check=True)
for path in files:
    if not path.is_relative_to(source):
        continue
    copied = stage / path.relative_to(source)
    if copied.is_symlink() or not copied.is_file() or os.path.samefile(path, copied):
        fail('Working file missing, linked or shared with pristine: ' + str(copied))
    if digest(copied) != manifest[str(path.relative_to(pristine))]:
        fail('Working copy does not match: ' + str(copied))
    copied.chmod(0o644)

# Copy errors above prevent all manifest, pristine-permission and rename steps.
with manifest_path.open('x') as stream:
    json.dump(manifest, stream, indent=2)
    stream.write('\n')
for path in files:
    path.chmod(0o444)
absent(original)
(b / 'systems').rename(original)
try:
    absent(b / 'systems')
    stage.rename(b / 'systems')
except BaseException:
    # Restore the original name only if nothing has appeared at that path.
    if not os.path.lexists(b / 'systems'):
        original.rename(b / 'systems')
    raise
print('Pristine manifest saved; verified working copy installed; checkout original retained')
PY
```

Copying can take several minutes. A failure exits this Python process before replacement; there is no subsequent shell `cp` that can accidentally continue after a failed preflight. An existing destination or manifest is a reason to **stop and inspect**, not to delete it and rerun.

If copying fails, the old live `systems` and pristine files remain unchanged; the new `systems-working` may be incomplete. Keep it until you understand the failure, record which step failed, and move it to a separately named recovery directory before planning a retry. A failure after manifest creation may leave the manifest and read-only originals in place; preserve those records and inspect all three directory names. If the second rename fails, the helper attempts to restore the checkout directory's original name. This is not a transactional filesystem or protection from concurrent directory changes or power failure. Never boot a partial staging copy or force a rename over an existing directory.

GNU `cp --sparse=always` is the Pi/Linux copy command. Local Mac fixtures exercise the helper's ordering and failure paths with a small copy stand-in; they do not establish a full-card or Linux filesystem trial. In the historical installation Nankervis was added later; this guide prepares it before the working copy for a simpler fresh-install sequence.

### Verification checkpoint

**Run:**

```bash
stat -c '%i %a %n' \
  "$HOME/pidp11-work/pristine/systems/rt11/rt11V.dsk" \
  /opt/pidp11/systems/rt11/rt11V.dsk
test -f /opt/pidp11/systems-upstream-original/idled/boot.ini && echo 'Checkout original retained'
```

**Expected result:** different inode numbers on this same filesystem; pristine mode 444, working mode 644; checkout original retained.

**If it fails:** do not boot either disk. Investigate wrong copy paths, read-only working files, missing source or an accidental hardlink.

**Continue when:** original and working images are separate and only working images are writable. Same-card originals still need an external backup.

### 8.6 Configure text-only local operation while retaining the panel route

**RECONSTRUCTED, not independently replayed from scratch:** this consolidated helper expresses the actual working configuration changes. It edits configuration text, not pristine disks. Review it before running. It does not alter upstream C sources or launcher/control scripts.

```bash
python3 - <<'PY'
from pathlib import Path
import difflib, re, shutil
b = Path('/opt/pidp11')
r = Path.home() / 'pidp11-work'
diff = []
# Refuse leftovers from an earlier conversion before editing any configuration.
for existing in (b / 'systems').glob('*/boot-headless.ini'):
    raise SystemExit('STOP: existing standalone configuration needs review: ' + str(existing))
if (r / 'resources/headless-config.patch').exists() or (r / 'resources/headless-config.patch').is_symlink():
    raise SystemExit('STOP: existing partial patch needs review')
for p in sorted((b / 'systems').glob('*/boot.ini')):
    before = p.read_text()
    lines = []
    for line in before.splitlines():
        low = line.strip().lower()
        network_attach = re.match(r'^(att|attach)(\s+-\S+)*\s+(xu|xq|dz|dh|vh|dci|dli|dc)\s', low)
        absent_decus = p.parent.name == 'rsx11mp' and low.startswith('attach rq1 ')
        if network_attach or low == 'set vt enable' or absent_decus:
            lines.append('; headless local console: ' + line)
        else:
            lines.append(line)
    if p.parent.name == 'rt11':
        lines.insert(0, 'set vt disabled')
    if p.parent.name == 'rsx11bq':
        lines.append('boot rq0')
    after = '\n'.join(lines) + '\n'
    p.write_text(after)
    diff.extend(difflib.unified_diff(before.splitlines(True), after.splitlines(True),
                fromfile='original/' + p.parent.name + '/boot.ini',
                tofile='working/' + p.parent.name + '/boot.ini'))
# Retain the checkout's idled configuration rather than replacing it with an older archive version.
shutil.copyfile(b / 'systems-upstream-original/idled/boot.ini', b / 'systems/idled/boot.ini')
for p in sorted((b / 'systems').glob('*/boot.ini')):
    lines = p.read_text().splitlines()
    # Blinky loads PDP-11xx.ini; editing only boot.ini cannot make it standalone.
    # Conservatively skip other indirect command files too, pending full review.
    indirect = any(re.match(r'^\s*(?:do|call)\b|^\s*@', line, re.I) for line in lines)
    if p.parent.name.lower() == 'blinky' or indirect:
        print('Panel-dependent / indirect configuration; no standalone generated:', p.parent.name)
        continue
    standalone = ['; standalone: ' + line if re.match(r'^\s*set\s+realcons\b', line, re.I) else line
                  for line in lines]
    destination = p.parent / 'boot-headless.ini'
    with destination.open('x') as stream:
        stream.write('cd ' + str(p.parent) + '\n' + '\n'.join(standalone) + '\n')
selection = b / 'systems/selections'
before = selection.read_text()
entries = []
for line in before.splitlines():
    fields = line.split()
    if len(fields) != 2:
        continue
    number, name = fields
    name = {'unixv1': 'unix1', 'nkrvs': 'nankervis'}.get(name, name)
    if number == '1000' and not (b / 'systems/nankervis/boot.ini').exists():
        continue
    entries.append(number + '\t' + name)
for number, name in [('0211', '211bsd+'), ('2024', 'rsx11bq')]:
    if (b / 'systems' / name / 'boot.ini').exists():
        entries.append(number + '\t' + name)
after = '\n'.join(entries) + '\n'
selection.write_text(after)
diff.extend(difflib.unified_diff(before.splitlines(True), after.splitlines(True),
                               fromfile='original/selections', tofile='working/selections'))
(r / 'resources/headless-config.patch').write_text(''.join(diff))
for entry in entries:
    number, name = entry.split()
    if not (b / 'systems' / name / 'boot.ini').is_file():
        raise SystemExit('STOP: missing menu target: ' + entry)
print('Working configurations and menu targets prepared; autostart unchanged')
PY
```

The normal `boot.ini` keeps REALCONS commands for the panel route. The helper comments direct REALCONS commands in eligible standalone files, including multiple spaces or tabs. **Blinky is panel-dependent and deliberately receives no `boot-headless.ini`**: its `do PDP-11xx.ini 70 4m` can load active REALCONS commands from another file. Other active DO/CALL/`@` configurations are conservatively skipped too. A better regular expression alone does not resolve includes. This is a reviewed transformation for the pinned inputs, not a complete SIMH command parser; inspect the generated file before starting a standalone guest. Extra network terminal listeners and host Ethernet attachments are commented, not replaced by a bridge or Wi-Fi workaround. Updated RSX disk boot is enabled. Missing optional DECUS media is not silently created as an empty file. Disabling guest networking leaves the host panel RPC exposure described in Part 5 unchanged. The historical `headless-config.patch`, and the patch generated by this helper, are **partial change records**: they do not include the restored idled file or newly generated standalone files. Preserve those final files separately as well as the patch.

### Verification checkpoint

**Run:**

```bash
cat /opt/pidp11/systems/selections
cat /opt/pidp11/systems/rt11/boot.ini
cat /opt/pidp11/systems/rt11/boot-headless.ini
systemctl list-unit-files --no-pager '*pidp*' '*pdp11*'
```

**Expected result:** menu targets exist; RT-11 has VT disabled, no active VT-enable line; normal config retains REALCONS while standalone comments it. No emulator unit was added. With all optional images, updated guests use `0211` and `2024`, Nankervis `1000`, UNIX V1 `0101` points to `unix1`.

**If it fails:** inspect the saved diff and original configs. Stop if an archive no longer matches the patterns this helper was designed for. Do not broaden substitutions blindly.

**Continue when:** the configuration is reviewed and originals remain untouched. This helper still requires an independent clean-card trial.

## Part 9 — Start your first PDP-11: RT-11

Use a normal **interactive SSH terminal**. First verify the isolated network policy described in Part 5. On a fresh installation, collect listener information before and after the normal launcher starts. These are **RECOMMENDED review checks**, not a claim that these exact commands were used during the original test:

```bash
umask 077
review_dir="$HOME/pidp11-work/listener-review-$(date +%Y%m%d-%H%M%S)"
mkdir -m 700 "$review_dir" &&   sudo ss -lntup > "$review_dir/before-sockets.txt" &&   rpcinfo -p 127.0.0.1 > "$review_dir/before-rpc.txt"
```

Require success from all three commands before continuing. `ss` lists the Linux host's listening sockets; `rpcinfo` lists registered RPC services. Keep these logs private because they can include network details. A missing `rpcinfo` command requires resolving the prerequisite, not skipping the check.

Start RT-11, then inspect the listeners **before attaching the console**:

```bash
"$HOME/.local/bin/pdp11control" start 0003
sudo ss -lntup > "$review_dir/after-sockets.txt" &&   rpcinfo -p 127.0.0.1 > "$review_dir/after-rpc.txt"
```

Inspect both before/after pairs. Program **99, version 1** should acquire UDP and TCP registrations for the panel server. Match their ports to `ss`, including the actual process and local address. `0.0.0.0`, `*` or `[::]` indicates a wildcard listener; `127.0.0.1` or `[::1]` indicates loopback. Record what you actually see. A loopback client setting and a closed port 111 do not prove that the additional service ports are protected. This guide does not supply a tested firewall recipe. If exposure is unexpected, retain the logs, follow the guest-safe shutdown sequence in Part 11, and resolve network isolation before further use.

Once the listener review is satisfactory:

```bash
TERM=vt100 "$HOME/.local/bin/pdp11"
```

`0003` is a boot-menu identifier, not a Linux process number. Retain leading zeroes. Providing it avoids scanning absent physical switches, but the normal launcher still starts the panel server and accesses GPIO. That worked on our unassembled Pi 3B+ setup; physical hardware behavior is not established.

At the **RT-11 `.` prompt**, type this guest command:

```text
DIR
```

To detach, press **Ctrl-A**, release it, then press **d**. You return to Linux, but the PDP-11 continues running inside Screen. Reconnect with:

```bash
TERM=vt100 "$HOME/.local/bin/pdp11"
```

The helper prints a session count before attaching. It can take the console away from an existing viewer. Avoid multiple unrelated Screen sessions while using the unqualified upstream attach helper; use a named session explicitly when necessary.

### Verification checkpoint

**Run:** at Linux, `screen -ls pidp11`; reconnect, then run RT-11 `DIR` again.

**Expected result:** a `pidp11` Screen session and a responsive RT-11 console. Our recorded banner was `RT-11SJ (S) V05.03`; DIR listed installed programs. A fresh installation will not contain our later validation marker file.

**If it fails:** inspect `"$HOME/.local/bin/pdp11control" stat`, `screen -ls pidp11`, binary libraries, RPC service and menu/config paths. A missing RT-11 display window is intentional here. A real-time-priority warning alone is not proof the panel server failed, but its physical timing is untested.

**Continue when:** you can detach and reconnect without restarting the guest. Shut RT-11 down as described below before selecting another system.

## Part 10 — Explore additional systems

Boot numbers are **verified installed mappings**. Only idled `0000` and RT-11 `0003` received explicit official-launcher checks in our records. Most other guest tests used named Screen sessions around standalone configurations; do not relabel them as launcher tests.

| Code | Directory / system | Verified outcome |
|---|---|---|
| 0000 / 1001 | idled | Demo launcher/REALCONS/attach/detach/stop; no OS |
| 0001 | rsx11mp — original RSX-11M+ V4.6 BL87 | Startup, TIME, reconnect, final SHUTUP/dismount/HALT |
| 0002 | rsts7 — RSTS V7.0-07 | Login, BASIC calculation, reconnect, SHUTUP |
| 0003 | rt11 — RT-11SJ V5.03 | DIR, file write/read/restart persistence, official launcher; extended run |
| 0004 | dos11 — DOS/BATCH V10-01A | Login/reconnect; idle-monitor stop only |
| 0101 | unix1 — reconstructed UNIX V1 | Root shell/listing/reconnect; buffered disk detach; no guest sync |
| 0102 | 211bsd — original BSD | Installed, not separately boot-tested |
| 0104 | unix4 — UNIX V4 | **Incomplete usable login**; retain for investigation |
| 0105 | unix5 — UNIX V5 | Root shell/listing/reconnect; sync/exit |
| 0106 | unix6 — UNIX V6 | Root shell/listing/reconnect; sync/exit |
| 0107 | unix7 — UNIX V7 | Shell/file persistence after restart; sync/exit |
| 0113 | sysiii — UNIX System III | Single-user shell/listing/reconnect; sync/exit |
| 0115 | sysv — UNIX System V | Single-user shell/listing/reconnect; sync/exit |
| 0211 | 211bsd+ — updated BSD patch 482 | Single-user boot, clean fsck, file persistence, halt |
| 1000 | nankervis | Media attachment validated; its individual systems not boot-tested |
| 1002 | blinky | Panel-dependent demo; excluded from standalone generation; physical LED validation deferred |
| 2024 | rsx11bq — updated RSX-11M+ V4.6 BL87 | First setup, login, persistence/restart, SHUTUP/dismount/HALT |

For a recorded **standalone test pattern**, first stop all other emulator sessions, then launch a named Screen instance from one SSH terminal:

```bash
TERM=vt100 screen -DmS phase3-unix6 -L \
  -Logfile "$HOME/pidp11-work/validation/unix6-screen.log" \
  /opt/pidp11/bin/client11 /opt/pidp11/systems/unix6/boot-headless.ini
```

`-D -m` keeps Screen in the foreground while starting it detached. That first SSH terminal stays occupied. From a **second SSH terminal**:

```bash
TERM=vt100 screen -r phase3-unix6
```

The session/config invocation was tested in Phase 3; the log destination above is a **RECONSTRUCTED** adaptation to the guide's existing directory. At V6's `@`, enter `unix`, then log in as `root`. `ls` works at the guest `#` prompt. Detach/reconnect by name. Use the guest shutdown first; exiting SIMH ends this Screen instance.

| Guest | Verified boot/login behavior |
|---|---|
| V5/V6 | At `@`, type `unix`; account `root` |
| V7 | Type `boot`; at `:`, enter `hp(0,0)unix`; single-user `#` shell |
| Updated BSD | Abort countdown with a key; at `:`, `unix -s`; run `fsck -p -t scratch` before writes. `cat /VERSION` reported patch 482 |
| Updated RSX | First-boot dialogue is interactive; match 50 Hz clock, choose local time settings; tested isolated startup declined CEX/TCP. `HEL SYSTEM` uses the maintainer-documented initial credential, deliberately not reproduced here |
| Original RSX | Startup can take minutes and uses historical bundled defaults; optional/network warnings occur while virtual Ethernet remains unattached |
| RSTS V7 | LF at Option and memory-table completion, enter supported historical date/time, default command file; `HELLO 1,2`; obtain initial credential from supplied `rsts_readme.txt`; BASIC `PRINT 2+2` returned 4 |
| DOS/BATCH | Uppercase input, date in 1980–1999 per supplied notes, `LOGIN 1,1` |
| System III/V | After `#`, enter `0` to obtain `=`, then `unix`; single-user shell |
| UNIX V1 | Login `root`; no normal sync/shutdown according to supplied config |

Published documentation omits authentication passwords, even distribution defaults; follow the maintainer's login reference privately. Do not expose legacy guest services to the Internet. A boot test does not establish safety of every bundled service or package.

### Verification checkpoint

**Run:** inspect the selected `boot-headless.ini`, then use the appropriate guest console command (`ls`, `TIME` or BASIC calculation) and detach/reconnect by its Screen name.

**Expected result:** the specific outcomes in the table, not a universal claim that every image boots. For UNIX V4 the guide deliberately does not promise success.

**If it fails:** save the console transcript, simulator message and exact image/config revision. Do not substitute VH for an unknown DH device, replace SIMH or reset working disks speculatively. UNIX V4's guest filesystem cleanliness remains unproven after our incomplete boot.

**Continue when:** you have a responsive guest and understand its shutdown procedure, or have safely stopped and recorded an incomplete test.

## Part 11 — Shut down the right layer

These are different actions:

1. **Guest logout** ends a user's session; the guest may keep running.
2. **Screen detach** disconnects the viewer; the guest and SIMH continue running.
3. **Guest shutdown/sync** makes its filesystems safe for stopping.
4. **SIMH exit/control stop** ends the emulator; it is not a substitute for step 3.
5. **Linux shutdown** stops the Pi before removing power/card.

Use the verified guest guidance:

| Guest | Before stopping SIMH |
|---|---|
| RT-11 | Finish utilities/writes and return to `.`. No UNIX-style shutdown was required in our test |
| UNIX V5/V6/V7, System III/V | At the guest shell run `sync` **three times**, waiting for each prompt; then Ctrl-E and SIMH `exit`, following the supplied historical notes |
| Updated BSD | `halt`; wait for disks synced, halting and SIMH HALT; then `exit` |
| RSX (both tested images) | `RUN $SHUTUP`, 0 minutes, reason, confirm; wait for final disk dismount, SHUTUP completion and HALT; then `exit` |
| RSTS | `RUN $SHUTUP`, 0 minutes; wait for dismount/shutdown and return to bootstrap Option; Ctrl-E and SIMH `exit` |
| DOS/BATCH | Only stopping the idle monitor with no utility running, then Ctrl-E, `detach all`, `exit` was checked. No active-write shutdown claim |
| UNIX V1 | No guest sync/shutdown in supplied notes. Tested idle-shell stop, SIMH `detach all` (flushing RF buffer), then `exit`; limited assurance |

At `sim>`, `continue` resumes an intentionally paused guest. Do not confuse `Ctrl-E` (stop simulated CPU) with a safe guest shutdown.

After the guest is quiescent, if the official launcher session remains:

```bash
"$HOME/.local/bin/pdp11control" stop
screen -ls pidp11
pgrep -a -x 'client11|server11'
```

The control script's `pkill` calls affect other instances with those names. Do not use it while separate standalone guests are running. It may say already stopped if SIMH exit already ended the session.

Finally, at **Linux**:

```bash
sudo shutdown -h now
```

### Verification checkpoint

**Run:** before host shutdown, inspect the guest completion messages, `screen -ls` and `pgrep` results.

**Expected result:** completed guest cleanup, no remaining emulator/Screen instance; after Linux shutdown SSH disconnects. Wait for shutdown/card activity to finish before disconnecting power.

**If it fails:** reconnect to the named guest and finish its shutdown; do not force-kill a running UNIX/RSX merely to make the process list empty. Investigate hangs against a working copy.

**Continue when:** Linux is shut down before card removal or physical assembly. The unvalidated panel key is not a shutdown shortcut.

## Part 12 — Add the physical panel later

Our kit was **unassembled throughout software validation**. No LED, toggle, rotary, key-switch power or mechanical test has passed merely because the RPC server says ACTIVE.

Use [Oscar's current assembly instructions](https://obsolescence.dev/pidp-11-building-instructions.html) and the [July 2024 manual](https://obsolescence.dev/pidp11/PiDP-11_Manual.pdf). Confirm kit revision, polarity/orientation, GPIO alignment, connector insulation and Pi clearance. Oscar specifically recommends a sturdy cardboard or plastic insulating barrier between the board and the Pi's metal USB connectors: sharp solder points can pierce thin tape, so tape alone is not sufficient. September 2020–June 2023 kits have particular extra-nut/panel-spacer instructions; check acrylic thickness and diagrams rather than applying the change to every kit.

The supplied manual's printed **page 53** discusses the Pi 3B+ power-path warning for panel/key-switch supply. Keep normal Pi power initially; any reinforced wiring needs revision-specific review. Do not interpret historical voltage figures as advice to raise supply voltage.

After electronics assembly, follow the official staged lamp, HALT/CONT and rotary tests before final switches/case closure. The provided standalone Python `test.py` utility must **never run at the same time as SIMH and the panel server**, since both would drive GPIO. Its compatibility with Trixie's Python/GPIO environment remains **unverified**; it was not executed here. Leave privileges and pin configuration unchanged until that review. Monitor voltage/heat again under actual LED load and in the enclosure.

### Future hardware-dependent manual startup

This installation intentionally has no emulator autostart. Oscar's assembly checks may assume the panel software is already running. **Only after assembly, electrical inspection, GPIO alignment, insulation and power-readiness checks pass**, start the normal IDLED demonstration manually from the Pi's Linux shell:

```bash
"$HOME/.local/bin/pdp11control" start 0000
TERM=vt100 "$HOME/.local/bin/pdp11"
```

Follow the official staged LED and switch checks, then detach and stop the demonstration before trying a separate GPIO utility. Do not run `test.py` concurrently. These are future hardware-dependent instructions, not evidence that our unassembled panel passed a test.

### Verification checkpoint

**Run:** now, software-only `id -nG` and `ls -l /dev/gpiomem`; later, the physical checks in the official instructions.

**Expected result:** documented GPIO access on this setup; **no claim of hardware success yet**.

**If it fails:** check revision/wiring and obtain qualified project help before adding privileges or moving power wiring.

**Continue when:** actual board tests pass. Emulator autostart remains a separate opt-in design after safe shutdown is proven.

## Part 13 — Back up the whole card

The owner reports a verified golden microSD backup made on macOS by streaming **`dd` into Zstandard**, then checking SHA-256. Retained checksum files identify the source-card and decompressed-image digests; their equality can be reviewed without rereading the card. The complete command transcript and compression flags were not recovered. The procedure below is a **RECOMMENDED equivalent**, not that historical transcript. The earlier private Phase 3 document proposed gzip and does not establish what the Mac later ran. A spare-card restore/boot remains separate.

### Prepare a private destination and identify the card

Finish the guest and Linux shutdown in Part 11, remove power, then move the microSD to the Mac. Never image a live root filesystem as your only backup. On the **Mac**, compare the external-disk list before and after insertion:

```bash
diskutil list external physical
diskutil info /dev/diskN
```

Replace `N` only after identifying the card by capacity, physical location and device information. Do not initialize or erase an unrecognized Linux card. Note its **exact whole-disk byte count**, not a rounded capacity; the historical card was 32,010,928,128 bytes, which is not a default for another card.

Use a private folder on a separate disk with sufficient free space. The raw method needs space for both the uncompressed card and compressed image. The streaming method avoids that intermediate raw file but does not guarantee a particular compression ratio. FAT32 cannot hold a file larger than 4 GiB. On FAT/exFAT, or a volume that ignores ownership, `umask` and Unix permission bits may not protect your files; use an access-controlled or encrypted destination instead. A whole-card image includes passwords, private host keys and configuration secrets. Keep it private, including intermediate files and restored copies.

Install/check the Mac's Zstandard command through its documented packaging route if needed: `zstd --version` must work. The syntax below follows [Zstandard's command documentation](https://github.com/meta/zstd/blob/dev/programs/zstd.1.md). `-c` writes compressed/decompressed bytes to standard output; `-t` checks compressed integrity. Compression level `-3` is this guide's recommendation, not a recovered historical flag.

### Choose a raw intermediate or direct streaming

Read the entire block, replace the two placeholders, and choose `raw` or `stream`. Run this block in **Bash**. The block creates its own new private destination; an existing path makes it stop. It only reads the card. `set -euo pipefail` stops on a failed command or failed pipeline stage, including an upstream `dd` read error. Do not remove those options or add `conv=noerror`. `set -C` prevents shell output redirections from overwriting an existing regular file.

```bash
bash <<'SH'
set -euo pipefail
set -C
umask 077
card_disk=/dev/diskN                 # Replace with the verified whole card.
expected_bytes=REPLACE_WITH_BYTES    # Exact whole-disk bytes from diskutil info.
backup_mode=stream                   # Choose stream or raw.
[[ "$card_disk" =~ ^/dev/disk[0-9]+$ ]] || { echo 'STOP: select the card'; exit 1; }
[[ "$expected_bytes" =~ ^[1-9][0-9]*$ ]] || { echo 'STOP: enter exact bytes'; exit 1; }
[[ "$backup_mode" == stream || "$backup_mode" == raw ]] || exit 1
command -v zstd >/dev/null
backup_dir="$HOME/pidp11-private-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -m 700 "$backup_dir"
cd "$backup_dir"
raw_card="/dev/r${card_disk#/dev/}"
diskutil info "$card_disk" > source-device.txt
# The operator has already checked this exact disk identity above.
diskutil unmountDisk "$card_disk"
sudo -v
if [[ "$backup_mode" == raw ]]; then
    sudo dd if="$raw_card" bs=4m > pidp11-full.img.partial
    test "$(stat -f '%z' pidp11-full.img.partial)" = "$expected_bytes"
    shasum -a 256 pidp11-full.img.partial > raw-image.sha256
    zstd -3 -c pidp11-full.img.partial > pidp11-full.img.zst.partial
else
    sudo dd if="$raw_card" bs=4m | zstd -3 -c > pidp11-full.img.zst.partial
fi
zstd -t pidp11-full.img.zst.partial
image_bytes=$(zstd -dc pidp11-full.img.zst.partial | wc -c | tr -d '[:space:]')
test "$image_bytes" = "$expected_bytes"
zstd -dc pidp11-full.img.zst.partial | shasum -a 256 > image-content.sha256
# Keep the same card unmounted and unchanged throughout both read passes.
sudo shasum -a 256 "$raw_card" > source-card.sha256
source_hash=$(awk '{print $1}' source-card.sha256)
image_hash=$(awk '{print $1}' image-content.sha256)
test "$source_hash" = "$image_hash"
if [[ "$backup_mode" == raw ]]; then
    test "$(awk '{print $1}' raw-image.sha256)" = "$source_hash"
    mv pidp11-full.img.partial pidp11-full.img
    shasum -a 256 pidp11-full.img > pidp11-full.img.sha256
fi
mv pidp11-full.img.zst.partial pidp11-full.img.zst
shasum -a 256 pidp11-full.img.zst > pidp11-full.img.zst.sha256
printf 'Verified whole-card bytes: %s\nSource/decompressed SHA-256: %s\n'     "$image_bytes" "$image_hash" > verification.txt
diskutil eject "$card_disk"
printf 'Verified backup saved privately in %s\n' "$backup_dir"
SH
```

Press Control-T during `dd` for macOS progress. Do not interpret an empty terminal as a stalled read. Continue only when the final success line appears. If a command fails, retain the original card and the new folder for diagnosis; `.partial` denotes unfinished work and must not be treated as a verified backup. Check free space, device identity, reader errors and the failing command. Start any retry in a new private folder, not over the failed files.

There are **three distinct checksums**: `source-card.sha256` hashes the whole physical card; `image-content.sha256` hashes decompressed image bytes; `pidp11-full.img.zst.sha256` hashes the compressed file. The first two must agree. The compressed-file digest normally differs and detects later storage changes. The raw method adds an intermediate-image digest that must also equal the source digest. This is byte equality at the time of reading, not a successful restore test. Keep another verified private copy on separate storage.

### A later spare-card recovery test — separate, destructive work

The following preparation only reads the compressed backup and writes a **new regular file** in that same private folder. It does not write a card:

```bash
bash <<'SH'
set -euo pipefail
set -C
umask 077
# First cd into the verified private backup directory yourself.
shasum -a 256 -c pidp11-full.img.zst.sha256
test ! -e pidp11-restored.img.partial && test ! -L pidp11-restored.img.partial
test ! -e pidp11-restored.img && test ! -L pidp11-restored.img
zstd -dc pidp11-full.img.zst > pidp11-restored.img.partial
restored_hash=$(shasum -a 256 pidp11-restored.img.partial | awk '{print $1}')
test "$restored_hash" = "$(awk '{print $1}' image-content.sha256)"
test ! -e pidp11-restored.img && test ! -L pidp11-restored.img
mv pidp11-restored.img.partial pidp11-restored.img
printf 'Restored regular file verified; no card has been written.\n'
SH
```

Only after that check should you plan the **destructive write to a verified spare card**, using Raspberry Pi Imager's custom-image option. Recheck the destination device; writing erases it. Do not select the original card, and do not apply new OS customization to the clone. The spare must be large enough in exact bytes; two nominal 32 GB cards may differ. A `.zst` file itself is not a bootable card. Keep original and cloned network identities off the network at the same time. Verify the spare's boot, SSH and manual guest operation before describing the backup as recovery-tested.

### Verification checkpoint

**Run:** the selected backup method and every size/digest check, preserving the output and private files.

**Expected result:** matching source/raw (if used)/decompressed bytes, a passing compressed integrity check and saved compressed-file checksum. A restore boot is **not yet claimed** by this project.

**If it fails:** retain the original card. Investigate incomplete output, permissions, reader or storage errors; never erase the original in reliance on an unverified image.

**Continue when:** an external image has passed all checks. Call it recovery-tested only after a separate spare-card restore boots successfully.

## Part 14 — Troubleshooting without guesswork

| Symptom | Read-only checks | Meaning / next action |
|---|---|---|
| Wrong user/path | `whoami`; `stat -c '%U:%G %n' /opt/pidp11` | This guide assumes `pi`, standard target. Review differences; do not run everything as root |
| Binary will not start | `uname -m`; `file -L /opt/pidp11/bin/client11`; `ldd /opt/pidp11/bin/client11` | Match aarch64; resolve missing package/library before compiling/replacing anything |
| Commands missing | `ls -l "$HOME/.local/bin/pdp11" "$HOME/.local/bin/pdp11control"` | User-local links were chosen; no `/usr/local/bin` or PATH edit was required |
| Blank `status` | `"$HOME/.local/bin/pdp11control" stat`; `screen -ls pidp11` | Verified: `status` only prints matching sessions and is blank when stopped. Both status variants exit 0 here; do not use that exit code as a health test |
| Console will not attach | `screen -ls`; inspect named sessions | Stop state, dead sockets or multiple sessions need diagnosis. Upstream attach helper is not precisely session-qualified. Never wipe a live guest's session to solve ambiguity |
| RPC/panel connection error | `systemctl is-active rpcbind`; `journalctl -u rpcbind --no-pager -n 30` | Diagnose service/address/server readiness. Standalone config can isolate SIMH from panel RPC, but running it is a separate test |
| RT-priority warning | `getcap` on actual runtime server; `id -nG`; gpiomem permissions | Warning was observed without added capability; future physical timing unverified. Do not blindly add setuid/root/capabilities |
| GUI/display error | Inspect `rt11/boot.ini` for active VT-enable | Text-only mode deliberately disables graphics. Installing an entire desktop is not the default remedy |
| Wrong OS or boot failure | `cat /opt/pidp11/systems/selections`; inspect target config | Exact archive names matter. V4 remains incomplete; avoid untested device substitutions |
| Disk seems unwritable/corrupt | Check working vs pristine path/mode; review saved console log | Never boot pristine files. Shut guest down before external tools. Preserve suspect working image before a reviewed repair/reset |
| User expects hardware lights | Physical panel absent? | Software/RPC success does not verify physical LEDs, switches or wiring |

For power/heat, use:

```bash
vcgencmd get_throttled
vcgencmd measure_temp
journalctl -b -k -o short-monotonic --no-pager | grep -Ei 'under.?voltage|voltage normal|throttl'
```

From the [official bit definitions](https://www.raspberrypi.com/documentation/computers/os.html#vcgencmd), flags can combine:

| Condition | Active now | Has occurred during this boot |
|---|---:|---:|
| Undervoltage | `0x1` | `0x10000` |
| Arm frequency capped | `0x2` | `0x20000` |
| Throttling | `0x4` | `0x40000` |
| Soft temperature limit | `0x8` | `0x80000` |

Our latest `0x50000` means historical undervoltage plus throttling with no active low bits in that reading. The current-boot journal recorded undervoltage at about 15 seconds and normalization at about 17 seconds after boot. It does not identify the failing physical component or prove a thermal cause. Earlier `0x80008` was soft limiting plus its history; a later `0x0` check only described that boot/time. Do not confuse a cooler reading or cleared flags after reboot with a permanent repair. Review the supply path and ventilation without altering thermal limits; physical measurements/load isolation would be separate work.

### Verification checkpoint

**Run:** diagnostics for the actual symptom only, keeping outputs and versions.

**Expected result:** a specific explanation supported by evidence, or a clearly bounded unresolved issue. Blank status output alone is not a failed installation.

**If it fails:** retain logs and ask the project community with sanitized version/config details. Do not post passwords, keys, full network captures or your golden card.

**Continue when:** the fault is understood or explicitly recorded; never turn an untested workaround into a published success claim.

## Part 15 — References, credits and what comes next

Thanks to **Oscar Vermeulen** for PiDP-11; **Bob Supnik and SIMH/Open SIMH contributors**; **Jörg Hoppe** for BlinkenBone/REALCONS; and the project contributors maintaining panel software, restored systems and guest distributions. The upstream manual credits contributors including Mike Hill, Ian Schofield, Mark Matlock, Angelo Papenhoff, Stephen Casner and others. Chase Covello maintains the updated BSD resource used here, and Johnny Billquist provides the updated RSX distribution. Consult upstream for the complete credit/license context.

- [PiDP-11 GitHub](https://github.com/obsolescence/pidp11) and [tested revision](https://github.com/obsolescence/pidp11/tree/26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75)
- [Official project](https://obsolescence.dev/pdp11.html), [building instructions](https://obsolescence.dev/pidp-11-building-instructions.html), [manual](https://obsolescence.dev/pidp11/PiDP-11_Manual.pdf), [community group](https://groups.google.com/g/pidp-11)
- [Open SIMH](https://github.com/open-simh/simh), [BlinkenBone/retrocmp](https://www.retrocmp.com/)
- [Updated BSD](https://github.com/chasecovello/211bsd-pidp11), [RSX maintainer's guide](http://mim.softjar.se/pidp.htm)
- [Raspberry Pi setup](https://www.raspberrypi.com/documentation/computers/getting-started.html), [vcgencmd](https://www.raspberrypi.com/documentation/computers/os.html#vcgencmd)
- [Official Raspberry Pi magazine's offline card-backup discussion](https://magazine.raspberrypi.com/articles/back-up-raspberry-pi), [Zstandard command documentation](https://github.com/facebook/zstd/blob/dev/programs/zstd.1.md)
- [Technical provenance](PIDP11-TRIXIE-INSTALLATION-RECORD.md), [installation notes and status](README.md), [publication/clean-install checklist](PUBLICATION-CHECKLIST.md)

A separate Mac-based Web Desktop concept is being developed; it has not been deployed to this Pi and is not required by this guide. Its scope and evidence limits are described in the notes for Oscar.

### Verification checkpoint

**Run:** review the publication checklist and record a new installation's OS image, source commit, downloads and validation outcomes.

**Expected result:** an auditable result rather than a claim that matching a few commands guarantees every Pi/revision works.

**If it fails:** keep this as a review draft and identify the missing evidence.

**Continue when:** an independent blank-card trial has passed before advertising the guide as independently reproduced. Physical assembly, power diagnosis and restore testing remain separate checkpoints.

## Appendix A — Reproduce the validation, one result at a time

This appendix distinguishes the **original 16 November records**, inspected during this review, from **RECOMMENDED procedures** for a future installation. Record paths below are relative to the private `~/pidp11-work/` evidence directory. Sanitized findings are indexed in the [installation record's evidence appendix](PIDP11-TRIXIE-INSTALLATION-RECORD.md). The logs are not bundled here. Neither this appendix nor the Mac fixture tests establish an independently successful blank-card installation.

Keep a dated log of the source commit, guest image hash, configuration and route used for each test. The **official route** uses `"$HOME/.local/bin/pdp11control" start NUMBER` and runs the panel server; the **standalone route** uses an inspected `boot-headless.ini` as described in Part 10. Do not run both at once. Passing one route does not establish the other.

### A.1 Create a marker and confirm that it survives a guest restart

Use a small, uniquely named text file on a **working** guest disk. The historical tests used `PIDP11-PERSIST-20261116`; for a new test choose a different dated marker and first check that the chosen filename is unused. Do not overwrite an existing user's file. Prompts shown below identify the operating system; do not type the prompt character.

| Guest and route originally tested | Recorded creation/readback | Graceful stopping and restart check |
|---|---|---|
| RT-11, standalone | At `.`, `COPY TT:PIDP.TXT` prompted `To ?`; the operator answered `PIDP.TXT`, typed the marker and ended input with Ctrl-Z. `TYPE PIDP.TXT` returned the marker | Return to `.`, wait for writes to finish, Ctrl-E, then SIMH `exit`. Start the same working disk/configuration again; `TYPE PIDP.TXT` must return the identical marker |
| UNIX V7, standalone single-user shell | At `#`, `echo PIDP11-PERSIST-20261116 > /pidpcheck`, then `cat /pidpcheck` | Run `sync` three times, waiting for each prompt; Ctrl-E, SIMH `exit`. Restart the same working disk; `cat /pidpcheck` must return the marker |
| Updated 2.11BSD, standalone single-user shell | After the startup/filesystem checks in Part 10, `echo PIDP11-PERSIST-20261116 > /pidpcheck`. The original readback is in the restart log; adding `cat /pidpcheck` before shutdown is recommended for a new trial | `halt`, wait for disk syncing and simulator HALT, then `exit`. Restart with the same configuration, complete its filesystem check, and `cat /pidpcheck` |
| Updated RSX, standalone | At the MCR prompt, `PIP PIDP.TXT=TI:`, type the marker, then Ctrl-Z; `PIP TI:=PIDP.TXT` reads it | `RUN $SHUTUP`, enter `0` minutes, a reason such as `Validation`, and confirm `Y`. Wait for dismounts, completion and HALT; SIMH `exit`. Restart and read with `PIP TI:=PIDP.TXT` |

The RT-11 entry preserves the original prompted interaction; it is not silently rewritten into a different command transcript. On a new test, a clarified command is `COPY TT: PIDP.TXT`. If the single-line editor prevents terminal copying, `SET SL OFF` is a **recommended adjustment**, supported by the [DEC RT-11 release notes](https://www.bitsavers.org/pdf/dec/pdp11/rt11/v5.1_Jul84/AA-5286F-TC-T1_RT-11_System_Release_Notes_Jul84.pdf), not an adjustment recorded in our original test.

**Evidence:** `validation/rt11-console.log` and `rt11-reboot.log`; `unix7-console.log` and `unix7-reboot.log`; `bsd-console.log` and `bsd-reboot.log`; `rsx-console.log` and `rsx-reboot.log`. These demonstrate guest restarts, not a Pi reboot for every guest. The V7 capture has interleaved typing/echo around the first `sync` inputs; the restart transcript cleanly records the marker and the three subsequent sync commands. RT-11 was also read back through the official launcher in `phase3/stability-console-checkpoint.log` and `stability-console-final.log`.

**Pass:** creation, immediate readback, orderly shutdown and readback after restart all succeed on the same working disk. **Fail/incomplete:** any missing/mismatched marker, wrong disk/configuration, interrupted shutdown or unexpected filesystem repair. Retain the transcript and stop; do not recreate a missing marker to disguise failed persistence.

### A.2 Check a Linux reboot separately

After the guest-safe shutdown and official control stop in Part 11, record the stopped state, then use `sudo reboot`. Reconnect through your established SSH route after the host returns. Check `uptime`, `screen -ls`, `"$HOME/.local/bin/pdp11control" stat`, and `pgrep -a -x client11` / `pgrep -a -x server11`. A no-match `pgrep` exit status is expected while stopped. With autostart disabled, no emulator or panel-server process should have restarted automatically. Start RT-11 manually using Part 9, read the marker again, and shut down cleanly.

This is a **RECOMMENDED repeatable sequence**. The historical host-reboot evidence is `phase3/pre-reboot-stopped-state.json`, `phase3/post-reboot-check.py`, `post-reboot/configuration-comparison.json` and `post-reboot/services.txt`; it establishes the recorded host state, not an independent fresh-card trial or every guest's post-host-reboot persistence. Compare versions, retained configuration and the state you actually observe. Do not call a process restart or a console detach a Linux reboot.

### A.3 Run a representative 30-minute stability observation

The original workload was RT-11 at its prompt through the official launcher, with the stock unthrottled/noidle configuration. `phase3/stability-plan.json`, `monitor.py`, `stability-samples.jsonl` and `stability-summary.json` record **181 samples at 10-second intervals over 1,800 seconds**. Both tracked processes retained their identities and RSS measurements; RT-11 responded to marker reads during and after the run. However, **176 samples had the soft temperature-limit flag active**. This was functional continuity with a thermal limitation, not a clean power/thermal pass. The later `0x50000` historical undervoltage/throttling reading remains a separate unresolved warning.

For a future trial, start RT-11 normally, confirm the marker, detach from Screen, and run the following **RECOMMENDED monitor**, derived from the original approach with exclusive output creation and process-start checks. It reads Linux `/proc` process counters; CPU percentages are interval measurements where 100% means one logical CPU. RSS is resident memory in KiB. It makes no thermal, scheduling or guest configuration changes. It is intended for the Pi/Linux installation, not macOS.

```bash
python3 - <<'PY'
from pathlib import Path
import datetime, json, os, subprocess, time
os.umask(0o077)
root = Path.home() / 'pidp11-work' / ('stability-review-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
root.mkdir(mode=0o700)  # Existing output directory is a stop, not an overwrite.
tracked, previous, starts = {}, {}, {}
for name in ('client11', 'server11'):
    pids = subprocess.run(['pgrep', '-x', name], capture_output=True, text=True, check=True).stdout.split()
    if len(pids) != 1:
        raise SystemExit('STOP: expected exactly one ' + name)
    tracked[name] = int(pids[0])
ticks = os.sysconf('SC_CLK_TCK')
start = time.monotonic()
with (root / 'samples.jsonl').open('x') as log:
    for index in range(181):
        now = time.monotonic()
        row = {'sample': index, 'elapsed_seconds': now - start, 'processes': {}}
        for name, pid in tracked.items():
            process = Path('/proc') / str(pid)
            fields = (process / 'stat').read_text().rsplit(') ', 1)[1].split()
            started = fields[19]
            if name in starts and starts[name] != started:
                raise SystemExit('STOP: process identity changed: ' + name)
            starts[name] = started
            status = dict(line.split(':', 1) for line in (process / 'status').read_text().splitlines() if ':' in line)
            cpu_ticks = int(fields[11]) + int(fields[12])
            item = {'pid': pid, 'state': fields[0], 'rss_kib': int(status['VmRSS'].split()[0])}
            if name in previous:
                old_time, old_ticks = previous[name]
                item['cpu_percent_one_core'] = 100 * (cpu_ticks - old_ticks) / ticks / (now - old_time)
            previous[name] = now, cpu_ticks
            row['processes'][name] = item
        for key, command in [('temperature', 'measure_temp'), ('flags', 'get_throttled')]:
            row[key] = subprocess.run(['vcgencmd', command], capture_output=True, text=True, check=True, timeout=5).stdout.strip()
        row['meminfo'] = {k: v.strip() for k, v in (line.split(':', 1) for line in Path('/proc/meminfo').read_text().splitlines())
                          if k in ('MemAvailable', 'SwapTotal', 'SwapFree')}
        log.write(json.dumps(row) + '\n')
        log.flush()
        if index < 180:
            time.sleep(max(0, start + (index + 1) * 10 - time.monotonic()))
print('181 samples saved in', root, '; inspect results and check the guest before declaring a pass')
PY
```

Keep a second SSH terminal available. At roughly 15 minutes and at the end, reconnect to Screen, run `TYPE PIDP.TXT` (or your chosen marker name), record the result, and detach. These timing checkpoints are a recommendation; the original console records prove readbacks but do not independently timestamp each keystroke. After sampling, read the marker once more and shut down through Part 11.

**Functional pass:** 181 complete records spanning approximately 1,800 seconds, no process disappearance/replacement/read error, both guest readbacks correct, no unexpected disk or kernel errors, and orderly final shutdown. Inspect RSS, available memory and swap for sustained unexplained growth; the historical flat RSS is a reference, not a required byte-for-byte target. **Health review:** decode every flag with Part 14. Any active undervoltage, capping, throttling or soft limit, or a newly set historical flag, prevents a clean power/thermal pass. Pre-existing historical flags must remain in the report; a continuous guest does not resolve them. A monitor exception, missing samples, delayed sampling that invalidates the workload, or an unresponsive guest means incomplete/failed validation. Preserve partial logs instead of restarting into the same output directory.

### A.4 Verify pristine originals and recovery resources

The original `resources/pristine-manifest.json` maps each relative pristine filename to its size and SHA-256. The original `resources/download-sha256.json` maps each retained resource filename to a digest. `phase3/preservation-verification.json` records 76 pristine files and 18 then-verified resource entries with no failures. Those counts describe that recorded check; they are not fixed requirements for installations with different optional collections or later retained files.

On a new installation, Part 8.5 creates the pristine manifest. After downloads, configuration records and recovery resources are finalized and their initial checks have passed, the following **RECOMMENDED** step creates a separately named resource manifest. It does not invent a historical `download-sha256.json`, and hashing a download is not proof of its authenticity; retain the source URLs, revisions and original verification results too.

```bash
python3 - <<'PY'
from pathlib import Path
import hashlib, json, os
os.umask(0o077)
r = Path.home() / 'pidp11-work/resources'
target = r / 'review-resource-sha256.json'
if target.exists() or target.is_symlink():
    raise SystemExit('STOP: resource manifest already exists')
records = {}
for path in sorted(r.iterdir()):
    if path.is_symlink() or not path.is_file():
        raise SystemExit('STOP: review unexpected resource entry: ' + str(path))
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    records[path.name] = h.hexdigest()
if not records:
    raise SystemExit('STOP: no recovery resources found')
with target.open('x') as stream:
    json.dump(records, stream, indent=2)
    stream.write('\n')
print('Recorded', len(records), 'resource hashes; keep an external copy of files and manifest')
PY
```

The following **RECOMMENDED verifier** uses the historical schemas. Set `resource_name` to `download-sha256.json` when checking that retained historical manifest, or leave the new manifest name for a fresh installation. It reads files without altering the originals. All pristine files must be accounted for; the resource check verifies the named entries and permits later additional logs/manifests. It therefore does not claim that every later resource is covered by an older manifest.

```bash
python3 - <<'PY'
from pathlib import Path
import hashlib, json, stat
r = Path.home() / 'pidp11-work'
resource_name = 'review-resource-sha256.json'
pristine = r / 'pristine'
resources = r / 'resources'
for directory in (pristine, resources):
    if directory.is_symlink() or not directory.is_dir():
        raise SystemExit('STOP: missing or linked verification root: ' + str(directory))
for manifest in (resources / 'pristine-manifest.json', resources / resource_name):
    if manifest.is_symlink() or not manifest.is_file():
        raise SystemExit('STOP: missing or linked manifest: ' + str(manifest))
expected = json.loads((resources / 'pristine-manifest.json').read_text())
resource_records = json.loads((resources / resource_name).read_text())

def checked_path(root, name):
    relative = Path(name)
    if relative.is_absolute() or not relative.parts or '..' in relative.parts:
        raise SystemExit('STOP: unsafe manifest path: ' + name)
    current = root
    for component in relative.parts:
        current = current / component
        if current.is_symlink():
            raise SystemExit('STOP: linked manifest path: ' + name)
    if not current.is_file():
        raise SystemExit('STOP: missing/nonregular file: ' + name)
    return current

def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

actual = set()
for path in pristine.rglob('*'):
    mode = path.lstat().st_mode
    if stat.S_ISLNK(mode) or not (stat.S_ISDIR(mode) or stat.S_ISREG(mode)):
        raise SystemExit('STOP: unexpected pristine entry: ' + str(path))
    if stat.S_ISREG(mode):
        actual.add(str(path.relative_to(pristine)))
if not expected or actual != set(expected):
    raise SystemExit('STOP: pristine inventory differs from manifest')
for name, record in expected.items():
    path = checked_path(pristine, name)
    if path.stat().st_size != record['size'] or sha256(path) != record['sha256']:
        raise SystemExit('STOP: pristine content differs: ' + name)
if not resource_records:
    raise SystemExit('STOP: empty resource manifest')
for name, digest in resource_records.items():
    if sha256(checked_path(resources, name)) != digest:
        raise SystemExit('STOP: recovery resource differs: ' + name)
print('PASS:', len(expected), 'pristine files and', len(resource_records), 'named recovery resources')
PY
```

A hash mismatch, missing file, unexpected pristine entry or linked path is a **stop**, not a reason to regenerate the manifest from changed files. Preserve the mismatch and compare with the trusted external copy. Checksums establish consistency with that saved reference; they do not establish guest filesystem health or recoverability.

For retained archive formats, repeat the original download hash checks in Part 8, then use `xz -t` for the optional BSD `.xz` and `gzip -t` for each RSX `.gz`. Nankervis has two gzip layers; repeat its documented extraction/inventory check only in a new disposable directory. If a Git recovery bundle has been retained, run `git -C /opt/pidp11 bundle verify "$HOME/pidp11-work/resources/pidp11-upstream.bundle"` and `git -C /opt/pidp11 fsck --full`; preserve their output and exit status. These validate archive/repository structure, not a clean reinstall or restored-card boot. Historical outputs are `phase3/git-bundle-verify.txt`, `phase3/git-fsck.txt` and `phase3/retained-archive-checksums.sha256`. Complete the separate recovery test in Part 13 before claiming recovery has been demonstrated.
