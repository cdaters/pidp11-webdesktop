# From a panel prototype to a real guest terminal

The project began with a compact browser panel and grew into a windowed desktop. **M5.0 is the turning point:** a browser executed real commands inside UNIX V7 through the Go bridge, rather than a mock command handler. M5.1 then inspected the actual Pi without deploying anything.

Dates below are the recorded local commit dates (America/Phoenix), not invented project-start dates or public release dates. Detailed reports and accepted tags retain their original evidence.

| Milestone | Date | What changed | Evidence |
|---|---|---|---|
| M0 | 2026-11-16 | Research and isolated HTML/SVG prototype | [Report](architecture.md) · [`b09e528`](https://github.com/cdaters/pidp11-webdesktop/commit/b09e528) |
| M0.2 | 2026-11-16 | Mock Go backend, shared panel state and offline RPC/XDR fixtures | [Report](backend-milestone.md) · [`520ae05`](https://github.com/cdaters/pidp11-webdesktop/commit/520ae05) |
| M3 | 2026-11-16 | Actual original-C/Go RPC and REALCONS interoperability in an isolated lab | [Report](lab/M3.md) · [`dbbfd71`](https://github.com/cdaters/pidp11-webdesktop/commit/dbbfd71) |
| M4 | 2026-11-16 | Coexistence broker laboratory; delayed START-release safety limitation demonstrated | [Report](lab/M4.md) · [`b539ada`](https://github.com/cdaters/pidp11-webdesktop/commit/b539ada) |
| M4.1 | 2026-11-16 | Consumer-fence and independent-access experiments; remaining stop guarantees documented | [Report](lab/M4.1.md) · [`238e45f`](https://github.com/cdaters/pidp11-webdesktop/commit/238e45f) |
| M4.2 | 2026-11-16 | Windowed desktop, simulated applications and passive-observation lab | [Report](lab/M4.2.md) · [`1491994`](https://github.com/cdaters/pidp11-webdesktop/commit/1491994) |
| M4.3 | 2026-11-17 | Historical paddle reconstruction, security/recovery work and extended lab measurements | [Report](lab/M4.3.md) · [`a303039`](https://github.com/cdaters/pidp11-webdesktop/commit/a303039) |
| M4.3.1 | 2026-11-17 | Paddle presentation polish and consistent version display | [Report](review-m431.md) · [`59b52eb`](https://github.com/cdaters/pidp11-webdesktop/commit/59b52eb) |
| M4.3.2 | 2026-11-17 | Continuous-form simulated LP0 printer with unchanged spool format | [Report](printer-m432.md) · [`947697a`](https://github.com/cdaters/pidp11-webdesktop/commit/947697a) |
| M5.0 | 2026-11-18 | Browser communicates with genuine UNIX V7; independent guest lines and console verified in the lab | [Report](lab/M5.0.md) · [`156ce33`](https://github.com/cdaters/pidp11-webdesktop/commit/156ce33) |
| M5.1 | 2026-11-18 | Actual Pi read-only compatibility assessment and unexecuted terminal-pilot plan | [Report](lab/M5.1.md) · [`ccfb972`](https://github.com/cdaters/pidp11-webdesktop/commit/ccfb972) |
| M5.2 / M5.2.1 | 2026-11-18 | Public repository and contributor/engineering standards | [Publication](publication-m52.md) · [Review](technical/MAINTAINABILITY.md) |
| M5.3 | 2026-11-18 | Genuine V7 terminal on the actual Pi, independent Screen console, modest measurements and verified cleanup | [Report](lab/M5.3.md) · implementation `b8e9b74` |

M5.2 prepares this work for public collaboration with community documentation and licensing. It adds no physical-Pi integration. The [roadmap](../ROADMAP.md) separates the next experiments from longer-term ambitions.
