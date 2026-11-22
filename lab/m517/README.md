# M5.17 candidate qualification

Use a new private working directory on the Mac. This is source-release preparation,
not a Pi procedure. No new tag or release is created. The source packager requires
a clean committed checkout; it never includes ignored disks, builds or credentials.

```sh
python3 lab/m517/archive_test.py
python3 packaging/source-alpha.py m5.17-source-alpha.2 /absolute/new/candidate-a
```

Record the printed revision, SHA-256, size and member count. Repeat from an
independent clean clone of that exact revision into a second fresh destination.
Compare archive bytes, `inventory.sha256` and `SOURCE.json`. Reproducibility is
qualified for the recorded Python/zlib toolchain, not arbitrary future compressors.
Use the expected checksum and revision from the separately reviewed candidate
record with `packaging/verify-source-alpha.py ARCHIVE SHA256 REVISION`. It checks
regular safe paths, bounded size/count, fixed metadata, native-file signatures,
required notices and complete internal hashes. It does not extract or install,
and its checksum is not a cryptographic signature or a complete privacy review.
Inspect tracked contents and provenance separately before publication.

Extract only the verified archive into a new directory using Python's `data`
filter or an equivalently checked regular-file extraction. Verify
`SOURCE_SHA256SUMS`, then follow the [candidate quick start](../../docs/getting-started/source-alpha-2.md).
Run doctor once before installation to verify its missing-package guidance, then
`npm ci`, doctor, type checks, units, Go vet and the uncached race suite.

The [M5.16 runner](../m516/review_checks.py) must still validate all 21 invariants
and 47 names against the extracted source. Execute it, the uncached Go/Node TLS
probe, nine independent-client and six optional-route cases. Keep actual Linux
process/ownership evidence distinct using the restricted review image described
in the [M5.16 runbook](../m516/README.md#linux-review-without-simh). Run the native
status controls there; these deliberate failures are not recurrence of old faults.

Start the extracted preview on an available owned loopback port 5175 or 5176, then:

```sh
node lab/m517/onboarding.mjs http://127.0.0.1:5176 /absolute/new/onboarding.json
```

This executes all three engines with no API interception: fixture HELP, sample
printer, offline reference search and exact arithmetic. It rejects outside-origin
HTTP requests. Install Playwright engines separately if absent; they are test
requirements, not demo requirements. Stop the exact preview and verify its port
closes. The full browser suite uses the established preview/mock service on
5173/8080 and preserves screenshot baselines in the main checkout.

Build the candidate's static runtime privately with `GOFLAGS=-buildvcs=false` and
`packaging/build.sh` into a fresh directory. No executable is a release asset.
Follow the [existing genuine guest procedure](../m516/README.md#genuine-guest-and-plotting-comparison)
using this runtime and harnesses from the extracted candidate, new verified media
copies and unique result paths. Keep V7 campaigns exclusive; use bounded plots
and stop on uncertain output. Stop actual bridges before guest-safe shutdown.

For ARM64 memory enforcement, use a new owned QEMU copy of the prior clean
ext4 diagnostic disk and the candidate runtime. Preserve the 96 MiB/zero-swap
limits, unbounded-start refusal and detached startup. No broad provisioning loop
is needed. Export results before removing the owned container; retain any failure.
Do not modify the old evidence disk or the actual Pi.

Final documentation records actual execution and corrected attempts. Recheck
all original media, release metadata/assets and remote tags, and remove only owned
stopped resources. Publish source/docs to main only; Craig must separately approve
the exact archive and release-note text before any Alpha 2 tag/upload/release.
