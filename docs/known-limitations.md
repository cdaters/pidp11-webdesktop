# What is still experimental

**M5.9 update:** the [development checkpoint](lab/M5.9.md) adds genuine V7 Tektronix output, initial VT220/teletype, manual printer snapshots and offline companion chat. Full-screen terminal qualification, live printer/media transport, VT11 and configured model integration remain incomplete.


The desktop is useful for exploration now, and genuine guest-terminal integration has passed in a controlled lab and a standalone actual-Pi pilot. That is different from a supported Pi installation.

| Area | Limit and next evidence needed |
|---|---|
| Live Pi service | M5.5 demonstrated V7/browser/physical subtests but failed its physical-only fallback; temporary changes were rolled back and the machine left stopped. No accepted physical checkpoint or permanent service exists. The candidate through M5.9 passed disposable Linux tests, not physical deployment. Disabled memory cgroups remain a startup blocker on the assessed Pi. |
| Physical hardware | M5.5 owner-observed HALT/CONT and DATA-selector behavior worked with the V7 pilot and after bridge shutdown. The later intended IDLED selection started RSX despite all SR paddles being down; cause remains unknown. No further guest start is authorized by that recovery. Sustained power and physical serial expansion remain untested. |
| Panel control | Delayed START release and blocked RPC can defeat simple browser/broker fail-safe assumptions. Remote control is separate from passive observation. |
| Terminal compatibility | M5.9 adds initial VT220 and teletype presentations and genuine V7 Tektronix plotting. Full-screen historical applications, full VT220/4014 conformance and genuine GIN remain unqualified; VT11 has no transport. DEC text uses 80 × 24; teletype uses 72 columns. Input remains ASCII7. |
| Guest selection | Actual terminal acceptance covers UNIX V7 in the lab and the single-line Pi pilot. A configured serial device does not prove another guest has its driver and login services ready. |
| Reconnect and handoff | M5.4 retires each bridge after one attachment attempt and rejects reused endpoints; no automatic input/history replay. In-process guest changes on a surviving socket remain undetectable without another identity mechanism. Partial commands can survive browser reconnect; bridge failure may hang up the line. |
| Accounts and exposure | Lab credentials, endpoint allowlists and TLS are not a complete multiuser/LAN provisioning plan. Do not expose raw guest or panel RPC ports to the Internet. |
| Peripherals | Disk/tape/paper-tape/system controls remain memory-only demonstrations. Printer accepts explicit local text snapshots; there is no real-media management or live guest LP0 connection. |
| AI Companion | Deterministic offline guide only; host-provider adapters are tested separately but not wired to the UI. No model or command-execution authority. |
| Printing | Download spool preserves text. Printing the visible browser DOM is not a supported complete listing export. |
| Performance | M5.5 sampled 6.7 MiB idle / 13.8 MiB active bridge RSS, 0.30% idle CPU and 5.55% active CPU; the latter exceeds the <5% target. Short workloads do not qualify sustained load, added-transport latency or emulator impact. |
| Browsers | Chromium, Firefox and WebKit passed recorded tests. Native Safari automation was unavailable under existing personal settings, which were left unchanged. |
| Installation tutorial | A working original installation was tested; the complete reconstructed blank-card guide has not been independently repeated. |

Details are in [M5.0](lab/M5.0.md), [M5.1](lab/M5.1.md), [M5.3](lab/M5.3.md), [M5.4](lab/M5.4.md), [M5.5 physical findings](lab/M5.5-physical-pilot.md), [panel safety](lab/M4.md), [installation status](installation/README.md) and the [roadmap](../ROADMAP.md). Contributions that reduce a specific uncertainty are welcome.

## M5.9.1 scope update

Completed LP11/PC11 observations and optional configured chat now exist; earlier statements about no backend peripheral or provider wiring describe older milestones. Printer acceptance is a real emulated-CPU/device program, not an OS driver. Spool tailing, real model acceptance, media collectors and general AI command execution remain absent. Eight retained 2.11BSD vi cases establish limited full-screen application behavior. [Current capability table](lab/M5.9.1.md).
