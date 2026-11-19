# Where the project is going

These are directions for experimentation, not delivery promises. The [timeline](docs/timeline.md) and [changelog](CHANGELOG.md) record completed work; the [technical roadmap](docs/roadmap.md) retains resource targets and engineering gates.

## Completed foundations

| Work | What the evidence establishes |
|---|---|
| Browser desktop and panel | Movable windows, SVG panel, mock terminals and simulated peripheral workflows |
| M4.3.2 continuous-form printer | Bounded tractor-feed paper viewer and unchanged downloadable text spool; still simulated |
| [M5.0 genuine UNIX V7 terminals](docs/lab/M5.0.md) | Actual guest commands, independent lines, observers, explicit keyboard ownership and reconnect in an isolated Mac-hosted Linux lab |
| [M5.1 Pi compatibility assessment](docs/lab/M5.1.md) | Read-only installed-software/configuration assessment; no deployment or guest start |
| M5.2 / M5.2.1 community foundations | Public repository, contributor documentation, engineering standards and source map |
| [M5.3 actual Pi terminal pilot](docs/lab/M5.3.md) | Genuine V7 on the installed simulator, one DC11 line, three browser engines, Screen independence and verified cleanup; no physical panel |
| [M5.4 coexistence preparation](docs/lab/M5.4.md) | Mac-only launcher/profile design, one-shot guest attachment safeguards and a reversible supervised pilot proposal; no Pi access |

## Sharing the work

Public GitHub source, authentic screenshots, beginner and developer documentation, the headless Trixie guide, original-code MIT licensing and preserved development history. This publication milestone does not advance the live integration status.

## Next investigations

- **Pilot follow-up:** review durable credentials/certificate provisioning, service isolation and sustained performance separately. The first controlled Pi terminal pilot is complete; no service remains running.
- **Original-launcher coexistence:** review the [M5.4 opt-in profile proposal](docs/lab/M5.4-pilot-plan.md) for the now-assembled machine; authorize exact additive changes separately. The standalone M5.3 Screen session did not exercise that launcher or its panel daemon. No distribution switcher is implemented.
- **Guest lifecycle:** keep the service detached after restart; resolve authoritative generation/line identity before unsupervised guest switching. A reused port or surviving simulator PID is insufficient.
- **Additional guests:** validate the actual driver, login and serial-line requirements of each operating system; host device support alone is insufficient.
- **Live panel observation:** build on the passive-observation lab without adding side-effecting panel input reads. This is separate from remote control.
- **Physical serial coexistence:** reserve independent lines and use stable device identities when the owner's optional serial hardware is available.

## Longer-term possibilities

Improve VT100 behavior with real applications, add VT52, extend VT220 compatibility, and investigate Tektronix 4010 and VT11/VR14 graphics. Connect disk, tape, printer and paper-tape windows to real guest devices only with appropriate lifecycle and media protections. Community experiments may suggest other useful directions.

Remote front-panel control remains a distinct unresolved safety problem. Observing a machine does not grant control of it, and losing a browser does not prove that the CPU stopped. Existing START-release and blocked-RPC limitations stay visible until evidence resolves them.

Ideas, historical references and practical experiments are welcome through [contributing](CONTRIBUTING.md). There are no promised dates for these ambitions.
