/** Read-only modern modem observation. No dialing or guest input authority. */
export interface ModemSnapshot {
  version: number; generation: string; mode: string; result: string; reason: string;
  guest_connected: boolean; peer_connected: boolean; echo: boolean;
  guest_received: number; guest_written: number; peer_received: number; peer_written: number;
  sample_unix_ms: number; activity_unix_ms: number;
  profile: { guest: string; controller: string; line: number; unit: number; guest_device: string; simulator: string; application: string; peer: string; framing: string };
}
export function validateModem(value: unknown, now = Date.now()): ModemSnapshot {
  if (!value || typeof value !== "object") throw Error("Unknown modem state");
  const s = value as ModemSnapshot;
  if (s.version !== 1 || !/^[a-f0-9]{24,64}(-[0-9]{1,20})?$/.test(s.generation) || !["detached", "command", "dialing", "data", "unavailable", "stopped"].includes(s.mode) || !["", "OK", "ERROR", "CONNECT", "NO CARRIER"].includes(s.result)) throw Error("Unknown modem state");
  for (const n of [s.guest_received, s.guest_written, s.peer_received, s.peer_written]) if (!Number.isSafeInteger(n) || n < 0 || n > 65536) throw Error("Invalid modem count");
  for (const b of [s.guest_connected, s.peer_connected, s.echo]) if (typeof b !== "boolean") throw Error("Invalid modem state");
  if (!Number.isSafeInteger(s.sample_unix_ms) || s.sample_unix_ms <= 0 || s.sample_unix_ms > now + 1000 || now - s.sample_unix_ms > 3000 || !Number.isSafeInteger(s.activity_unix_ms) || s.activity_unix_ms < 0 || s.activity_unix_ms > s.sample_unix_ms) throw Error("Modem observation stale or unavailable");
  if (!s.profile || s.profile.guest !== "UNIX V7" || s.profile.controller !== "DC11" || s.profile.line !== 3 || s.profile.unit !== 0 || s.profile.guest_device !== "/dev/tty03") throw Error("Unqualified modem line");
  for (const text of [s.reason, s.profile.simulator, s.profile.application, s.profile.peer, s.profile.framing]) if (typeof text !== "string" || !/^[\x20-\x7e]{0,160}$/.test(text)) throw Error("Invalid modem description");
  if ((s.mode === "data" && (!s.guest_connected || !s.peer_connected)) || (!s.guest_connected && s.peer_connected)) throw Error("Inconsistent modem state");
  return s;
}

export function mountModem(host: HTMLElement): () => void {
  host.innerHTML = `<h2>Local text modem · laboratory</h2><p>Read-only observation of an independently operated modem. Sign in through Guest terminal first.</p><div class="terminal-toolbar"><button data-modem-start>Observe modem</button><button data-modem-stop disabled>Disconnect observation</button></div><pre data-modem-facts role="status">Not observing · no modem authority</pre><p>Disconnecting this view does not hang up the modem. Use guarded +++ then ATH in the approved guest application, or ask the independent operator to stop the modem. No DCD, DTR, DSR, CTS or RTS measurements are available.</p>`;
  const start = host.querySelector<HTMLButtonElement>("[data-modem-start]")!;
  const stop = host.querySelector<HTMLButtonElement>("[data-modem-stop]")!;
  const facts = host.querySelector<HTMLElement>("[data-modem-facts]")!;
  let generation = "", serial = 0, timer: ReturnType<typeof setTimeout> | undefined, request: AbortController | undefined;
  const disconnect = (message: string) => { serial++; request?.abort(); clearTimeout(timer); start.disabled = false; stop.disabled = true; facts.textContent = message; };
  const poll = async (attempt: number) => {
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await fetch("/api/v1/modem", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      if (!response.ok) throw Error("Modem unavailable · check sign-in and independent operator");
      const reader = response.body?.getReader();
      if (!reader) throw Error("Missing modem observation");
      let text = "", bytes = 0;
      const decoder = new TextDecoder();
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 16384) throw Error("Oversized modem observation");
          text += decoder.decode(chunk.value, { stream: true });
        }
        text += decoder.decode();
      } finally { await reader.cancel(); reader.releaseLock(); }
      const s = validateModem(JSON.parse(text));
      if (attempt !== serial) return;
      if (generation && generation !== s.generation) throw Error("Attachment changed · observation retired; inspect before observing again");
      generation = s.generation;
      facts.textContent = `RetroRealm local text modem · ASCII7 subset\n${s.profile.guest} · ${s.profile.controller} line ${s.profile.line} · ${s.profile.guest_device}\nPeer: ${s.profile.peer}\nMode: ${s.mode} · result: ${s.result || "none"}\nGuest socket: ${s.guest_connected ? "connected" : "disconnected"} · peer socket: ${s.peer_connected ? "connected" : "disconnected"}\nModem received/wrote: guest ${s.guest_received}/${s.guest_written} bytes; peer ${s.peer_received}/${s.peer_written} bytes\nEcho: ${s.echo ? "on" : "off"}\nGeneration: ${s.generation}\nOperator identity: ${s.profile.simulator}\nOwnership: independent modem actor; this view has no input authority\nSample age: ${Math.max(0, Date.now()-s.sample_unix_ms)} ms\nLast activity: ${s.activity_unix_ms ? new Date(s.activity_unix_ms).toISOString() : "none"}\n${s.reason}`;
      timer = setTimeout(() => { void poll(attempt); }, 750);
    } catch (error) { if (attempt === serial) disconnect(error instanceof Error ? error.message : "Unknown modem state"); }
    finally { clearTimeout(timeout); }
  };
  start.onclick = () => { generation = ""; start.disabled = true; stop.disabled = false; void poll(++serial); };
  stop.onclick = () => disconnect("Observation disconnected · independent modem unchanged");
  return () => disconnect("Observation closed");
}
