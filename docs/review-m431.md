# M4.3.1 presentation review

17 November 2026. Baseline: `checkpoint/m4.3`, commit `a30303942dec8b7213dbde20c63c43e0d7a565da`. This checkpoint is presentation polish; application functionality remains M4.3 (`package.json` version `0.4.3`).

## Changes

- Refined the existing shared SVG paddle faces, curved lower lips, raised side shading, and highlights. A slightly fuller face reduces the gaps without moving switch centers. All pigments share geometry; nine reusable color/pose definitions and the existing path count remain unchanged.
- Preserved 22 register positions, seven function paddles, cream lamp test, numbering, pigments, momentary behavior, keyboard/mouse/touch mapping, and accessibility semantics. Fitted the S BUS CYCLE legend within its existing cell.
- Derived About and footer version text from `package.json`; expanded About to fit credits, keyboard shortcuts, and accurate local/mock behavior. Passive-observation wording remains conditional on the actual adapter.
- Removed repetitive rights-review prose while preserving original notices, artwork, credits, and independent-project identification.
- Changed routine test screenshot names so later runs do not overwrite the accepted M4.3 images.

The requested root-level `WebDesktop/bottom-switches.png` was absent. The supplied parent-project photograph matched the retained `docs/references/bottom-switches.png`; that retained reference was used. IMSAI lighting was secondary inspiration only. Unseen pivot geometry and uncalibrated colors remain approximations.

## Visual evidence

[Before and after](screenshots/m431-before-after-switches.png), [photo beside application](screenshots/m431-switch-side-by-side.png), [matching/up/down positions](screenshots/m431-switch-comparison.png), [details](screenshots/m431-paddle-details.png), [function paddles](screenshots/m431-function-paddles.png), [full panel](screenshots/m431-full-panel.png), [compact panel](screenshots/m431-compact-panel.png), [desktop](screenshots/m431-desktop.png), [devices](screenshots/m431-devices.png), and [About](screenshots/m431-about.png) are actual application captures. Baseline comparison geometry is extracted from the preserved M4.3 tag. The original photograph is unchanged.

Visual review covered rounded lips, UP/DOWN distinction independent of color, normal and compact scale, complete legend visibility, logo rendering, and truthful simulation labels. Capture scripts wait for image decoding and settled layout. No guest session or live connection was fabricated.

## Validation

| Check | Result |
|---|---|
| TypeScript static check | Pass |
| TypeScript unit suite | 41 passed |
| Transport integration fixture | 1 passed |
| Go race suite, all packages | Pass (unchanged Go results reused from valid test cache) |
| Playwright: Chromium, Firefox, WebKit | 33 passed |
| Browser-only standalone and embedded mock service | Covered by browser suite |
| Mac and static Linux ARM64 build | Pass; ARM64 not run on Pi |
| Controls, keyboard, touch, reconnect, observer labels | Existing cross-browser regressions pass |
| About/version/credits/mock distinction | New cross-browser test passes |

Only routine screenshot output paths changed after the full browser run; no assertion or application behavior changed afterward. Native Safari was not automated. Existing M4/M4.1 lab safety cases and all Go/control/transport sources remain unchanged. Long-running laboratory and browser workloads were not repeated for presentation changes; previous measurements retain their original scope.

## Boundaries and companion documents

The pre-Oscar installation guide, evidence appendix, and email draft live outside this Git repository, in the parent project's documentation directory. Original working records were retrieved read-only with explicit user authorization and checked privately on the Mac. This was not a new Pi test or integration milestone. No services, GPIO, guest disks, or official installation were changed; no email was sent or content published.

The local review package records guide fixture checks, source versions, and remaining gaps. Physical-panel validation, fresh-card tutorial reproduction, power diagnosis, and production control safety remain unresolved. Original M4.3 checkpoints, notices, artwork, and safety evidence are preserved.
