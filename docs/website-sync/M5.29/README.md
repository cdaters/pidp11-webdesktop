# M5.29 — local RetroRealm page review

**Staged locally only. No production deployment or announcement.** This packet
contains focused edits to the four existing PiDP-11 Grav pages, an exact text diff
and before/after hashes. It does not include site configuration, accounts, plugins,
private backups or a deployment helper.

The ordinary DDEV checkout was located through its existing container labels. It
contains starter pages, not the PiDP-11 project. The separately established
PiDP-11 editorial review workspace contains the actual four pages, published-image
copies, theme and earlier deployment records. Its build-log hash matches the
recorded approved M5.19 deployment. It is a trustworthy **retained local baseline**;
it is not a new production synchronization. No production connection was made.

A separate private clone now serves the review at:

- <http://127.0.0.1:8899/projects/pidp-11>
- <http://127.0.0.1:8899/projects/pidp-11/build-log>
- <http://127.0.0.1:8899/projects/pidp-11/architecture>
- <http://127.0.0.1:8899/projects/pidp-11/gallery>

These are owner-local preview addresses, not public links. The existing DDEV site
and earlier review workspace were not edited. The new PHP site is on a separate
internal container network; a narrow fixed-backend proxy exposes only the local
review port. It has no production credentials configured by this task, no mail
sender and no guest/simulator/physical-Pi connection. Existing private site files
remain local and are excluded from this packet. Sensitive filesystem routes are
blocked by the review router.

## What changed

| Page | Focused change | Preserved material |
|---|---|---|
| Project | Explain genuine RSX/RT-11 peripherals, storage captures, V7 communications and isolated BSD Ethernet; identify Alpha 3 as preparation | Alpha 2 release notice, origin story, physical-machine-first section, repair state, credits |
| Build log | Add dated M5.20–M5.29 progress and update forward-looking peripheral paragraph | All earlier dated milestone entries, personal chronology and physical photographs |
| Architecture | Separate ordinary observations from lab TM11/Ethernet; explain genuine guest subsets and proposed 0.2 interoperability | Independent-console/physical paths and original architecture discussion |
| Gallery | Add current retained-printer/disconnected-modem views, preserved genuine serial capture and Ethernet evidence link | Existing original images, captions, historical photos and credits |

[Exact page diff](page-changes.diff) · [Page hashes](pages-manifest.json) ·
[Image inventory](images.json) · [Application provenance](../../screenshots/m529/provenance.json).
`pages/` contains only the four proposed Grav source pages. Images are referenced
from existing repository screenshot paths and copied unchanged to the private stage.

The Ethernet SVG is an explanatory diagram of the actual M5.28 topology, not a
live networking screenshot. The new printer picture imports an unchanged retained
RSX spool into the local viewer; its caption does not claim a new guest session.
The current modem picture is disconnected. Older genuine serial/paper-tape captures
retain their evidence gaps rather than being relabeled as current observations.

## Before any later deployment

A future, separately authorized publisher must compare all four baseline hashes
with the then-current authoritative production files, preserve any newer edits,
and reconcile the image manifest. This local packet cannot authorize overwriting
production. It is not appropriate to infer current production content from the
old HTTP 403 or from this retained local copy. The [M5.29 report](../../lab/M5.29.md)
records actual local rendering checks and the source-candidate decision.
