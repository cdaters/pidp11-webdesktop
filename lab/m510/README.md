# M5.10 presentation capture procedure

This is a bounded **Mac development** procedure for actual application screenshots, not a new deployment or full regression campaign. Read the [M5.10 report](../../docs/lab/M5.10.md), [M5.9.2 laboratory prerequisites](../m592/README.md) and [BSD preparation](../m591/README.md#211bsd-full-screen-application) first. Original SIMH and verified public disposable media are required. Never use Pi or production disks.

## Equipment workspace and terminal presentations

1. Preserve existing captures and evidence. Prepare fresh V7 base/working copies with the existing `lab/m50/prepare.py` helper. Set absolute `PIDP551_WORK` and `PIDP551_PACKAGE` paths. M5.10 used the exact Phase D package whose hash is in the report; a fresh build must identify its own revision.
2. Follow the M5.9.2 `service-options.json` example with **only** its two `device_followers`. Omit the entire `companion` object and do not start the provider fixture. Verify the fixed container name `pidp11-m551` and loopback port 8445 are free before starting `lab/m591/run.sh` and `lab/m551/forward.py` in retained sessions.
3. Start only the original diskless device producer: `docker exec pidp11-m551 python3 -u /lab/m592/devices-live.py`. Wait for its readiness record; stop at any error. The separate V7 guest supplies text/plots, while this CPU program supplies the device bytes.
4. Run the capture helper in the Mac shell:

   ```sh
   M592_DEMO_ENGINE=chromium node lab/m510/equipment.mjs
   ```

   The helper deliberately retains the established M592 environment names. It drives three device phases, verifies exact completed downloads and finishes the diskless producer. It captures the first live device phase in `docs/screenshots/m510/`. Do not rerun a phase after a timeout without inspecting evidence.
5. An optional `M592_COMPLETED=1` invocation of the same command rechecks completed bytes and recaptures only the hero without restarting the finished producer. It still uses genuine V7 text and plotting. This is the published M5.10 hero.
6. With the V7 service still running, run `node lab/m510/terminal-captures.mjs` for fresh VT52 and ASR-33 presentation captures. Each explicitly detaches/approves its lab line, logs into V7 if needed and releases the keyboard before capture. The teletype screenshot records arriving output, not completion of an entire directory listing.
7. Stop the actual bridge and shut down V7 through the existing harness:

   ```sh
   node --input-type=module -e 'import {harness} from "./lab/m59/harness.mjs"; console.log(await harness("shutdown"));'
   ```

   Require the three syncs, owned simulator stop/quit and container exit. Stop only the verified task-owned relay. Recheck immutable bases/archive and preserve modified disposable disks privately.

## BSD editor

Follow the existing BSD inventory procedure with a fresh extracted base, independent working copy and a distinct network-none container. M5.10 used `pidp11-m510-bsd` and the existing original RQ/DZ configuration. Issue `unix`, `mount /usr` and the multiuser transition only after observing the appropriate actual console prompts. Use the existing private loopback 8446 relay pattern with that exact owned container.

The service config and control socket must be inside the same private mode-0700 directory, not directly beneath shared `/tmp`. An initial M5.10 attempt correctly refused the latter. Inspect the refusal, fix only the disposable private path and explicitly approve the identified line; never weaken the guard or blindly retry guest input.

Run from the Mac after readiness and approval:

```sh
M591_PERSONALITIES=vt220 BSD_ENGINE=chromium BSD_RUN=m510 \
  BSD_SCREENSHOT=docs/screenshots/m510/bsd-vi.png \
  node lab/m591/bsd-browser.mjs
```

Set `PIDP_BSD_WORK` to the fresh evidence directory first. This reuses the original scoped editor checks; it does not run the expanded pager/observer suite. Stop the exact bridge process, sync three times through the independent console, then send the inventory harness’s `finish` operation and verify quit. A defunct exited bridge process is not a live listener; verify process state rather than killing a parent indiscriminately. Stop only the owned relay and retain all evidence.

## Image and publication checks

Preserve raw fresh captures privately. Published M5.10 PNGs retain exact dimensions and filtered pixel bytes; only lossless IDAT recompression was applied. Phase D model/offline/Hacker captures are reused unchanged with their original provenance. Do not infer new M5.10 model tests from those pictures.

[Public result summaries](results/) and [image manifest](../../docs/screenshots/m510/provenance.json) exclude private config, tokens, disks and raw operator-console logs. The gallery captions identify every simulation and genuine producer. The documentation report records package, link and rendering checks separately from guest evidence.
