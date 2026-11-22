# Try the source alpha on your own computer

This short path opens a simulated desktop. It needs no Pi, historical disk image,
model or remote service. The commands below run in your **Mac development shell**;
compatible Linux/Windows development is possible but is not the recorded M5.13
clean-checkout environment.

1. Verify Git and Node.js 22.18 or newer with npm:

   ```sh
   git --version
   node --version
   npm --version
   ```

2. Clone into a new directory and install the locked development dependencies.
   This step uses the network; it does not install a system service.

   ```sh
   git clone https://github.com/cdaters/pidp11-webdesktop.git
   cd pidp11-webdesktop
   git rev-parse HEAD
   npm ci
   ```

   For an exact approved candidate, use its recorded commit rather than assuming
   that a later `main` has identical behavior. An extracted source archive can
   skip cloning: verify its checksums and use its `SOURCE.json` identity instead.

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
   then move this **specific new clone** to the Trash using Finder. That removes
   its `node_modules` and build output too. Do not remove your original project,
   unrelated checkout or any guest disk. Browser preferences can be cleared through
   that site's browser settings. npm/browser development caches are separate and
   can remain for other projects.

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
