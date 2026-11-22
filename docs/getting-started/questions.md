# Questions and troubleshooting

**Do I need a physical kit?** No. The [local desktop](../../README.md#try-the-local-desktop) needs only the development tools. Genuine guest demonstrations require separate disposable media and the authenticated laboratory service.

**Why does a convincing device say “simulated”?** Its label describes the data source. The ordinary front panel, disk/tape controls and local printer spool are demonstrations. **Guest terminal** and **Guest devices** have separate connection and provenance displays.

**Guest terminal is disconnected.** This is expected in the browser-only preview. A separately started service needs an identified guest line and explicit local approval. The project does not discover guests, start Oscar’s launcher or silently reconnect after a guest change. Earlier Pi pilots were shut down and rolled back.

**Typing does nothing.** Check the selected line, connection state and keyboard ownership. Connecting starts read-only; observer credentials cannot type. Check the guest’s terminal type and Backspace encoding. A reconnect can encounter an existing login or unfinished input; inspect it before typing.

**Can the original console keep working?** That is a core requirement. Dedicated guest lines keep browser typing separate from the operator console. Specific Screen and physical-panel coexistence checks passed, but the unexpected physical boot selection blocked overall acceptance. [Physical findings](../lab/M5.5-physical-pilot.md).

**A window is missing or cramped.** Restore it from the taskbar, maximize it or use Reset layout. Arrange equipment groups useful windows. Text size changes readability; it does not change the guest’s historical screen dimensions.

**The printer stops updating.** Distinguish the local sample spool from an approved device observation. A live producer may buffer bytes, become stale or complete. Check the reported generation and state. Download only completed output when enabled; do not restart the emulator to repair a browser display. [Observation guide](../technical/observed-peripherals.md).

**Does a refresh preserve my demonstration media?** No. Those models are memory-only. Save a printer spool or completed device output you want to retain. Window positions are saved locally; keyboard leases are not.

**The companion has no model.** Offline references, source facts and exact calculation still work. A real model needs explicit [configuration](configured-companion.md), authentication and transport. A cited model answer can still be wrong; annotations do not verify a whole response.

**The service refuses to start.** In an authorized lab, inspect its local journal and run the documented file check as the service account. Check certificate expiry/name, private-file permissions, exact HTTPS origin and port. A browser certificate warning requires fingerprint/name verification, not globally disabling TLS checks. Never publish tokens or put them in a URL.

**Memory protection is unavailable.** Leave the companion stopped. The candidate requires effective kernel memory and zero-swap limits; `GOMEMLIMIT` alone cannot enforce them. The assessed Pi had its memory controller disabled. Do not weaken the startup guard; boot changes need separate owner-approved maintenance. [Memory prerequisite](installation-paths.md#memory-controller-prerequisite-after-hardware-repair).

**Can I expose it to the Internet?** There is no supported Internet-facing deployment. Keep guest and RPC ports private. Initial authorized reviews use loopback and an owner-managed protected connection; public authentication is not a complete network-security design.

**Does the Trixie guide install this desktop?** No. It documents Oscar’s original software. Its complete reconstructed procedure has not been independently replayed from a blank card. [Installation evidence](../installation/README.md).

**A setup command failed.** Stop there, keep the error and check the documented tool versions and working directory. Report the command, OS/browser and commit after removing credentials, private addresses and captures. Do not change your Pi to fix a local preview failure.

[Known limitations](../known-limitations.md) · [Documentation index](../README.md)
