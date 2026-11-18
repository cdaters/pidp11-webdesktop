# M4.3.2 — continuous-form LP0 presentation

17 November 2026. Based on `checkpoint/m4.3.1` (`59b52eb`). This is a local browser presentation checkpoint; the functional desktop version remains M4.3 / package 0.4.3. No Pi access, deployment, emulator, GPIO, RPC, ownership or terminal-arbitration work is included.

## What changed

The printer window now gives most of its area to a continuous strip of tractor-feed paper. CSS draws paired punched margins, warm-white/pale-blue rows, fine blue rules, paper edges and a restrained shadow. Perforations appear every 66 display rows without turning the pages into separate cards. Ink, stripes, holes and perforations use the same fixed 18-pixel pitch. Perforation overlays do not change the line box or move text.

The supplied IMSAI screenshot informed the paper treatment; no source, proprietary listing, asset or browser chrome was copied. The diagnostic demonstration is original illustrative text, not assembled code or a guest result. Existing burgundy/cream window controls, simulation badge, window manager, resize/minimize/maximize/fullscreen behavior and accessibility conventions remain in place.

`src/printer.ts` owns pure display pagination and the paper viewer. `src/printer-app.ts` connects it to the existing queue through callbacks. `VirtualDevices` and its spool format are unchanged. The printer's DOM is updated in place so unrelated application refreshes preserve reading position, keyboard focus, sample/column choices and queue disclosure state. Closing the window disconnects its resize observer and pending animation callback.

## Data and navigation contract

- The default paper is 80 columns; 132 is available. These are minimum presentation widths, not output truncation limits. Longer lines widen the paper and scroll horizontally; they never wrap.
- Monospaced Courier typography preserves leading spaces and blank rows. Tabs expand to the next eight-column stop for display. CRLF and lone CR display as line breaks. Form feed always moves to the next page, retaining blank-page advances. This is not an impact-printer overstrike emulator.
- Pagination includes the existing job headers and separators. It never inserts characters into the source spool. Download still returns the original complete spool, including tabs, CR/LF, form feeds and job separators.
- First output opens at the heading. Later output follows when the reader is already at the end; scrolling back stops following. **Top** and **Latest output** provide explicit navigation. The final page has a short blank tail so the newest printed lines remain visible.
- Focus the paper to use arrows, Page Up/Down, Home and End. Explicit keyboard handling also supports WebKit, whose native focused-region horizontal scrolling differed in testing. Smooth jumps respect reduced-motion preferences; extremely large compressed scroll ranges use immediate jumps.
- The page indicator describes the page at the top of the viewport. The viewport can show parts of two pages at once.
- An empty spool displays blank paper and a subtle ready indicator. Queueing alone does not print. Printing, repeat printing, clearing, download naming and all original queue bounds are preserved.

The inherited limit is 32 jobs and a `text.length` maximum of 16,384 per job (JavaScript string code units, historically labeled 16 KiB). This revision does not silently change that unit or the spool's extra job-header/separator bytes. Sample listings fit that existing limit.

## Long output and measured scope

Only visible rows plus a small overscan are mounted; holes and stripes use CSS rather than additional per-hole nodes. Blank rows and blank pages are implicit. A maximum eight-million-pixel scroll surface avoids browser layout limits for pathological form-feed-heavy jobs; the logical position is mapped to the full listing. At extreme lengths the scrollbar is necessarily coarse. Use the complete raw download for archival search, selection or exact external inspection. Browser text selection covers mounted rows, not an invisible full-spool document.

A short Chromium measurement on the development Mac filled all 32 job slots with maximum-size dense, newline-heavy and form-feed-heavy fixtures. Each had 525,149 spool code units including headers/separators. The 600-pixel viewer mounted **37 rows** in every case. Parsing measured approximately **3–6.9 ms**, and update/render setup **3.4–7 ms** in that single run. The largest logical listing was 524,320 pages while its physical scroll surface remained bounded. These are local responsiveness observations, not CPU/RSS acceptance measurements on a Pi or sustained benchmarks. See [recorded measurements](printer-m432-measurements.json); reproduce with `node scripts/measure-printer.mjs` against the local preview.

## Optional browser printing

A simple print stylesheet cannot print the complete listing because the screen intentionally mounts only visible rows. Printing that DOM could silently omit most output, and unusually long lines cannot fit a physical page without a scaling/orientation policy. A separate paginated print projection would be the appropriate future addition. It is deferred here; no Print/Save-as-PDF feature is advertised. Use **Download spool** for the full original text. Ordinary browser printing of the desktop is not a supported listing export.

## Verification and visual evidence

- TypeScript static check and **45 unit tests** pass, including four new printer tests.
- Existing transport integration fixture passes; Go race checks pass for all packages (unchanged Go results may use valid cache).
- **42 browser tests** pass across Chromium, Firefox and WebKit, including nine focused printer cases and printer smoke checks in both the embedded Go and self-contained offline builds.
- Tests cover blank paper, row pitch/shading/holes, spaces/tabs/newlines/form feeds, no wrapping, byte-exact download, keyboard/focus, queue limits/lifecycle, reading-position preservation, follow-at-end, resize/maximize, escaped text, bounded DOM and extreme scroll ranges. Capture runs report no browser-console errors.
- Mac and static Linux ARM64 builds pass. No ARM64 executable was run on the Pi. Native Safari was not automated. Existing safety experiments and prior screenshots/checkpoints remain unchanged; no long integration workload was repeated.

Screenshots are actual local application captures:

1. [Empty tractor-feed paper](screenshots/m432-printer-empty.png)
2. [Short sample](screenshots/m432-printer-short.png)
3. [Dense original diagnostic listing](screenshots/m432-printer-dense.png)
4. [Continuous pages and perforation](screenshots/m432-printer-pages.png)
5. [Maximized workspace](screenshots/m432-printer-maximized.png)
6. [132-column paper](screenshots/m432-printer-132-columns.png)
7. [Compact window](screenshots/m432-printer-compact.png)
8. [Before and after](screenshots/m432-printer-before-after.png), with the [unchanged baseline capture](screenshots/m432-printer-before.png)

`node scripts/review-printer-captures.mjs` reproduces the new captures using the real controls and keyboard resize handle. The before image was captured from the accepted M4.3.1 application before editing; the comparison combines the two actual captures in a simple HTML layout.

## Changed files and demonstration readiness

Application files: `src/printer.ts`, `src/printer-app.ts`, `src/main.ts`, `src/style.css`. Tests: `tests/printer.test.ts`, `browser-tests/printer.spec.ts`, and printer assertions in `browser-tests/artifacts.spec.ts`. Supporting work: the two capture/measurement scripts, this report, measurements JSON, README and nine separate M4.3.2 screenshots.

Suitable for the Oscar demonstration as an explicitly simulated LP0 viewer. The prior Oscar review package is preserved unchanged; these new screenshots are available separately. No real guest printer connection, physical printer fidelity, overprinting, full Unicode cell-width model, browser print export or production integration is claimed.
