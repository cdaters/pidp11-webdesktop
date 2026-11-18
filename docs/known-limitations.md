# What is still experimental

The desktop is useful for exploration now, and genuine guest-terminal integration has passed in a controlled lab. That is different from a supported Pi installation.

| Area | Limit and next evidence needed |
|---|---|
| Live Pi service | Not deployed. M5.1 was read-only. The current terminal-lab command intentionally rejects a normally networked host; a reviewed terminal-only entry point is needed. |
| Physical hardware | The owner's kit is not yet assembled. Physical switch/LED timing, power behavior and serial expansion coexistence are not established by browser tests. |
| Panel control | Delayed START release and blocked RPC can defeat simple browser/broker fail-safe assumptions. Remote control is separate from passive observation. |
| Terminal compatibility | Tested VT100-style subset, ASCII7 and fixed 80 × 24. VT52/full VT220/Tektronix/VT11 are future work; full-screen guest applications need broader checks. |
| Guest selection | Actual terminal acceptance covers UNIX V7 in the lab. A configured serial device does not prove another guest has its driver and login services ready. |
| Reconnect and handoff | No automatic input/history replay. Guest partial input and application modes can survive a browser reconnect. Bridge failure may hang up that guest line. |
| Accounts and exposure | Lab credentials, endpoint allowlists and TLS are not a complete multiuser/LAN provisioning plan. Do not expose raw guest or panel RPC ports to the Internet. |
| Peripherals | Disk/tape/paper/printer/system controls remain memory-only demonstrations; there is no real-media management or guest LP0 connection. |
| Printing | Download spool preserves text. Printing the visible browser DOM is not a supported complete listing export. |
| Performance | Pi budgets are targets. Short Mac-hosted lab measurements are not physical-Pi performance results. Earlier Pi power/thermal concerns remain relevant. |
| Browsers | Chromium, Firefox and WebKit passed recorded tests. Native Safari automation was unavailable under existing personal settings, which were left unchanged. |
| Installation tutorial | A working original installation was tested; the complete reconstructed blank-card guide has not been independently repeated. |

Details are in [M5.0](lab/M5.0.md), [M5.1](lab/M5.1.md), [panel safety](lab/M4.md), [installation status](installation/README.md) and the [roadmap](../ROADMAP.md). Contributions that reduce a specific uncertainty are welcome.
