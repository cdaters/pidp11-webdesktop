# PiDP-11 Web Desktop

This is an independent, local development project. Do not connect to the Raspberry Pi, discover it on the network, SSH to it, install anything on it, or change its official installation. Authorized work now includes a loopback-only mock Go backend, simulated WebSockets and offline RPC/XDR fixtures. No production RPC listener, outbound panel client or GPIO integration. Live emulator control requires a separately authorized integration milestone.

Keep emulator behavior in SIMH/REALCONS. Do not turn the demonstration model into a replacement PDP-11 emulator. Keep browser presentation independent of transport. Read docs/architecture.md and docs/protocol.md before adding adapters. Treat performance figures as targets until measured on authorized target hardware. Preserve source revision citations.

Run go test -race ./..., npm run check, npm test, and npm run build for behavior changes. Do not publish or deploy this project during local development.
