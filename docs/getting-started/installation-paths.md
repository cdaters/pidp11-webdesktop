# Choose your installation path

Web Desktop is an optional companion to Oscar Vermeulen's PiDP-11. Its installer never installs Oscar's emulator, creates a guest line, selects an OS or starts the original launcher. The current package is a **laboratory-tested ARM64 candidate**, not a production-supported deployment. You can [explore the demonstration](README.md) without installing anything on a Pi.

## Path A: you already have a working PiDP-11

Keep your original physical-only setup as the fallback. These are staged instructions for an authorized Linux administrator; stop at a failed check.

1. Confirm the original machine works independently: physical selection, lamps, HALT/CONT and conventional console. Preserve a verified backup and record the installed version. The desktop does not repair or validate electrical hardware.
2. Prepare or obtain a reviewed candidate archive and its `SHA256SUMS` from the same trusted source revision. There is no hosted binary download promised here; developers can use the [alpha packaging procedure](../releases/alpha-readiness.md). In a **Linux shell**, verify the archive before extracting it into a new directory:

   ```sh
   sha256sum -c SHA256SUMS
   tar -xzf pidp11-webdesktop-VERSION-linux-arm64.tar.gz
   cd pidp11-webdesktop-VERSION-linux-arm64
   sha256sum -c PACKAGE_SHA256SUMS
   sh preflight.sh
   ```

   Replace `VERSION` with the actual candidate name. Checksums detect changed bytes; they are not signatures. Read `COMPATIBILITY.json` and the release notes. Preflight requires Linux ARM64, administration tools, an available memory controller and expected original executables/map. It does not execute Oscar's programs, inspect guest disks, discover network services or change files. A nonstandard original installation needs review, not renaming files to satisfy this check.
3. Follow the existing [optional-service procedure](optional-service.md) to install a new companion-only release, initially stopped and disabled. Its dedicated account must have no login shell or GPIO/sudo groups. The installer is optional automation for those documented operations; manual administrators must reproduce the same paths, ownership, permissions, unit and integrity checks rather than dropping the executable into an unrestricted account.
4. Reserve a guest-only serial line using a separately reviewed guest configuration. A SIMH console/monitor port is **not** a guest terminal. Verify the guest's actual driver/login setup, endpoint ownership and OS identity through the conventional console. Existing boot maps and profiles remain untouched by the companion installer.
5. Configure distinct writer/observer credentials, the exact HTTPS origin and a suitable certificate. Before startup, run `sudo sh preflight.sh /etc/pidp11-webdesktop/config.json`, then the documented configuration check as the service account. Review DNS/name resolution, certificate trust, port availability, firewall policy and intended client network separately: the helper deliberately does not probe them. Prefer loopback plus an owner-managed tunnel for initial review. Do not expose the service directly to the public Internet or put tokens in URLs.
6. Start only the companion and verify it is detached. Approval of an identified guest line is a separate local action. Browser connection begins read-only; keyboard ownership is explicit. Before changing guests, stop the actual bridge process. Reused ports never justify automatic attachment.

Update, rollback, disabled startup, retained private configuration and complete removal are documented under [disable, upgrade, roll back or remove](optional-service.md#disable-upgrade-roll-back-or-remove). Use a new release directory for each update. Stop the companion before selecting another version, and verify detached state after restart. Uninstalling the companion must leave Oscar's installation and media alone.

## Path B: start with Raspberry Pi OS Lite

Use the published [Trixie headless installation guide](../installation/PIDP11-TRIXIE-HEADLESS-GUIDE.md) and its separate [installation record](../installation/PIDP11-TRIXIE-INSTALLATION-RECORD.md). The guide distinguishes recorded work from reconstructed instructions; M5.9 did **not** replay it from a blank card.

1. Prepare Raspberry Pi OS Lite using that guide. Establish ordinary SSH access and reliable power/storage before adding the original software.
2. Install Oscar's original software through its documented upstream procedure. Review upstream scripts before explicitly running them. Web Desktop does not run them silently, replace the launcher or alter boot selections.
3. Complete independent original-console and physical-panel verification. Create and verify a backup. Stop if hardware or OS selection is uncertain; the browser is not a substitute for this checkpoint.
4. Only then consider Path A. Its companion package has no Node runtime, database or container requirement on the Pi. Linux containers and the ARM64 VM described in the development reports are disposable test tools, not deployment dependencies.

## Memory-controller prerequisite after hardware repair

The assessed machine had `cgroup_disable=memory` in its kernel command line. `MemoryMax=96M` cannot enforce a missing controller. The packaged service therefore refuses startup unless its own kernel control-group files show the required memory and zero-swap limits. Do not remove this check, rely solely on `GOMEMLIMIT`, or substitute an unbounded service.

A future **separately owner-approved** maintenance procedure should first verify a safe stopped state, working recovery access and a current backup. Read the actual boot configuration path and kernel command line; preserve an exact copy and metadata. Review a minimal change removing only the confirmed disabling argument, retaining the required single-line format and every unrelated option. Do not add guessed legacy flags. An authorized reboot is required before checking the live kernel controller, original physical-only behavior, effective service limits and detached startup. If validation fails, restore the saved boot file through the agreed recovery path and reboot only with approval. No automatic companion startup is part of that procedure.

M5.9 tested missing-controller refusal and restoration in a disposable systemd slice, **not** this Pi boot-file change or a fresh-card installation. See [M5.7.1](../lab/M5.7.1.md) and [M5.8 readiness](../lab/M5.8-readiness.md) for the existing gates. Hardware repair, memory readiness, guest identity and representative Pi resource measurements remain separate requirements.

## Current development candidate

The [M5.10 alpha presentation](../releases/alpha-readiness.md) packages the Phase D runtime with current documentation. Optional live-device observation, offline references, exact facts/calculations and actual local-model conversations have laboratory evidence. The model remains experimental and unnecessary for terminal use. See the [capability matrix](../capabilities.md) for the distinctions.

The [Phase D report](../lab/M5.9.3-D.md) records protected ARM64 lifecycle tests; M5.10 performs packaging and presentation checks, not a fresh physical deployment. Neither increment changes the hardware, guest-identity and enforced-memory gates above.
