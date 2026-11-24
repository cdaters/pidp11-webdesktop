/** Laboratory injection into the existing tape window. Never imported by main.ts.
 * This pane owns its requests, expiry timer and removal watcher. Source approval
 * stays in the independent reader's local operator interface. */
const host = document.querySelector<HTMLElement>('[data-window="tapes"] .storage-observation');
if (!host) throw Error("Open the existing tape observation window first");
const pane = document.createElement("section");
pane.innerHTML = '<h3>Experimental TM11 completion observations</h3><p>Disposable instrumented lab · forward reads only · no tape-motion or idle inference.</p><button data-activity-start>View approved lab activity</button> <button data-activity-stop>Stop activity view</button><pre data-activity-output>Disconnected · activity unknown</pre>';
host.append(pane);
const output = pane.querySelector<HTMLElement>("[data-activity-output]")!;
let active = false;
let controller: AbortController | undefined;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
let identity = "";
let sequence = 0;
let lossBaseline: number | undefined;

const stopActivityView = (reason: string) => {
  active = false;
  controller?.abort();
  clearTimeout(pollTimer);
  clearTimeout(expiryTimer);
  output.textContent = reason + " · activity unknown";
};
const unsigned = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xffffffff;

const poll = async () => {
  if (!active) return;
  const request = new AbortController();
  controller = request;
  const timeout = setTimeout(() => request.abort(), 200);
  const started = performance.now();
  try {
    const response = await fetch("/activity", { signal: request.signal, cache: "no-store" });
    const text = await response.text();
    if (!response.ok || text.length > 4096) throw Error("Unavailable or oversized response");
    const row = JSON.parse(text) as Record<string, unknown>;
    if (!row || row.mode !== "approved-lab" || typeof row.instance !== "string" ||
        !/^[a-f0-9]{16}$/.test(row.instance) || !unsigned(row.generation) || row.generation < 1 ||
        !unsigned(row.sequence) || !unsigned(row.lost) || !Number.isFinite(row.event_age_ms) ||
        Number(row.event_age_ms) < -1 || typeof row.guest !== "string" || row.guest.length > 80 ||
        !["events", "bytes", "filemarks", "max_queue_at_drain"].every(
          key => Number.isSafeInteger(row[key]) && Number(row[key]) >= 0) ||
        Number(row.max_queue_at_drain) > 256 ||
        !["unknown", "recent verified read completion"].includes(String(row.activity))) {
      throw Error("Unapproved, retired or malformed observation");
    }
    const next = row.instance + ":" + row.generation;
    if ((identity && identity !== next) || row.sequence < sequence ||
        (lossBaseline !== undefined && row.lost !== lossBaseline)) {
      throw Error("Source, sequence or loss changed");
    }
    if (!active || controller !== request) return;
    identity = next;
    sequence = row.sequence;
    lossBaseline = row.lost;
    const ageUpperMS = Number(row.event_age_ms) + performance.now() - started;
    const recent = Number(row.event_age_ms) >= 0 && ageUpperMS < 250 &&
      row.activity === "recent verified read completion";
    const details = `\nSource ${identity} · sequence ${sequence}\n${row.events} read completions · ${row.bytes} DMA bytes · ${row.filemarks} filemarks\nQueue sample ${row.max_queue_at_drain}/256 · lost ${row.lost}\nGuest ${row.guest} (operator-attested)`;
    clearTimeout(expiryTimer);
    output.textContent = (recent ? row.activity : "unknown") + details;
    // Expiry is independent of the next request. Delayed/failed fetches cannot
    // extend a completion's lifetime. Background-tab timer throttling still applies.
    if (recent) {
      expiryTimer = setTimeout(() => {
        if (active) output.textContent = "unknown" + details;
      }, Math.max(0, 250 - ageUpperMS));
    }
    // Test instrumentation only: reader age + full request duration is a conservative
    // event-to-DOM estimate; browser and Linux monotonic clocks are not interchangeable.
    pane.dispatchEvent(new CustomEvent("m525-render", {
      detail: { sequence, ageUpperMS: Number(row.event_age_ms) + performance.now() - started },
    }));
  } catch (error) {
    if (active && controller === request) stopActivityView((error as Error).message);
    return;
  } finally {
    clearTimeout(timeout);
  }
  pollTimer = setTimeout(poll, 100); // At most ten sequential fetches/second; no overlap.
};
pane.querySelector<HTMLButtonElement>("[data-activity-start]")!.onclick = () => {
  stopActivityView("New explicit view");
  identity = "";
  sequence = 0;
  lossBaseline = undefined;
  active = true;
  void poll();
};
pane.querySelector<HTMLButtonElement>("[data-activity-stop]")!.onclick = () => stopActivityView("Disconnected viewer");
const lifecycle = new MutationObserver(() => {
  if (!host.isConnected || !pane.isConnected) {
    stopActivityView("Window closed");
    lifecycle.disconnect();
    document.removeEventListener("visibilitychange", visibilityChanged);
  }
});
lifecycle.observe(document.body, { childList: true, subtree: true });
window.addEventListener("pagehide", () => {
  stopActivityView("Page closed");
  lifecycle.disconnect();
}, { once: true });
// A suspended background page must not show a retained activity label on return.
const visibilityChanged = () => {
  if (document.hidden) stopActivityView("Page hidden");
};
document.addEventListener("visibilitychange", visibilityChanged);
window.addEventListener("pagehide", () => document.removeEventListener("visibilitychange", visibilityChanged), { once: true });
