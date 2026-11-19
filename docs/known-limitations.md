# What is still experimental

The desktop is useful for exploration now, and genuine guest-terminal integration has passed in a controlled lab and a standalone actual-Pi pilot. That is different from a supported Pi installation.

| Area | Limit and next evidence needed |
|---|---|
| Live Pi service | M5.3's separate terminal-pilot command passed on the Pi and was stopped. No permanent service, general installer or normal-launcher integration exists; terminal-lab still retains its isolation guard. |
| Physical hardware | The owner reports the assembled kit passing initial LED/switch/HALT/CONT/encoder checks and a normal-launcher RT-11 boot. Integrated browser/panel coexistence, sustained power behavior and physical serial expansion remain untested; see M5.4. |
| Panel control | Delayed START release and blocked RPC can defeat simple browser/broker fail-safe assumptions. Remote control is separate from passive observation. |
| Terminal compatibility | Tested VT100-style subset, ASCII7 and fixed 80 × 24. VT52/full VT220/Tektronix/VT11 are future work; full-screen guest applications need broader checks. |
| Guest selection | Actual terminal acceptance covers UNIX V7 in the lab and the single-line Pi pilot. A configured serial device does not prove another guest has its driver and login services ready. |
| Reconnect and handoff | M5.4 retires each bridge after one attachment attempt and rejects reused endpoints; no automatic input/history replay. In-process guest changes on a surviving socket remain undetectable without another identity mechanism. Partial commands can survive browser reconnect; bridge failure may hang up the line. |
| Accounts and exposure | Lab credentials, endpoint allowlists and TLS are not a complete multiuser/LAN provisioning plan. Do not expose raw guest or panel RPC ports to the Internet. |
| Peripherals | Disk/tape/paper/printer/system controls remain memory-only demonstrations; there is no real-media management or guest LP0 connection. |
| Printing | Download spool preserves text. Printing the visible browser DOM is not a supported complete listing export. |
| Performance | M5.3 records short Pi process measurements within the sampled RSS/CPU targets. Sustained load, added-transport latency and emulator-throughput impact remain unverified. Clear pilot power flags do not erase earlier concerns. |
| Browsers | Chromium, Firefox and WebKit passed recorded tests. Native Safari automation was unavailable under existing personal settings, which were left unchanged. |
| Installation tutorial | A working original installation was tested; the complete reconstructed blank-card guide has not been independently repeated. |

Details are in [M5.0](lab/M5.0.md), [M5.1](lab/M5.1.md), [M5.3](lab/M5.3.md), [M5.4](lab/M5.4.md), [panel safety](lab/M4.md), [installation status](installation/README.md) and the [roadmap](../ROADMAP.md). Contributions that reduce a specific uncertainty are welcome.
