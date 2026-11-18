# Where the project is going

These are directions for experimentation, not delivery promises. The [timeline](docs/timeline.md) and [changelog](CHANGELOG.md) record completed work; the [technical roadmap](docs/roadmap.md) retains resource targets and engineering gates.

## Completed foundations

| Work | What the evidence establishes |
|---|---|
| Browser desktop and panel | Movable windows, SVG panel, mock terminals and simulated peripheral workflows |
| M4.3.2 continuous-form printer | Bounded tractor-feed paper viewer and unchanged downloadable text spool; still simulated |
| [M5.0 genuine UNIX V7 terminals](docs/lab/M5.0.md) | Actual guest commands, independent lines, observers, explicit keyboard ownership and reconnect in an isolated Mac-hosted Linux lab |
| [M5.1 Pi compatibility assessment](docs/lab/M5.1.md) | Read-only installed-software/configuration assessment; no deployment or guest start |

## M5.2 — sharing the work

Public GitHub source, authentic screenshots, beginner and developer documentation, the headless Trixie guide, original-code MIT licensing and preserved development history. This publication milestone does not advance the live integration status.

## Next investigations

- **Controlled physical-Pi terminal pilot:** prepare a reviewed terminal-only entry point, then test a disposable UNIX V7 copy on DC11 line 0 after explicit approval. The [pilot plan](docs/lab/M5.1-pilot-plan.md) has not been executed.
- **Original-launcher coexistence:** retain the ordinary console and physical route while investigating an opt-in guest profile. No distribution switcher is implemented.
- **Additional guests:** validate the actual driver, login and serial-line requirements of each operating system; host device support alone is insufficient.
- **Live panel observation:** build on the passive-observation lab without adding side-effecting panel input reads. This is separate from remote control.
- **Physical serial coexistence:** reserve independent lines and use stable device identities when the owner's optional serial hardware is available.

## Longer-term possibilities

Improve VT100 behavior with real applications, add VT52, extend VT220 compatibility, and investigate Tektronix 4010 and VT11/VR14 graphics. Connect disk, tape, printer and paper-tape windows to real guest devices only with appropriate lifecycle and media protections. Community experiments may suggest other useful directions.

Remote front-panel control remains a distinct unresolved safety problem. Observing a machine does not grant control of it, and losing a browser does not prove that the CPU stopped. Existing START-release and blocked-RPC limitations stay visible until evidence resolves them.

Ideas, historical references and practical experiments are welcome through [contributing](CONTRIBUTING.md). There are no promised dates for these ambitions.
