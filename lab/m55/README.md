# M5.5 full-profile coexistence candidate laboratory

Mac/OrbStack ARM64 development only. No Pi connection, hardware device, original
launcher execution or installation script is included. The original C simulator
runs the **complete candidate boot.ini**, including the original REALCONS
settings, against the existing Go panel stand-in in a network-none Linux lab.
The original `getsel.sh` resolver is also tested; physical `scansw`, the original
GPIO daemon and GNU Screen remain future physical-Pi acceptance.

`original-boot.ini` is the unchanged ordinary V7 configuration retained in the
M5.1 installed-source capture, hash `9a0d63699fcc1ab117fcf9cf35f85c1694719b33f2d8989167f4018e97d7f44b`.
It comes from Oscar Vermeulen's original PiDP-11 installation at upstream revision
`26d20beda0c6b5a1d3a5cb3d7a4dd494e02bff75`; it is not newly authored simulator
configuration or a claim that all public media archives contain identical bytes.
`boot.ini` adds one DC11 listener. `selection-entry.txt` is the single proposed
addition. No guest image or private full selection map is distributed here.

## Local preparation and failure checks

`prepare_profile.py ORIGINAL_BOOT CAPTURED_SELECTIONS NEW_DIRECTORY` runs on the
Mac, reads bounded local files, and emits an exact boot/map proposal, two diffs
and a hash manifest. Existing output directories, source drift, numeric selection
aliases, occupied `0017`, malformed maps and an already-mapped pilot profile are
refused. It does not install a profile, touch disks, use SSH or write its sources.
The complete map/diff stays private. Run its temporary-fixture tests with:

```sh
python3 -m unittest discover -s lab/m55 -p 'test_*.py'
```

## Fresh disposable replay

Use the existing [M5.0 prerequisites and verified media](../../docs/lab/M5.0-runbook.md).
From the repository root in the **Mac shell**, choose a new destination for every
replay. This example uses a clearly synthetic selector map, so a contributor
needs no private inventory. The actual M5.5 preparation used the retained
installed map, with current-state revalidation still required before a Pi pilot.

```sh
npm run build:server
mkdir -p .research/m55-replay/bin
chmod 700 .research/m55-replay
printf '0000\tidled\n0001\tunix7\n' > .research/m55-replay/selections.baseline
python3 lab/m50/prepare.py .research/m50-download/systems.tar.gz .research/m55-replay/guest
python3 lab/m55/prepare_profile.py lab/m55/original-boot.ini .research/m55-replay/selections.baseline .research/m55-replay/guest/profile
mv .research/m55-replay/guest/disk0.hp .research/m55-replay/guest/profile/disk0.hp
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o .research/m55-replay/bin/terminal-pilot-linux-arm64 ./cmd/terminal-pilot
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o .research/m55-replay/bin/terminal-cert-linux-arm64 lab/m50/certificate.go
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags='-s -w' -o .research/m55-replay/bin/realcons-lab-linux-arm64 ./cmd/realcons-lab
cp .research/lab-source/bin/getsel.sh .research/m55-replay/bin/getsel.sh
```

The pinned source cache is produced by the existing lab-image build. Verify the
copied original resolver hash is
`eace06c57b37ffece8cff7bfedcf49f88c3cfc8b60fc8ef183472e95e29fdb71`.
Ensure container name `pidp11-m53` and Mac port 8445 are unused; the retained relay
uses that name even for M5.5. Start the isolated fixture:

```sh
docker --context orbstack run --rm --name pidp11-m53 --network none --read-only --cap-drop ALL --cap-add SETUID --cap-add SETGID --cap-add KILL --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,size=64m --tmpfs /run:rw,size=8m -e PIDP11_ISOLATED_LAB=1 -v "$PWD/lab:/lab:ro" -v "$PWD/.research/m55-replay/bin:/fixtures:ro" -v "$PWD/.research/m55-replay/guest:/work" -v "$PWD/.research/m55-replay/guest/profile/selections.proposed:/opt/pidp11/systems/selections:ro" pidp11-realcons-lab:local python3 -u /lab/m55/serve.py
```

These container capabilities match the older RPC lab: rpcbind drops privileges,
and the supervisor must clean up its differently owned child. They are not
permissions proposed for the on-Pi web executable. The wrapper starts rpcbind
and a direct panel stand-in, neutralizes its initial HALT level, then invokes the
retained guest supervisor. The latter executes `do boot.ini` in the candidate
profile directory and requires actual input/output RPC traffic before readiness.
No broker or browser panel-control path is introduced into the guest bridge.

The original `interval=1` setting requires the explicit **65536-entry** lab replay
cache. The unchanged 4096 default can saturate within the 35-second retention
window at this faster rate. All cache sizes now also have a **16 MiB payload-byte
limit**; live duplicate replies are retained and new calls are rejected before
side effects if bounds are reached. These are stand-in resource settings, not
changes to original REALCONS or the installed panel daemon.

After readiness, run `python3 lab/m53/forward.py` in a second Mac shell. In a third,
run the following **sequentially**, stopping at the first failure:

```sh
PIDP53_WORK=.research/m55-replay/guest node lab/m53/browser.mjs
PIDP55_WORK=.research/m55-replay/guest python3 lab/m55/independence.py
PIDP54_WORK=.research/m55-replay/guest node lab/m54/lifecycle.mjs
```

Expected: genuine commands in three browser engines; unchanged switch inputs,
continuing REALCONS polls/lamp updates and conventional console through bridge
stop and deliberate SIGKILL; then retired attachment after listener replacement,
fresh authentication and read-only recovery. SIGKILL targets only the identified
lab bridge after checking executable and start time. The browser never sends a
signal or SIMH command. The listener test can wait about a minute for TCP
`TIME_WAIT`; it is not bridge reconnection behavior.

On success, shut down through the independent operator:

```sh
PIDP50_WORK=.research/m55-replay/guest python3 lab/m50/control.py shutdown
```

Expect three V7 `sync` commands, SIMH `quit`/`Goodbye`, then container exit. Stop
only this relay with Ctrl-C. Preserve protected bases, working disks, traces and
captures privately. On a failed checkpoint inspect the console/state before
cleanup; a process exit alone is not proof of guest-safe shutdown. The [report](../../docs/lab/M5.5.md)
separates these lab results from the unexecuted [Pi pilot](../../docs/lab/M5.5-pilot-plan.md).
