import { Tek4010, tekFixture } from "./tek4010.ts";

/** Fixture-only display: no socket, guest input, timers or external resources. */
export function mountTek4010(host: HTMLElement) {
  host.classList.add("tek-app");
  host.innerHTML = `<div class="app-heading"><h2>Tektronix 4010</h2><span class="source-tag">BYTE FIXTURE · NO GUEST</span></div>
    <p>Experimental storage-display parser. Draw the same byte sequence whole or one byte at a time.</p>
    <div class="terminal-toolbar"><button data-tek-draw>Draw fixture</button><button data-tek-split>Draw split bytes</button><button data-tek-erase>Erase display</button></div>
    <svg class="tek-display" viewBox="0 0 1024 781" role="img" aria-label="Tektronix 4010 fixture display"></svg>
    <p data-tek-status role="status">Blank display. No guest attached.</p>`;
  const parser = new Tek4010();
  const svg = host.querySelector<SVGSVGElement>("svg")!;
  const status = host.querySelector<HTMLElement>("[data-tek-status]")!;
  const render = () => {
    const nodes: SVGElement[] = [];
    for (const mark of parser.marks) {
      const node = document.createElementNS("http://www.w3.org/2000/svg", mark.kind === "line" ? "line" : "text");
      if (mark.kind === "line") {
        for (const [key, value] of Object.entries({ x1: mark.x1, y1: 780 - mark.y1, x2: mark.x2, y2: 780 - mark.y2 })) node.setAttribute(key, String(value));
      } else {
        node.setAttribute("x", String(mark.x)); node.setAttribute("y", String(780 - mark.y));
        node.textContent = mark.value;
      }
      nodes.push(node);
    }
    svg.replaceChildren(...nodes);
    status.textContent = `${parser.marks.length} stored marks · fixture only · 4,096 mark limit`;
  };
  const draw = (split: boolean) => {
    parser.reset();
    try {
      const bytes = tekFixture();
      if (split) for (const byte of bytes) parser.feed(new Uint8Array([byte]));
      else parser.feed(bytes);
      render();
    } catch (error) { status.textContent = (error as Error).message; }
  };
  host.querySelector<HTMLButtonElement>("[data-tek-draw]")!.onclick = () => draw(false);
  host.querySelector<HTMLButtonElement>("[data-tek-split]")!.onclick = () => draw(true);
  host.querySelector<HTMLButtonElement>("[data-tek-erase]")!.onclick = () => { parser.reset(); render(); };
}
