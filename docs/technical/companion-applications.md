# Optional companion application boundaries

M5.6 extends the [M5.5.1 community review](../lab/M5.5.1-community.md); it does not import or combine those projects. Rolf Peters' Hacker Replicant, Oscar's Agent-PDP1, VT05/other terminal experiments and The High Nibble's desktop remain independent work. Their control models should be discussed with their maintainers before proposing integration. No contact, partnership, AI copilot or plugin loader was implemented here.

A useful future application contract should distinguish:

| Boundary | Proposed information and obligations |
|---|---|
| Application lifecycle | A host element and explicit cleanup; bounded timers, event listeners, workers and queues; closing a window cannot stop an emulator |
| Device identity | Opaque endpoint ID, service instance and generation; labels are descriptive, not authentication or OS evidence |
| Representation | Explicit terminal personality and encoding, or a distinct graphics protocol; VT05/VT52/VT100 text, 4010 bytes and VT11 events are not interchangeable |
| Observation | Bounded ordered output with generation and coverage; disconnect/loss is visible, and stale data cannot become a current screen |
| Input | Existing exclusive keyboard lease, sequence checks and ASCII bounds; no automatic acquisition or replay after reconnect |
| Capabilities | Explicitly granted guest-terminal observation/input only; no implicit host shell, SIMH monitor, GPIO, boot, disk or panel authority |
| Resource use | Stop subscriptions on disposal; preserve the service's existing bounds; test slow consumers and competing viewers |

An in-process TypeScript module is trusted application code, **not a security sandbox**. Arbitrary third-party code cannot safely receive the desktop's session or DOM simply by being called a plugin. External companion origins need a separately designed authentication, CSP and permission boundary; embedding an unrestricted remote-control page does not enforce our restrictions.

Prove an adapter first with deterministic conformance fixtures and malformed/disconnected cases, then disposable genuine guests where applicable. Record exactly what passed. Keep original console, physical controls and guest lifecycle independent. Optional external intelligence, if ever pursued separately, must be absent by default and unnecessary for the complete desktop. Terminal output and model responses are data, never authority to widen capabilities.
