# M4.3 terminal compatibility fixtures

Research date: 2026-11-17. Scope: installed xterm.js 6.0.0, the M4.2 `src/terminal.ts` adapter, DEC manuals and Telnet specifications. No Raspberry Pi, emulator, production terminal, SSH, or Screen session was contacted. This is a fixture specification and a bounded local renderer investigation, not a claim of complete terminal conformance.

## Evidence and baseline

The package pins `@xterm/xterm` 6.0.0 and `@xterm/addon-fit` 0.11.0. The installed package declares MIT licensing. Relevant primary implementation files are `node_modules/@xterm/xterm/src/common/InputHandler.ts`, `src/common/input/Keyboard.ts`, `src/common/data/Charsets.ts`, and `src/common/services/CoreService.ts` (the latter three paths are relative to the package root). Upstream: [xterm.js repository](https://github.com/xtermjs/xterm.js), [versioned release](https://github.com/xtermjs/xterm.js/releases/tag/6.0.0), [6.0.0 sequence support](https://xtermjs.org/docs/api/vtfeatures/), [encoding contract](https://xtermjs.org/docs/guides/encoding/).

Snapshot SHA-256 values, taken before concurrent M4.3 implementation changes:

| File | SHA-256 |
| --- | --- |
| `src/terminal.ts` | `f9a4ded22d5633cec97605708a5ff9fb36ba36712ef22801e30aa2335f6db8c2` |
| xterm `package.json` | `f5a0dde40a146d6c7a86b22daf6e5740517e5d708ec1d162197e0445431d8f4f` |
| xterm `InputHandler.ts` | `b03afd5d38dd708440699e81135f1735626d55ffdf24621fbd54cfbc41320925` |
| xterm `Keyboard.ts` | `b1f999aa257410ac77aa8abadf03300ca0fc582cda98f0f01b4a81ef7eb7e3d8` |
| xterm `Charsets.ts` | `bac7104ffb2887b9871a08a294ba08ebf6d848774189474d1ec52e3da8c5f37e` |

DEC references are preserved transcriptions of DEC documentation, not modern terminal cheat sheets:

- [VT100 User Guide, chapter 3](https://vt100.net/docs/vt100-ug/chapter3.html): ANSI/VT52 controls, keypad tables 3-7/3-8, special graphics table 3-9.
- [VT220 Programmer Reference Manual, chapter 3](https://vt100.net/docs/vt220-rm/chapter3.html): generated keyboard codes, tables 3-1 through 3-4.
- [VT220 Programmer Reference Manual, chapter 4](https://vt100.net/docs/vt220-rm/chapter4.html): received codes, DECANM, cursor positioning, margins, character sets and editing.
- [VT52 Maintenance Manual, chapter 3](https://vt100.net/docs/vt52-mm/chapter3.html): original terminal context. The fixture dialect below is specifically the VT52 compatibility mode documented by DEC for VT100/VT220; it does not certify an original VT52 keyboard or hardware implementation.

The baseline wrapper creates an 80×24 renderer but immediately applies FitAddon, so actual rows/columns depend on the desktop window. It uses `convertEol:false`, a 300-line scrollback, and a local command-line mock. It consumes `onData` character by character rather than transporting it unchanged. For example, the printable `OP` tail of F1's `ESC OP` becomes mock command text, as does `[A` from an arrow sequence. Its `session.inputOwner` check is local mock ownership, not a remotely enforced lease. These findings describe the hashed baseline, not subsequent M4.3 changes.

| Feature | Renderer baseline | Wrapper/profile baseline |
| --- | --- | --- |
| DEC G0/G1 line drawing, CUP, relative cursor movement | Local buffer probes passed below | Can render output; no compatibility test harness exposed |
| Scroll margins, DECOM, DECAWM, CR/LF, BS | Local buffer probes passed | `convertEol:false`; command mock adds its own CR/LF |
| F1–F4 as PF1–PF4, ANSI/application arrows | Source implements these mappings | Sequences damaged by line-oriented mock parsing |
| Numeric/application keypad | ESC `=`/`>` sets an exposed mode flag | No application-keypad encoder found in keyboard path; must test/implement explicitly |
| VT52 `CSI ?2l`, `ESC Y` | Explicitly unsupported; negative probe confirmed | No VT52 translator/profile |
| VT220 editing/selective erase | Selected probes passed | Partial functionality only; not a VT220 identity |
| DECSCL operating-level selection | Explicitly unsupported | Do not advertise complete VT220 |
| DEC 8-bit character repertoire/C1 | String C1 works; raw byte API is UTF-8 | No legacy encoding adapter |
| Telnet negotiation, NVT, binary, NAWS, terminal type | Outside renderer responsibility | Not present in the inspected adapter |

## Deterministic screen fixtures

Each row is an independent, fresh `Terminal({cols:10,rows:5,convertEol:false})`. Do not attach FitAddon. Strings use JavaScript escapes: `\x1b`=ESC, `\r`=CR, `\n`=LF, `\b`=BS. Coordinates below are **one-based (row,column)**. Unmentioned cells are spaces. Await the `write(data, callback)` callback before reading `buffer.active`; visual paint timing is not a parser completion signal.

The following exact inputs and outcomes were exercised against the installed package in Node, without `open()` or browser rendering. These are actual buffer observations, not screenshot claims. The vectors are project-authored test cases motivated by the manuals and implementation.

| ID | Exact input | Expected screen and cursor |
| --- | --- | --- |
| G0 | `\x1b(0lqk\r\nx x\r\nmqj\x1b(B` | Rows 1–3: `┌─┐`, `│ │`, `└─┘`; cursor (3,4). |
| G1 | `\x1b)0\x0elqk\x0fABC` | Row 1 `┌─┐ABC`; cursor (1,7). |
| CUP-relative | `\x1b[3;4HX\x1b[2A\x1b[2CY` | X at (3,4), Y at (1,7); cursor (1,8). |
| CUP-defaults | `\x1b[4;6HX\x1b[H!\x1b[0;0H?` | X at (4,6), `?` at (1,1), replacing `!`; cursor (1,2). |
| Margins | `\x1b[1;1HA\x1b[2;1HB\x1b[3;1HC\x1b[4;1HD\x1b[5;1HE\x1b[2;4r\x1b[4;1H\nZ` | Rows 1–5 start `A`, `C`, `D`, `Z`, `E`; cursor (4,2). Outer rows unchanged. |
| Origin | `\x1b[2;4r\x1b[?6h\x1b[1;1HX\x1b[3;2HY` | X at physical (2,1), Y at (4,2); cursor (4,3). |
| Wrap | `1234567890X` | Row 1 `1234567890`, row 2 `X`; cursor (2,2). |
| No-wrap | `\x1b[?7l1234567890X` | Row 1 `123456789X`; other rows blank; visible cursor at last column. |
| CR/LF | `ABC\nD\rE` | Row 1 `ABC`, row 2 `E  D`; cursor (2,2). LF preserves column; CR changes column only. |
| BS | `ABC\bZ` | Row 1 `ABZ`; cursor (1,4). BS moves; replacement Z performs the overwrite. |
| DEL-output | `ABC\x7fZ` | Row 1 `ABCZ`; cursor (1,5). DEL does not erase. This package also logs a parser diagnostic for DEL. |
| Save/restore | `\x1b[2;3H\x1b7\x1b[4;5HX\x1b8Y` | X at (4,5), Y at (2,3); cursor (2,4). |
| Insert | `ABCDE\x1b[1;3H\x1b[2@XY` | Row 1 `ABXYCDE`; cursor (1,5). |
| Delete | `ABCDE\x1b[1;2H\x1b[2P` | Row 1 `ADE`; cursor (1,2). |
| Protection | `\x1b[1"qA\x1b[0"qB\x1b[1;1H\x1b[?2K` | Row 1 `A`, B erased; cursor (1,1). |

At the right edge, xterm's public `cursorX` can temporarily equal `cols` (10 here), rather than the last visible index 9. The no-wrap probe returned `cursorX=10`, `cursorY=0`. Keep raw API expectations distinct from the visible cursor position. Add a two-stage wrap assertion: after exactly ten characters the first row is full and row 2 blank; after X the wrap occurs. Use continuation behavior, not a fabricated 11th screen cell, as the portable check.

Recommended additions before claiming the subset complete: RI at top margin, `ESC D` versus `ESC E`, restore G0/G1 and attributes with DECSC/DECRC, erase defaults and bounds, cursor reports (`CSI 6n`), LF at the full-screen bottom, pending-wrap followed by CR/BS, resize during a scroll region, and origin reset. For every parser vector, repeat with every possible split into two chunks and byte-at-a-time input. This catches partial escape-state loss independently of display geometry.

## Keyboard fixtures

Capture emitted bytes before the mock command parser. Use real browser key events as well as pure encoder tests. `Terminal.write()` tests received output; it does not test what a key sends.

The DEC ANSI keypad reference is the VT100 guide table 3-8. Test numeric (`ESC >`) and application (`ESC =`) modes independently from cursor mode (`CSI ?1l/h`).

| Input | Numeric/normal output | Application output |
| --- | --- | --- |
| Numpad 0–9 | `0`–`9` | `ESC Op` through `ESC Oy`, respectively |
| Keypad minus, comma, period | `-`, `,`, `.` | `ESC Om`, `ESC Ol`, `ESC On` |
| Keypad Enter | CR, with newline mode reset | `ESC OM` |
| PF1–PF4 | `ESC OP`, `ESC OQ`, `ESC OR`, `ESC OS` | Same |
| Up, Down, Right, Left | `ESC [A`, `ESC [B`, `ESC [C`, `ESC [D` | `ESC OA`, `ESC OB`, `ESC OC`, `ESC OD` |

The installed keyboard source maps unmodified PC F1–F4 to those PF1–PF4 bytes. Label that as **PC F1 → DEC PF1**. On an actual VT220, top-row F1–F5 perform local functions and emit no codes; PF1–PF4 are separate keys. [DEC VT220 keyboard tables](https://vt100.net/docs/vt220-rm/chapter3.html)

Keypad tests must set `code:"Numpad1"`, `location:3`, and the browser's corresponding key/keyCode, then test NumLock on/off and macOS. An on-screen DEC keypad should use the same encoder. Avoid mapping an ordinary top-row digit into a keypad application sequence. Confirm keypad Enter differs from ordinary Return. The baseline keyboard evaluator accepts application **cursor** mode, not application **keypad** mode; storing the keypad flag does not prove byte generation.

Backspace is a separate input test: installed xterm emits DEL (`7f`) by default and BS (`08`) for Ctrl+Backspace. The Delete key normally sends `ESC [3~`. A profile may choose BS versus DEL, but label the choice and assert emitted bytes; neither implies that receiving DEL erases a displayed cell. Return emits CR in the inspected keyboard source. If implementing DEC newline mode, separately test outbound Return=CR/LF and received LF=CR/LF; toggling xterm `convertEol` alone only covers the latter.

## VT52 negative and future-profile fixtures

`InputHandler.ts` marks DECANM reset parameter 2 unsupported. Probe:

```text
Input:  ESC [ ? 2 l ESC Y 22hex 24hex X
JS:     "\x1b[?2l\x1bY\x22\x24X"
VT52-compatible expectation: X at row 3, column 5; cursor (3,6).
Observed xterm6 baseline: row 1 contains literal " $ X without intervening spaces;
                         i.e. the string '"$X'; cursor (1,4).
```

Direct VT52 address bytes are `0x20 + zeroBasedRow`, `0x20 + zeroBasedColumn`, not decimal text. A future adapter must retain state when ESC/Y/row/column arrive in separate chunks. At minimum test ESC A/B/C/D movement, ESC H home, ESC J/K erase, ESC I reverse line feed, ESC F/G graphics/ASCII, ESC Y address, ESC Z identification, ESC `=`/`>` keypad, and ESC `<` return to ANSI. In the DEC VT100 VT52-compatible dialect, arrows send ESC A/B/C/D; PF1–PF4 send ESC P/Q/R/S; application keypad digits send ESC `?p`–`?y`, Enter ESC `?M`. Identity must match the deliberately chosen profile, not be invented from the renderer version. [DEC VT100 VT52 compatibility specification](https://vt100.net/docs/vt100-ug/chapter3.html)

Until such a translator exists and passes fixtures, show VT52 as unavailable. A cosmetic profile selector or ANSI arrows do not make VT52 work.

## Partial VT220 and encoding boundary

The insertion, deletion and character-protection vectors above passed, but DECSCL is explicitly unsupported in the installed source. Do not infer VT220 conformance from those operations. DEC multinational characters, downloadable characters, user-defined keys, operating-level transitions and full 7/8-bit response behavior remain unverified or unavailable. DEC editing keys and PF keys should be tested separately from PC function keys. [DEC VT220 received-code specification](https://vt100.net/docs/vt220-rm/chapter4.html)

Observed encoding distinction with a fresh 10×5 terminal:

| Input API | Input | Observed result |
| --- | --- | --- |
| UTF-16 string | `"ABC\u009b2JZ"` | Screen cleared; Z at (1,4); cursor (1,5). |
| Byte array | `[65,66,67,155,50,74,90]` | Row 1 `ABC2JZ`; cursor (1,7). Raw `9b` is not treated as CSI. |

This matches the API's UTF-8 byte-input contract. Select an explicit stream decoder before xterm when a fixture uses DEC 8-bit bytes. A simplistic Latin-1 conversion does not implement DEC multinational graphics, so initially prefer a documented 7-bit subset. Telnet BINARY negotiates transport byte transparency; it does not select UTF-8 or DEC character encoding. [xterm encoding](https://xtermjs.org/docs/guides/encoding/), [RFC 856](https://www.rfc-editor.org/rfc/rfc856.html)

## Offline Telnet adapter fixtures

These are recommendations, not tests run against the baseline wrapper. Keep Telnet parsing in a byte-oriented transport adapter before terminal decoding. Use in-memory streams or loopback fixtures only.

| Case | Wire input / action | Required fixture outcome |
| --- | --- | --- |
| NVT newline | `41 0d 0a 42` | Terminal payload `A\r\nB`: B at (2,1). |
| NVT carriage return | `41 0d 00 42` | Terminal payload `A\rB`: B replaces A at (1,1); no NUL displayed. |
| Literal IAC | `41 ff ff 42` | Payload bytes `41 ff 42`; neither FF dropped nor interpreted as a command. Screen result belongs to the chosen character decoder. |
| Unknown DO | `ff fd 63` | Reply `ff fc 63` (WONT option 99); no terminal characters. |
| Unknown WILL | `ff fb 63` | Reply `ff fe 63` (DONT option 99); no terminal characters. |

Also test CR and following LF/NUL split across reads, IAC split at every boundary, and control bytes interleaved with printable payload. Bound incomplete subnegotiation storage and report truncated commands at EOF. [RFC 854](https://www.rfc-editor.org/rfc/rfc854.html)

For BINARY, start disabled; after a successful WILL/DO exchange for one direction, retain `0d 00` in that direction's payload rather than NVT-normalizing it. The reverse direction remains independently negotiated. IAC still doubles even in binary mode. [RFC 856](https://www.rfc-editor.org/rfc/rfc856.html)

For optional NAWS, after WILL/DO option 31, 80×24 is `ff fa 1f 00 50 00 18 ff f0`; width 255 requires doubled FF: `ff fa 1f 00 ff ff 00 18 ff f0`. Stop sending size updates after DONT; debounce FitAddon changes. [RFC 1073](https://www.rfc-editor.org/rfc/rfc1073.html)

For optional TERMINAL-TYPE, after agreement on option 24, SEND=`ff fa 18 01 ff f0`; a selected VT100 fixture profile's IS response is `ff fa 18 00 56 54 31 30 30 ff f0`. Only advertise implemented profiles; do not claim VT220 or VT52 just because a dropdown exists. [RFC 1091](https://www.rfc-editor.org/rfc/rfc1091.html)

For stateful negotiation, test duplicate accepted WILL/DO without repeated acknowledgments, crossed enable/disable requests, rejection followed by unchanged policy, and reconnect resetting both directions. The Q method is a useful design reference, not a replacement protocol standard. [RFC 1143](https://www.rfc-editor.org/rfc/rfc1143.html)

## Actionable acceptance priorities

1. Preserve full terminal input sequences at the session boundary; isolate the line-oriented command mock from raw terminal fixtures. Assert observer input, paste, keypad and function keys never reach a writable transport.
2. Turn the passing buffer probes into deterministic automated tests, with explicit geometry and chunk-boundary cases. Add browser tests for keyboard events and one DEC graphics visual check; buffer correctness alone cannot prove glyph rendering or focus behavior.
3. Test a profile-driven keypad encoder and the PC F1→PF1 mapping. Leave VT52 unavailable until a dedicated stateful adapter exists. Describe the available VT220 feature subset rather than naming the whole terminal model without qualification.
4. Keep Telnet, terminal character decoding, renderer parsing, and keyboard ownership as distinct test layers. Device-status replies also use `onData`; determine whether one authoritative session endpoint, rather than every observing browser, is responsible for them. Prevent duplicate replies from multiple viewers.
5. Reconnect must not replay queued keystrokes, paste, partial command lines, or stale ownership tokens. Decide explicitly whether reconnect restores parser state from a session snapshot or starts a fresh terminal; replaying visible text alone cannot restore graphics sets, margins, modes or cursor state.

No live guest editor, OS terminal driver, actual DEC hardware, physical keyboard matrix, macOS browser keypad behavior, or remote terminal session was validated by this research. Those limits should remain visible in milestone claims.
