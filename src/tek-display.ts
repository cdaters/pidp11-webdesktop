import type { Tek4010 } from "./tek4010.ts";

/** Render bounded marks as inert SVG. Both fixture and guest views use this path. */
export function renderTek(svg: SVGSVGElement, parser: Tek4010) {
  const nodes: SVGElement[] = [];
  for (const mark of parser.marks) {
    const node = document.createElementNS(
      "http://www.w3.org/2000/svg",
      mark.kind === "line" ? "line" : "text",
    );
    if (mark.kind === "line") {
      if (mark.style) node.setAttribute("stroke-dasharray", mark.style);
      for (const [key, value] of Object.entries({
        x1: mark.x1,
        y1: 780 - mark.y1,
        x2: mark.x2,
        y2: 780 - mark.y2,
      }))
        node.setAttribute(key, String(value));
    } else {
      node.setAttribute("x", String(mark.x));
      node.setAttribute("y", String(780 - mark.y));
      node.textContent = mark.value;
    }
    nodes.push(node);
  }
  svg.replaceChildren(...nodes);
  svg.style.cursor = parser.gin ? "crosshair" : "default";
}

/** Download only a caller-built in-memory artifact. No host paths or media attachment. */
export function saveArtifact(
  name: string,
  content: string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
