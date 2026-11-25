# Preparing the optional desktop service

This is a **laboratory-tested installation candidate**, not an accepted physical Pi deployment. The current public release is [source-only Alpha 2](source-alpha-2.md); [Alpha 3 qualification](../releases/source-alpha-3-candidate.md) is a separate source-review milestone. The following local binary-packaging instructions do not describe a hosted binary release. The owner has not authorized installing it on the physical machine. Original PiDP-11 operation remains the fallback. A later supervised deployment must first resolve the physical-selection discrepancy and review network access, certificate trust and guest-line ownership.

The locally built optional-service package contains a static Linux ARM64 executable with the desktop inside it. The target needs systemd and normal Linux administration tools, but no Node runtime, container, database or graphical desktop. It installs only under `/opt/pidp11-webdesktop`, `/etc/pidp11-webdesktop` and its own systemd/runtime locations. It does not change Oscar's installation or start an emulator.

## Build and inspect on the development Mac

From the repository, with the documented Go/Node development tools:

```sh
sh packaging/build.sh /absolute/path/to/a-new-package-directory
```

The output directory must not exist. Inspect the executable and scripts. `PACKAGE_SHA256SUMS` covers the executable, unit, notices, configuration/installation helpers and the retained-release checksum file. Checksums detect changed bytes; they are not a publisher signature. Obtain the package through a source you trust.

## Install and configure in an authorized Linux environment

The following commands are **Linux administrator-shell examples**, tested only in disposable ARM64 Linux. Stop at an error. Substitute the reviewed package path and a new version name; do not overwrite an installed release.

1. Verify the complete package, then install it:

   ```sh
   cd /reviewed/package
   sha256sum -c PACKAGE_SHA256SUMS
   sudo sh install.sh /reviewed/package m5.10-preview.1
   ```

   Expected: installed, stopped and disabled. No guest has been contacted.

2. Choose the browser's exact HTTPS name and port, an explicit bind address, and an already reserved **guest-only raw terminal endpoint on loopback**. No discovery or guest-line configuration is performed. This example is for a local laboratory, not a LAN address recommendation:

   ```sh
   sudo sh configure.sh 127.0.0.1:8445 https://127.0.0.1:8445 127.0.0.1:40100
   ```

   The helper creates new private configuration, separate writer/observer tokens, and a one-year self-signed certificate. It sets permissions for the service's dedicated account, then checks readability as that account. Re-running it refuses to overwrite anything. A failed partial setup is retained for inspection; do not delete it blindly.

3. Review the private `config.json`. Endpoint labels express your intent; they do not prove which OS is currently listening. Verify the printed certificate fingerprint independently before trusting that certificate in your browser, or use an appropriately issued certificate. Never disable browser TLS verification globally. Keep tokens out of URLs, command arguments, screenshots and public logs. For later checks without starting anything:

   ```sh
   sudo runuser -u pidp11-webdesktop -- \
     /opt/pidp11-webdesktop/current/webdesktop-service check
   ```

   Expected: valid configuration, expiry date and line count. This checks files only; it does not prove DNS resolution, port availability, firewall reachability or guest identity.

4. Review memory containment before starting. The candidate unit uses `MemoryMax=96M`, `MemorySwapMax=0`, `GOMEMLIMIT=72MiB` and `serve -require-memory-limit`. Startup checks its own kernel cgroup files and refuses to open listeners if the memory limit is absent, unlimited, over 96 MiB, or permits swap. A configured systemd property alone is insufficient. The Go setting is a soft runtime target, not a substitute for kernel enforcement. Unsupported layouts are refused rather than guessed.

   The assessed Pi currently has `cgroup_disable=memory`; protected startup is therefore blocked pending separately authorized resolution and validation. Do not remove the startup check or weaken the unit to bypass that finding. See [M5.7.1 evidence](../lab/M5.7.1.md#memory-limit-finding-and-implemented-strategy). The file-only `check` above does not validate this runtime boundary.

   Once these prerequisites are satisfied in an authorized environment, start only the companion:

   ```sh
   sudo systemctl start pidp11-webdesktop.service
   sudo /opt/pidp11-webdesktop/current/webdesktop-service status
   ```

   Expected: every line detached. Open the configured HTTPS address and **Guest terminal**; enter the appropriate private token. With no approved guest, **Connect** stays disabled. A new service process revokes old browser sessions and keyboard leases. Installation and this procedure leave autostart disabled.

5. Independently verify the running guest and reserved terminal line through conventional access. Read fresh status and use its exact instance and line revision:

   ```sh
   sudo /opt/pidp11-webdesktop/current/webdesktop-service attach \
     -instance INSTANCE_FROM_STATUS -id guest-dc0 -revision REVISION_FROM_STATUS \
     -guest-and-line-verified
   ```

   In the browser select **Refresh lines**, the intended line and terminal personality, then **Connect**. You begin read-only; keyboard acquisition is explicit. Observer credentials cannot acquire it. Personality selection does not change the guest's own terminal settings. A rejected attachment is not automatically retried.

6. **Disconnect** closes this browser view without stopping the guest. Before any intentional guest change or simulator restart, stop the **actual service process**:

   ```sh
   sudo systemctl stop pidp11-webdesktop.service
   ```

   Closing a browser alone is insufficient. After the independently managed guest change, restart detached, verify the guest/line again and issue a new approval. EOF retires an attachment, and reused ports cannot automatically reconnect. A guest change that preserves the same open stream may remain invisible; there is no claim of authoritative automatic OS detection.

## Disable, upgrade, roll back or remove

See the [tested package lifecycle procedure](../lab/M5.6-implementation.md#upgrade-rollback-disable-and-uninstall). All operations affect the companion only. Stop and disable before replacing a release. Preserve private configuration backups separately; never bundle guest disks into a desktop rollback. Complete removal explicitly purges only the five known private files and dedicated identity, refusing unknown contents.

If the service cannot start, run the file check as its account and inspect `journalctl -u pidp11-webdesktop.service` locally. Review the certificate expiry/name, private-file permissions, chosen port and any memory-containment refusal. If memory protection is unavailable, leave the companion stopped and retain the original physical-only experience; boot changes need separate authorization. An unavailable guest line calls for independent guest inspection, not an emulator restart by the companion. Do not delete a control socket or terminate unrelated processes to clear an error.

## M5.12 laboratory supervision and rollback

The optional `supervised_endpoints` key requires fresh local lifetime observations
for named allowlisted lines. The accompanying observer is a separately operated
Linux laboratory tool, not an installed service or production guest detector.
The [identity contract](../technical/supervised-guest-identity.md) defines the
operator-verification requirement and surviving-stream limitation.

Older releases reject this key. While the companion is stopped, restore the
previous reviewed private configuration together with the older executable during
rollback. Preserve the newer configuration privately for a later return. Do not
silently drop a supervision requirement or restart an emulator to make the
companion work. M5.12's protected ARM64 rehearsal tested this exact compatibility
boundary; it did not qualify a Pi installation.
