# PiDP-11 Web Desktop ARM64 candidate

This is a laboratory candidate, not an accepted production deployment or a complete installation of Oscar's PiDP-11 software. Read COMPATIBILITY.json for the exact source revision. RELEASE-NOTES.md is the matching source report; its relative links resolve in that repository revision.

Verify the external archive checksum before extraction, then run `sha256sum -c PACKAGE_SHA256SUMS` inside the extracted directory. Checksums are not signatures. Start with the read-only `sh preflight.sh`; it changes no files or services and never executes Oscar's programs.

The executable needs Linux ARM64 and the enforced kernel memory controller. The service remains optional, initially stopped and disabled, and starts detached. No runtime Node, database or container is needed. Do not use this package to bypass unresolved hardware, guest identity or memory-containment gates.

Setup paths, HTTPS/authentication, updates, rollback and removal:
https://github.com/cdaters/pidp11-webdesktop/blob/main/docs/getting-started/installation-paths.md

For the exact matching documentation, replace `main` with the `source_revision` from COMPATIBILITY.json. The existing original PiDP-11 installation and independent console/physical operation are prerequisites and fallback; this package neither installs nor controls them.
