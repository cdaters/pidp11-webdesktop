import { shareSelection } from "./terminal-sharing.ts";
import { Tek4010 } from "./tek4010.ts";
import { renderTek, saveArtifact } from "./tek-display.ts";
import { TerminalProfile, type TerminalPersonality } from "./terminal-profile.ts";
import { terminalDocument } from "./terminal.ts";
import type { Terminal } from "@xterm/xterm";

/** Require a reviewed ASCII line without Return; submitting it is a separate action. */
export function safeGuestPaste(text: string): string {
  if (!text.length || text.length > 256 || /[^\x20-\x7e\t]/.test(text)) throw Error("Paste one ASCII line, at most 256 characters, without Return or control characters.");
  return text;
}
/** Mount one viewer of a configured guest line, initially without keyboard ownership.
 * The caller owns host and must invoke the returned cleanup when its window closes.
 * This view owns xterm, its socket and renewal timer; it never owns guest lifecycle. */
export async function mountGuestTerminal(host: HTMLElement, initialPersonality: TerminalPersonality = "vt100", onStatus: (status: string) => void = () => {}) {
  const [{Terminal}] = await Promise.all([import("@xterm/xterm"),import("@xterm/xterm/css/xterm.css")]);
  if (!host.isConnected) return () => {};
  host.innerHTML = `<div class="guest-heading"><strong>Real guest terminal · dedicated guest line</strong><span class="source-tag">NOT CONNECTED</span></div>
    <form class="guest-login"><label>Terminal access token <input type="password" autocomplete="off" aria-label="Terminal access token"></label><button>Sign in</button></form>
    <div class="terminal-toolbar"><select aria-label="Guest endpoint" disabled></select><button data-refresh disabled>Refresh lines</button><button data-connect disabled>Connect</button><button data-disconnect disabled>Disconnect</button><button data-acquire disabled>Acquire keyboard</button><button data-release disabled>Release keyboard</button><button data-logout disabled>Sign out</button></div>
    <div class="terminal-toolbar"><label>Personality <select aria-label="Guest terminal personality"><option value="vt100">VT100 · tested subset</option><option value="vt52">VT52 · initial text subset</option><option value="vt220">VT220 · seven-bit subset</option><option value="asr33">ASR-33 · paper presentation</option><option value="tek4010">Tektronix 4010 · experimental</option></select></label><label>Text size <select aria-label="Guest terminal text size"><option value="11">Small</option><option value="13" selected>Normal</option><option value="16">Large</option></select></label></div>
    <div class="guest-status" role="status">Sign in to list configured guest lines. No automatic keyboard takeover.</div>
    <div class="terminal-toolbar"><button data-save-output>Save display</button><button data-share-selection>Share selected text</button><label><input type="checkbox" data-uppercase> Uppercase keyboard (teletype)</label><span data-paper-status></span></div>
    <svg class="tek-display guest-tek" viewBox="0 0 1024 781" tabindex="0" role="img" aria-label="Guest Tektronix display" hidden></svg>
    <div class="guest-screen"><div class="guest-xterm" aria-label="Real guest terminal"></div></div>
    <details class="guest-paste"><summary>Review paste</summary><label>One line, without Return <input type="text" maxlength="256" aria-label="Reviewed guest paste" autocomplete="off"></label><button data-paste disabled>Send reviewed paste</button></details>
    <details class="guest-proposals"><summary>Review a suggested UNIX command (experimental)</summary><p>Disabled by default. Only pwd, ls and ls / are admitted; this is not general command execution. Confirm the attached guest is UNIX.</p><label><input type="checkbox" data-enable-proposals> Enable review in this window</label><select aria-label="Suggested read-only command"><option value="pwd">pwd</option><option value="ls">ls</option><option value="ls /">ls /</option></select><button data-propose disabled>Request exact-byte review</button><pre data-proposal-preview></pre><button data-approve disabled>Approve this input once</button><button data-cancel-proposal>Cancel proposal</button></details><label class="guest-erase">Backspace <select aria-label="Backspace encoding"><option value="127">DEL · DEC</option><option value="8">BS</option><option value="35"># · UNIX V7 erase</option></select></label>
    <div class="terminal-foot">ASCII7 input · 80 × 24 text / 72-column paper / 1024 × 781 graphics · paper timing is not simulated · Backspace encoding is explicit · shared guest line may already be logged in. Panel and mock peripherals remain separate.</div>`;
  const $=<T extends HTMLElement>(selector:string)=>host.querySelector<T>(selector)!;
  const status=$(".guest-status"),badge=$(".source-tag"),selector=$<HTMLSelectElement>("select");
  const makeTerminal=()=>new Terminal({documentOverride:terminalDocument(),cols:80,rows:24,scrollback:300,fontFamily:'Menlo, Consolas, monospace',fontSize:13,lineHeight:1.15,cursorBlink:false,screenReaderMode:true,convertEol:false,allowProposedApi:false,theme:{background:'#101d1b',foreground:'#c4d8bc',cursor:'#e1ddb3'}});
  const personality = $<HTMLSelectElement>('[aria-label="Guest terminal personality"]');
  personality.value = initialPersonality;
  let profile = new TerminalProfile(initialPersonality);
  let tek = new Tek4010();
  const graphic = $<SVGSVGElement & HTMLElement>(".guest-tek");
  const focus = () => personality.value === "tek4010" ? graphic.focus() : term.focus();
  const displayMode = () => {
    const kind = personality.value;
    host.classList.toggle("teletype-mode", kind === "asr33");
    graphic.toggleAttribute("hidden", kind !== "tek4010");
    $(".guest-screen").hidden = kind === "tek4010";
    $<HTMLInputElement>("[data-uppercase]").disabled = kind !== "asr33";
  };
  personality.onchange = displayMode;
  displayMode();
  let term:Terminal=makeTerminal();
  term.open($(".guest-xterm"));
  let proposalID = "", proposalEpoch = 0, proposalRequested = false, proposalTimer = 0;
  const clearProposal = () => {
    clearTimeout(proposalTimer);
    proposalRequested = false;
    proposalID = "";
    $("[data-proposal-preview]").textContent = "";
    $<HTMLButtonElement>("[data-approve]").disabled = true;
  };
 let socket:WebSocket|undefined, owner=false,connected=false,epoch=0,seq=0,canInput=false,csrf="",disposed=false,queued=0;
  const controls=()=>{
    const open=socket?.readyState===WebSocket.OPEN;
    $<HTMLButtonElement>("[data-connect]").disabled=!selector.options.length || !!socket || selector.selectedOptions[0]?.dataset.state !== "attached";
    $<HTMLButtonElement>("[data-disconnect]").disabled=!socket;
    $<HTMLButtonElement>("[data-acquire]").disabled=!open || !connected || !canInput || owner;
    $<HTMLButtonElement>("[data-release]").disabled=!owner;
    $<HTMLButtonElement>("[data-paste]").disabled=!owner;
    selector.disabled=!!socket || !selector.options.length;
    personality.disabled = !!socket;
    badge.textContent=connected ? owner ? "KEYBOARD OWNER" : "REAL GUEST · READ-ONLY" : (selector.selectedOptions[0]?.dataset.state === "attached" ? "DISCONNECTED" : (selector.selectedOptions[0]?.dataset.state ?? "detached").toUpperCase());
    onStatus(`${selector.value || "No line"} · ${personality.value.toUpperCase()} · ${badge.textContent}`);
  };
  const send = (message: object) => {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    if (socket.bufferedAmount > 8192) {
      disconnect('Input backlog; disconnected, no replay');
      return false;
    }
    socket.send(JSON.stringify(message));
    return true;
  };
  // Invalidate the socket before closing it so late callbacks cannot update a new view.
  const disconnect = (message = 'Disconnected · guest continues independently') => {
    const old = socket;
    socket = undefined;
    owner = false;
    connected = false;
    old?.close();
    clearProposal();
    status.textContent = message;
    controls();
  };
  const input=(data:string)=>{
    if(!owner || !connected)return;
    clearProposal();
    if(!data.length || data.length>256 || /[^\x00-\x7f]/.test(data)){status.textContent='Input rejected: ASCII7, at most 256 bytes per event';return;}
    if (profile.personality === "asr33" && $<HTMLInputElement>("[data-uppercase]").checked) data = data.toUpperCase();
    if(send({type:'input',epoch,seq:seq+1,data:btoa(data)}))seq++;
  };
  const configureKeys=()=>term.attachCustomKeyEventHandler(e=>{
    if(e.type!=='keydown'||e.altKey||e.ctrlKey||e.metaKey)return true;
    const encoded= e.code==='Backspace'?String.fromCharCode(Number($<HTMLSelectElement>('[aria-label="Backspace encoding"]').value)):profile.key(e.code,term.modes.applicationKeypadMode,term.modes.applicationCursorKeysMode);
    if(encoded===undefined)return true;e.preventDefault();term.input(encoded,true);return false;
  });
  configureKeys();
  let handler=term.onData(input);
  $<HTMLSelectElement>('[aria-label="Guest terminal text size"]').onchange = e => {
    term.options.fontSize = Number((e.target as HTMLSelectElement).value);
  };
  // Stop native clipboard paste before xterm; nothing is sent until explicit review.
  const paste=(e:ClipboardEvent)=>{e.preventDefault();e.stopImmediatePropagation();const value=e.clipboardData?.getData('text/plain')??'';const box=$<HTMLInputElement>('.guest-paste input');try { box.value=safeGuestPaste(value); status.textContent='Paste captured for review; nothing sent'; } catch (error) { box.value=''; status.textContent=(error as Error).message; } $<HTMLDetailsElement>('.guest-paste').open=true;box.focus();};
  $(".guest-screen").addEventListener('paste',paste,true);
  $<HTMLButtonElement>('[data-paste]').onclick=()=>{try{input(safeGuestPaste($<HTMLInputElement>('.guest-paste input').value));$<HTMLInputElement>('.guest-paste input').value='';focus();}catch(e){status.textContent=String((e as Error).message);}};
  const list = async () => {
    const [session, endpoints] = await Promise.all([fetch('/api/v1/session'), fetch('/api/v1/terminals')]);
    if (!session.ok || !endpoints.ok) throw Error('Guest terminal service unavailable or sign-in required');
    const s = await session.json();
    const rows: {id: string; label: string; connected: boolean; state?: string; generation?: string}[] = await endpoints.json();
    if (disposed) return;
    csrf = s.csrf;
    canInput = !!s.capabilities['terminal.input'];
    const selectedID = selector.value;
    selector.replaceChildren(...rows.map(e => {
      const option = document.createElement('option');
      option.value = e.id;
      option.dataset.state = e.state ?? (e.connected ? 'attached' : 'unavailable');
      option.dataset.generation = e.generation ?? '';
      option.textContent = `${e.label} · ${option.dataset.state}`;
      return option;
    }));
    // Directory iteration order may change. Keep the intended line across a
    // refresh; a different first row must not silently replace the selection.
    if (rows.some(row => row.id === selectedID)) selector.value = selectedID;
    $<HTMLButtonElement>('[data-logout]').disabled = false;
    $<HTMLButtonElement>('[data-refresh]').disabled = false;
    status.textContent = rows.some(e => e.connected)
      ? 'Select an attached guest line and connect read-only.'
      : 'No guest attached. A local operator must verify and approve a line, then use Refresh lines. The guest runs independently.';
    controls();
  };
  selector.onchange = controls;
  $<HTMLButtonElement>('[data-refresh]').onclick = () => {
    if (socket) { status.textContent = 'Disconnect this view before refreshing terminal choices.'; return; }
    void list().catch(error => { status.textContent = (error as Error).message; });
  };
  $<HTMLFormElement>('form').onsubmit=async e=>{e.preventDefault();const box=$<HTMLInputElement>('input[type=password]'),token=box.value;box.value='';try{const r=await fetch('/api/v1/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});if(!r.ok)throw Error('Terminal sign-in rejected');await list();}catch(e){status.textContent=(e as Error).message;}};
  $<HTMLButtonElement>('[data-connect]').onclick=()=>{
    if(socket || !selector.value || selector.selectedOptions[0]?.dataset.state !== "attached")return;
    const generation = selector.selectedOptions[0]?.dataset.generation;
    const suffix = generation ? `/generation/${encodeURIComponent(generation)}/ws` : "/ws";
    const url=new URL(`/api/v1/terminals/${encodeURIComponent(selector.value)}${suffix}`,location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
    // A fresh parser prevents a partial escape sequence from the old connection
    // consuming new output. Keyboard authority and input sequence also start fresh.
    const ws = new WebSocket(url);
    socket = ws;
    seq = 0;
    owner = false;
    connected = false;
    queued = 0;
    handler.dispose();
    term.dispose();
    profile = new TerminalProfile(personality.value as TerminalPersonality);
    tek = new Tek4010(); renderTek(graphic, tek);
    $("[data-paper-status]").textContent = "";
    displayMode();
    term = makeTerminal();
    if (profile.personality === "asr33") {
      term.resize(72, 24);
      term.options.scrollback = 512;
      term.options.theme = { background: "#f5f0df", foreground: "#29271e", cursor: "#493a29" };
    }
    term.options.fontSize = Number($<HTMLSelectElement>('[aria-label="Guest terminal text size"]').value);
    term.open($(".guest-xterm"));
    term.write(profile.initial);
    configureKeys();
    handler = term.onData(input);
    status.textContent = 'Connecting · fresh display; no terminal history replay';
    controls();
    ws.onmessage=e=>{
      if(socket!==ws)return;
      try{const f=JSON.parse(e.data);
        if(f.type==='state'){if(f.epoch!==proposalEpoch||!f.owner)clearProposal();owner=!!f.owner;connected=!!f.connected;epoch=f.epoch;status.textContent=f.message || (connected ? owner ? 'Connected · this window owns the guest keyboard' : f.busy ? 'Connected read-only · another viewer owns the keyboard' : 'Connected read-only · acquire keyboard explicitly' : 'Guest line unavailable · operator must reconnect it');controls();}
        else if(f.type==='output'){
          const raw=atob(f.data);if(queued+raw.length>65536)throw Error('Renderer backlog');queued+=raw.length;
          const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
          // Preserve parser state across chunks on this connection. Return server
          // credit only after xterm consumes the bytes, and never to a newer socket.
          if (profile.personality === "tek4010") {
            tek.feed(bytes); renderTek(graphic, tek);
            queued -= bytes.length; send({ type: 'ack', bytes: bytes.length });
            return;
          }
          const translated = profile.feed(bytes);
          if (profile.personality === "asr33") $("[data-paper-status]").textContent = `${profile.paper.lines.length} retained lines · ${profile.paper.discardedLines} older lines discarded · ${profile.paper.bells} bells`;
          for (const reply of translated.replies) input(reply);
          term.write(translated.display, () => {
            if (socket === ws) {
              queued -= bytes.length;
              send({ type: 'ack', bytes: bytes.length });
            }
          });
        } else if (f.type === 'proposal') {
          // Cancellation can race an already queued response. Never revive it.
          if (!proposalRequested || !$<HTMLInputElement>('[data-enable-proposals]').checked) {
            if (owner) send({type: 'cancel-proposal', epoch});
            return;
          }
          proposalRequested = false;
          if (!owner || f.epoch !== epoch || typeof f.proposal_id !== 'string' || typeof f.data !== 'string' || !Number.isFinite(f.expires)) throw Error('Invalid proposal');
          const exact = atob(f.data);
          if (!['pwd\r', 'ls\r', 'ls /\r'].includes(exact)) throw Error('Unsupported proposal');
          proposalID = f.proposal_id;
          proposalEpoch = f.epoch;
          $("[data-proposal-preview]").textContent = `Target: ${selector.value} · attachment ${selector.selectedOptions[0]?.dataset.generation ?? "unknown"}\nExact input: ${JSON.stringify(exact)} (\\r = Return) · expires ${new Date(f.expires).toLocaleTimeString()}`;
          $<HTMLButtonElement>("[data-approve]").disabled = false;
          proposalTimer = window.setTimeout(() => {
            clearProposal();
            if (owner) send({type: 'cancel-proposal', epoch});
            status.textContent = "Proposal expired; request a new review. Nothing sent to the guest.";
          }, Math.max(0, Math.min(30000, f.expires - Date.now())));
        } else if (f.type === 'proposal-result') {
          clearProposal();
          status.textContent = f.message;
        }else throw Error('Invalid terminal frame');
      }catch(error){disconnect(`${(error as Error).message || 'Terminal protocol error'}; disconnected without replay`);}
    };
    ws.onclose=()=>{if(socket===ws)disconnect('Disconnected · reconnect explicitly; guest state is not inferred');};
    ws.onerror=()=>{if(socket===ws)disconnect('Connection unavailable · guest may still be running');};
  };
  $<HTMLButtonElement>('[data-acquire]').onclick=()=>{send({type:'acquire'});focus();};
  $<HTMLButtonElement>('[data-release]').onclick=()=>{send({type:'release'});owner=false;controls();};
  $<HTMLButtonElement>('[data-disconnect]').onclick=()=>disconnect();
  $<HTMLButtonElement>('[data-logout]').onclick=async()=>{disconnect('Signed out locally');selector.replaceChildren();$<HTMLButtonElement>("[data-refresh]").disabled=true;canInput=false;controls();const r=await fetch('/api/v1/logout',{method:'POST',headers:{'X-CSRF-Token':csrf}});csrf='';$<HTMLButtonElement>('[data-logout]').disabled=true;if(!r.ok)status.textContent='Local disconnect; server logout unconfirmed, session expiry still applies';};
  graphic.onkeydown = event => {
    if (event.metaKey || event.altKey) return;
    let data = event.key.length === 1 ? event.key : ({ Enter: "\r", Backspace: "\x7f", Tab: "\t", Escape: "\x1b" } as Record<string,string>)[event.key];
    if (event.ctrlKey && /^[a-z]$/i.test(event.key)) data = String.fromCharCode(event.key.toUpperCase().charCodeAt(0) - 64);
    if (data) { event.preventDefault(); input(data); }
  };
  graphic.onclick = event => {
    if (!owner || !connected || !tek.gin) return;
    // SVG's inverse transform accounts for its letterboxed responsive viewport.
    const matrix = graphic.getScreenCTM(); if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (point.x < 0 || point.x > 1023 || point.y < 0 || point.y > 780) return;
    input(tek.ginReply(point.x, 780 - point.y)); renderTek(graphic, tek);
  };
  $<HTMLButtonElement>("[data-save-output]").onclick = () => {
    if (profile.personality === "tek4010") {
      const copy = graphic.cloneNode(true) as SVGSVGElement;
      copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      copy.setAttribute("style", "background:#101d1b;stroke:#b3dcad;fill:#b3dcad;font:18px monospace");
      saveArtifact("tek4010-display.svg", new XMLSerializer().serializeToString(copy), "image/svg+xml");
    } else if (profile.personality === "asr33") saveArtifact("teletype-paper.txt", profile.paper.text);
    else {
      const buffer = term.buffer.active;
      const lines = Array.from({ length: buffer.length }, (_, n) => buffer.getLine(n)?.translateToString(true) ?? "");
      saveArtifact("terminal-display.txt", lines.join("\n"));
    }
  };
  $<HTMLButtonElement>("[data-share-selection]").onclick = () => {
    try {
      shareSelection(`${selector.value} / ${selector.selectedOptions[0]?.dataset.generation ?? "unknown"}`, term.getSelection());
      window.dispatchEvent(new Event("pidp11-share-selection"));
      status.textContent = "Selection copied to Companion for review; nothing sent.";
    } catch (error) {
      status.textContent = (error as Error).message;
    }
  };
  const cancelProposal = () => {
    const hadProposal = !!proposalID || proposalRequested;
    clearProposal();
    if (owner && hadProposal) send({type: 'cancel-proposal', epoch});
  };
  $<HTMLInputElement>("[data-enable-proposals]").onchange = async event => {
    cancelProposal();
    $<HTMLButtonElement>("[data-propose]").disabled = true;
    if (!(event.target as HTMLInputElement).checked) return;
    try {
      const response = await fetch('/api/v1/features');
      const config = await response.json();
      if (!disposed && $<HTMLInputElement>("[data-enable-proposals]").checked && config.readonly_command_proposals === true) {
        $<HTMLButtonElement>("[data-propose]").disabled = false;
      } else {
        status.textContent = "Command proposals are disabled by the service operator.";
      }
    } catch {
      status.textContent = "Proposal support unavailable.";
    }
  };
  $<HTMLButtonElement>("[data-propose]").onclick = () => {
    clearProposal();
    if (!owner) {
      status.textContent = "Acquire keyboard before requesting review.";
      return;
    }
    proposalRequested = true;
    send({type: 'propose', epoch, data: btoa($<HTMLSelectElement>('[aria-label="Suggested read-only command"]').value + '\r')});
  };
  $<HTMLButtonElement>("[data-approve]").onclick = () => {
    if (!proposalID || !owner) return;
    const id = proposalID;
    clearProposal();
    if (send({type: 'approve', epoch, seq: seq + 1, proposal_id: id})) seq++;
  };
  $<HTMLButtonElement>("[data-cancel-proposal]").onclick = cancelProposal;
  const heartbeat=setInterval(()=>{if(owner)send({type:'renew',epoch});},2000);
  const hide=()=>disconnect('Page closed · guest connection remains independent');window.addEventListener('pagehide',hide);
  // Session inspection is read-only. It never connects to a line or grants input.
  void list().catch(()=>{});
  return () => {
    disposed = true;
    clearInterval(heartbeat);
    window.removeEventListener('pagehide', hide);
    disconnect();
    handler.dispose();
    term.dispose();
  };
}
