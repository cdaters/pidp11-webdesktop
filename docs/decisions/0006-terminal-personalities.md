# 0006: Terminal personalities do not own connections

Accepted for the M5.6 local implementation, November 19, 2026.

Keep one authentication, attachment-generation, keyboard-lease and output-credit path. A connection owns one selected personality parser and one renderer lifetime. VT100 delegates display parsing to pinned xterm.js; VT52 translates a documented subset into that renderer. A disconnected user may select a personality; doing so cannot approve a guest, set its terminal configuration or send input. Protocol replies use the same keyboard gate as human typing. Disconnect/reconnect destroys incomplete parser state and grants no authority.

The4010 parser remains a separate fixture-only application until real guest compatibility and bounded streaming are tested. VT11 is a different simulator device with no implemented browser transport. No profile may reinterpret terminal bytes as host commands, panel operations or endpoint addresses.

This keeps the deployed executable and frontend dependencies small. It does not solve authoritative guest identification: a same-process guest change that preserves an open stream can remain invisible. Stop the actual service before intentional guest changes, then independently verify and approve the new line. See [0005](0005-detached-terminal-service.md) and [terminal conformance](../technical/terminal-personalities.md).
