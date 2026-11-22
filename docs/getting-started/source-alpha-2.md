# Try the Source Alpha 2 candidate locally

This candidate is for local demonstrations and controlled historical-computing
laboratories. **It is not a supported PiDP-11 physical-hardware installation.**
It has not been published as a release. Craig must approve its exact archive and
release description first. The published [Alpha 1 guide](source-alpha.md) still
points to that unchanged release.

The basic demonstration needs Node.js **22.18 or newer** with npm. Go, Docker,
Python, guest disks, a Pi and an AI model are not required to use it. Use a new
folder for the supplied `pidp11-webdesktop-m5.17-source-alpha.2.tar.gz` and
`SHA256SUMS`; do not unpack over an existing project or guest-media directory.

In a **Mac shell**, from that new folder:

```sh
node --version
npm --version
shasum -a 256 -c SHA256SUMS
tar -tzf pidp11-webdesktop-m5.17-source-alpha.2.tar.gz
```

Stop if the checksum fails. The checksum detects changed bytes; it is not a signed
identity. Compare it with the separately supplied approved candidate record. The
archive listing must contain only ordinary source files under
`pidp11-webdesktop-m5.17-source-alpha.2/`, no absolute paths, `..` components,
links, disks or executables. The maintainer's validator checks those properties
before distribution; do not extract an untrusted replacement.

```sh
tar -xzf pidp11-webdesktop-m5.17-source-alpha.2.tar.gz
cd pidp11-webdesktop-m5.17-source-alpha.2
shasum -a 256 -c SOURCE_SHA256SUMS
cat SOURCE.json
npm ci
npm run doctor
npm run dev
```

Stop on any failed command. `SOURCE.json` records the exact revision. `npm ci`
requires network access to obtain the locked packages; it does not install a guest
or model. Before dependencies are installed, `npm run doctor` deliberately names
missing packages and asks for `npm ci`. If Node/npm is missing, install/select the
required toolchain before proceeding. Do not bypass the prerequisite check.

Open the actual loopback URL printed by the preview, normally
`http://127.0.0.1:5173`. A busy port may select another; do not terminate an unrelated
service. Restore the DEC terminal, acquire its keyboard and type `HELP`. This is a
labeled local fixture, not UNIX. Open Line printer, add a sample job and print the
queue. Open AI Companion, expand Search historical references and search for
`PDP-11/70 virtual physical architecture`;
then enter `/calc 16 oct 177776` for decimal 65534 / hex FFFE. These paths need no
model or guest. Disk, tape and front-panel controls are simulations.

Stop the preview with Ctrl-C in its shell. Reloading its URL must fail. Close any
separately opened offline artifact tab. No system service or autostart was installed.
For removal, preserve your edits/downloads and move only this new extracted folder
to Trash. Browser preferences and shared npm/browser caches are separate.

For a portable offline demonstration after dependencies are installed, run
`npm run build` and open `dist/prototype.html`; it remains a simulation. For backend
or automated browser development, use the [development guide](../technical/development.md).
Genuine guests require separate authorized disposable media and the
[advanced laboratory runbook](../../lab/m516/README.md). They are not part of this
beginner setup. See [troubleshooting](alpha-troubleshooting.md) and
[limitations](../known-limitations.md); report your revision, environment and
sanitized reproduction through [CONTRIBUTING](../../CONTRIBUTING.md).
