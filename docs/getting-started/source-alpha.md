# Try the source alpha on your own computer

This short path opens a simulated desktop. It needs no Pi, historical disk image,
model or remote service. The commands below run in your **Mac development shell**;
compatible Linux/Windows development is possible but is not the recorded M5.13
clean-checkout environment.

1. Verify Node.js 22.18 or newer with npm:

   ```sh
   node --version
   npm --version
   ```

2. Download **`pidp11-webdesktop-m5.13-source-alpha.1.tar.gz`** and **`SHA256SUMS`**
   from [M5.13 Source Alpha 1](https://github.com/cdaters/pidp11-webdesktop/releases/tag/v0.5.13-source-alpha.1)
   into a new directory. Use this named, qualified tarball rather than GitHub's
   automatic “Source code” archives. In a Mac shell opened in that directory,
   verify its checksum:

   ```sh
   shasum -a 256 -c SHA256SUMS
   ```

   Expect the tarball name followed by `OK`. Stop on any error. Its expected size
   is **14,663,932 bytes** and its SHA-256 is
   `24fb624d4242972410c9f44616c74af6d89383bc7fb7b931b0a2e78cd9788f08`.
   Inspect the archive before extraction:

   ```sh
   tar -tzf pidp11-webdesktop-m5.13-source-alpha.1.tar.gz
   ```

   Expect 908 files beneath `pidp11-webdesktop-m5.13-source-alpha.1/`, without
   absolute paths or `..` components. Extract only in this new directory, then
   verify the inner inventory:

   ```sh
   tar -xzf pidp11-webdesktop-m5.13-source-alpha.1.tar.gz
   cd pidp11-webdesktop-m5.13-source-alpha.1
   shasum -a 256 -c SOURCE_SHA256SUMS
   ```

   Expect every entry to report `OK`; stop on any mismatch. `SOURCE.json` records
   version `m5.13-source-alpha.1` and source revision
   `ef643e59e5040adcbf7f7b1286fe3472ff08a00f`. Checksums detect changed bytes;
   they are not signatures. Install the locked development dependencies:

   ```sh
   npm ci
   ```

   This step uses the network; it does not install a system service. No Go,
   container, model or historical guest setup is needed for this demonstration.

3. Start the local preview:

   ```sh
   npm run dev
   ```

   Open the loopback address it prints, normally `http://127.0.0.1:5173`.
   If that port is busy, Vite may choose another; do not stop an unrelated service.
   Keep this developer preview on loopback. It is not an Internet-facing server.

4. Open **Terminal**, acquire its keyboard and type `HELP`. Try the panel's
   simulated controls, a sample **Line printer** job, and the reference desk's
   `/calc 16 oct 177776`. Look for simulation labels. **Guest terminal** requires
   a separately prepared genuine guest and will not become connected merely by
   selecting an operating-system name. No simulated media control writes a disk.

5. In another shell in the same checkout, verify/build the standalone artifact:

   ```sh
   npm run check
   npm test
   npm run build
   ```

   `dist/prototype.html` is the self-contained offline demonstration. Its policy
   prevents network connections. Keep it separate from the authenticated genuine
   guest service, which is a different operating mode.

6. Stop the preview with Ctrl-C in its shell. Reloading its URL should fail once
   it is stopped. Close any offline artifact tabs separately. No autostart, account,
   host configuration or Pi setting was installed.

7. For removal, preserve any source changes or downloaded listings you want,
   then move this **specific new source directory** to the Trash using Finder. That removes
   its `node_modules` and build output too. Do not remove your original project,
   unrelated checkout or any guest disk. Browser preferences can be cleared through
   that site's browser settings. npm/browser development caches are separate and
   can remain for other projects.

## Prefer a Git checkout?

With Git installed, the equivalent release source can be selected explicitly:

```sh
git clone https://github.com/cdaters/pidp11-webdesktop.git
cd pidp11-webdesktop
git checkout --detach v0.5.13-source-alpha.1
git rev-parse HEAD
```

Expect `ef643e59e5040adcbf7f7b1286fe3472ff08a00f`, then run `npm ci` and continue
at step 3. The archive's added `SOURCE.json` and `SOURCE_SHA256SUMS` are packaging
metadata, not files in the Git tree. Later documentation commits on `main` do not
change this release or its tag. [Publication verification](../releases/M5.13-publication.md).

## Automated checks and optional backend

Go 1.25 or newer is needed only for backend/tests. The development guide explains
[building the mock Go service and running all three browser engines](../technical/development.md).
Install test engines explicitly with `npx playwright install`; Linux may also need
the platform libraries named by Playwright. Engine installation can use a large
shared cache. A fresh `npm ci` alone does not install those browser binaries.

`npm run test:browser` requires both the Vite preview and mock Go server. The
standalone artifact is tested separately from a live guest. Do not confuse mocked
network fixtures with real UNIX, RT-11 or RSX output.

## Genuine guests are an advanced, separate path

Follow [the M5.0 runbook](../lab/M5.0-runbook.md) and
[M5.13 lab notes](../../lab/m513/README.md) only with authorized, verified disposable
media. The recorded lab requires an ARM64 Mac with OrbStack/Docker, Python 3,
original pinned SIMH and extra build tools. It is not a generic Windows or Linux
installation recipe. Disks, models and private credentials are not in the source
alpha. Original console access, guest-safe shutdown and immutable-base checks
must be established before browser use.

If dependencies fail, check the Node version and the network/proxy/npm error before
retrying. If the page is blank, inspect the actual printed URL and browser console.
An unavailable genuine line calls for checking the separately owned lab, not
starting a Pi or bypassing service approval. Report reproducible problems through
[the contribution guide](../../CONTRIBUTING.md), with private data removed.

Development source after M5.13 also provides `npm run doctor` and focused
[setup diagnostics](alpha-troubleshooting.md). That command and the M5.14 service
corrections are not present in the immutable release archive above.
