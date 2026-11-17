# PiDP-11 Web Desktop

This is an independent, local development project. Do not connect to the Raspberry Pi, discover it on the network, SSH to it, install anything on it, or change its official installation. Authorized work includes the mock Go backend and M3/M4/M4.1/M4.2/M4.3 isolated Linux laboratory: original SIMH/REALCONS, loopback RPC server/client, simulated physical panel and control broker. Run actual emulator/RPC interoperability only inside the disposable network-none lab, with no physical GPIO or production access. Do not connect to the Raspberry Pi even after backup completion; production integration requires separate explicit authorization. Preserve all checkpoints. Containers are development-only, never a deployment dependency.

Keep emulator behavior in SIMH/REALCONS. Do not turn the demonstration model into a replacement PDP-11 emulator. Keep browser presentation independent of transport. Read docs/architecture.md and docs/protocol.md before adding adapters. Treat performance figures as targets until measured on authorized target hardware. Preserve source revision citations.

Run go test -race ./..., npm run check, npm test, and npm run build for behavior changes. Do not publish or deploy this project during local development.
