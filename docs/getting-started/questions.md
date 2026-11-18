# Questions and troubleshooting

**Do I need a physical kit to explore this?** No. The browser-only desktop runs locally without a Pi. Reproducing the real guest demonstration needs the separate laboratory setup.

**Why do the panel and devices say “simulated”?** Those labels identify their actual data source. A convincing panel or disk window is not evidence of a live device connection. Real guest terminals have a separate connection/status display.

**Guest terminal says disconnected. Is something broken?** The normal local demo has no real guest service. A real-guest service must be explicitly prepared and started before Guest terminal can authenticate and connect. The completed M5.3 Pi pilot was shut down; it is not an always-on service. There is no one-click Pi installer yet.

**Does the Trixie guide install the Web Desktop?** No. It prepares Oscar's original PiDP-11 software. Its successful installation history and still-unrepeated complete blank-card tutorial are explained in the [guide status](../installation/README.md).

**Can I use my regular console at the same time?** Independence is a core requirement. The lab uses separate guest lines and an operator console. M5.3 also verified an independent Screen console on the actual Pi during browser closure and bridge restart. Normal-launcher and physical-panel coexistence remain separate future tests.

**Typing does nothing.** Check whether the terminal is a mock or real guest, whether it is connected, and whether this window owns the keyboard. A viewer cannot type. For UNIX V7, also check the Backspace selection; DEL and `#` are different guest inputs.

**A window is lost or too small.** Restore it from the taskbar, maximize it or use Reset layout. The real terminal keeps its historical 80 × 24 size and scrolls when its window is narrower.

**Will my demonstration disks and printer jobs survive a refresh?** No. These are memory-only models. Download a printer spool you want to keep. Window positions are the main saved preference.

**Can I put this on the Internet?** There is no supported Internet-facing deployment. Use the documented loopback demo or isolated lab. Authentication, guest privileges, raw terminal ports and panel RPC all need deliberate deployment design.

**The setup command failed.** Stop at that command and save its error. Check the documented Node/Go versions and that you are in the repository folder. Report the command, OS/browser and commit in an issue after removing private data. Do not “fix” a local desktop failure by changing your Pi installation.

For the engineering boundaries behind these answers, see [known limitations](../known-limitations.md).
