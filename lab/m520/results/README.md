# M5.20 curated evidence

These aggregates were copied from actual retained M5.20 results or explicitly
summarized from those records. They exclude private tokens, host configuration,
console transcripts, guest disks and screenshots. No historical executable or
media image is distributed here.

- `backup.json`: independently read archive verification; destination omitted.
- `printer-bytes.json`: all 160 input records compared with the actual LP11 file.
- `printer-partial-browser.json` and `printer-completed-browsers.json`: downloads
  from the real producer; the failed original print-script cleanup is reported in
  the engineering report rather than hidden by these later successful checks.
- `cpu-pc11-phases.json`, `cpu-pc11-browsers.json`: three genuine diskless CPU phases,
  reader positions/EOF and exact prefix/completed downloads.
- `rsx-pc11-bytes.json`, `rsx-pc11-browsers.json`: actual installed PIP/driver copy,
  independently checked transformation and completed browser downloads.
- `artifact-verification.jsonl`: read-only independent recheck of retained files.
- `tests.json`: actual test summary; overlapping browser runs are not unique tests.
- `resources.json`: post-workflow idle ARM64 Linux service measurements, not Pi data.
- `preservation.json`: original-media metadata/hash comparisons, cleanup and remote
  tag/release identity checks. Release assets were not redownloaded for this milestone.

The original files, input lists, register observations, logs and real browser
captures remain in ignored `.research/m520/`. The prerequisite backup predates this
new evidence. A Git clone recovers these reports and reproduction helpers, not the
private disks or complete lab. See [the runbook](../README.md) and
[engineering report](../../../docs/lab/M5.20.md) for scope and failures.
