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
export async function mountGuestTerminal(host: HTMLElement) {
  const [{Terminal}] = await Promise.all([import("@xterm/xterm"),import("@xterm/xterm/css/xterm.css")]);
  if (!host.isConnected) return () => {};
  host.innerHTML = `<div class="guest-heading"><strong>Real guest terminal · dedicated guest line</strong><span class="source-tag">NOT CONNECTED</span></div>
    <form class="guest-login"><label>Terminal access token <input type="password" autocomplete="off" aria-label="Terminal access token"></label><button>Sign in</button></form>
    <div class="terminal-toolbar"><select aria-label="Guest endpoint" disabled></select><button data-refresh disabled>Refresh lines</button><button data-connect disabled>Connect</button><button data-disconnect disabled>Disconnect</button><button data-acquire disabled>Acquire keyboard</button><button data-release disabled>Release keyboard</button><button data-logout disabled>Sign out</button></div>
    <div class="terminal-toolbar"><label>Personality <select aria-label="Guest terminal personality"><option value="vt100">VT100 · tested subset</option><option value="vt52">VT52 · initial text subset</option></select></label><label>Text size <select aria-label="Guest terminal text size"><option value="11">Small</option><option value="13" selected>Normal</option><option value="16">Large</option></select></label></div>
    <div class="guest-status" role="status">Sign in to list configured guest lines. No automatic keyboard takeover.</div>
    <div class="guest-screen"><div class="guest-xterm" aria-label="Real guest terminal"></div></div>
    <details class="guest-paste"><summary>Review paste</summary><label>One line, without Return <input type="text" maxlength="256" aria-label="Reviewed guest paste" autocomplete="off"></label><button data-paste disabled>Send reviewed paste</button></details>
    <label class="guest-erase">Backspace <select aria-label="Backspace encoding"><option value="127">DEL · DEC</option><option value="8">BS</option><option value="35"># · UNIX V7 erase</option></select></label>
    <div class="terminal-foot">Selected personality · ASCII7 · fixed 80 × 24; resize scrolls, text size changes readability · Backspace encoding is explicit · shared guest line may already be logged in. Panel and mock peripherals remain separate.</div>`;
  const $=<T extends HTMLElement>(selector:string)=>host.querySelector<T>(selector)!;
  const status=$(".guest-status"),badge=$(".source-tag"),selector=$<HTMLSelectElement>("select");
  const makeTerminal=()=>new Terminal({documentOverride:terminalDocument(),cols:80,rows:24,scrollback:300,fontFamily:'Menlo, Consolas, monospace',fontSize:13,lineHeight:1.15,cursorBlink:false,screenReaderMode:true,convertEol:false,allowProposedApi:false,theme:{background:'#101d1b',foreground:'#c4d8bc',cursor:'#e1ddb3'}});
  const personality = $<HTMLSelectElement>('[aria-label="Guest terminal personality"]');
  let profile = new TerminalProfile("vt100");
  let term:Terminal=makeTerminal();
  term.open($(".guest-xterm"));
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
    status.textContent = message;
    controls();
  };
  const input=(data:string)=>{
    if(!owner || !connected)return;
    if(!data.length || data.length>256 || /[^\x00-\x7f]/.test(data)){status.textContent='Input rejected: ASCII7, at most 256 bytes per event';return;}
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
  $<HTMLButtonElement>('[data-paste]').onclick=()=>{try{input(safeGuestPaste($<HTMLInputElement>('.guest-paste input').value));$<HTMLInputElement>('.guest-paste input').value='';term.focus();}catch(e){status.textContent=String((e as Error).message);}};
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
    term = makeTerminal();
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
        if(f.type==='state'){owner=!!f.owner;connected=!!f.connected;epoch=f.epoch;status.textContent=f.message || (connected ? owner ? 'Connected · this window owns the guest keyboard' : f.busy ? 'Connected read-only · another viewer owns the keyboard' : 'Connected read-only · acquire keyboard explicitly' : 'Guest line unavailable · operator must reconnect it');controls();}
        else if(f.type==='output'){
          const raw=atob(f.data);if(queued+raw.length>65536)throw Error('Renderer backlog');queued+=raw.length;
          const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
          // Preserve parser state across chunks on this connection. Return server
          // credit only after xterm consumes the bytes, and never to a newer socket.
          const translated = profile.feed(bytes);
          for (const reply of translated.replies) input(reply);
          term.write(translated.display, () => {
            if (socket === ws) {
              queued -= bytes.length;
              send({ type: 'ack', bytes: bytes.length });
            }
          });
        }else throw Error('Invalid terminal frame');
      }catch{disconnect('Terminal protocol or output limit error; no replay');}
    };
    ws.onclose=()=>{if(socket===ws)disconnect('Disconnected · reconnect explicitly; guest state is not inferred');};
    ws.onerror=()=>{if(socket===ws)disconnect('Connection unavailable · guest may still be running');};
  };
  $<HTMLButtonElement>('[data-acquire]').onclick=()=>{send({type:'acquire'});term.focus();};
  $<HTMLButtonElement>('[data-release]').onclick=()=>{send({type:'release'});owner=false;controls();};
  $<HTMLButtonElement>('[data-disconnect]').onclick=()=>disconnect();
  $<HTMLButtonElement>('[data-logout]').onclick=async()=>{disconnect('Signed out locally');selector.replaceChildren();$<HTMLButtonElement>("[data-refresh]").disabled=true;canInput=false;controls();const r=await fetch('/api/v1/logout',{method:'POST',headers:{'X-CSRF-Token':csrf}});csrf='';$<HTMLButtonElement>('[data-logout]').disabled=true;if(!r.ok)status.textContent='Local disconnect; server logout unconfirmed, session expiry still applies';};
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
