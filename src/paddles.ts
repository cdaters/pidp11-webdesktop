/** Photo-calibrated molded faces, 32 × 90 reference units. Fixed pigment and
 * mechanical pose are independent. Hidden pivot curvature is an approximation. */
export type PaddleColor = "red" | "purple" | "cream";
export type PaddlePose = "up" | "down" | "rest";
export const registerColor = (bit: number): PaddleColor => Math.floor(bit / 3) % 2 ? "red" : "purple";
export function paddleDefinitions() {
  const pigments = {
    red: ["#cd294c", "#b91e3c", "#70464d", "#321013", "#d9556c"],
    purple: ["#783257", "#602447", "#544147", "#1f1119", "#a34c80"],
    cream: ["#eae0be", "#c9bd96", "#998c6d", "#4c4437", "#f5edcf"],
  };
  return `<defs>${Object.entries(pigments).map(([color, c]) => `
    <linearGradient id="p-${color}-upper" x2="0" y2="1"><stop stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>
    <linearGradient id="p-${color}-lower" x2="0" y2="1"><stop stop-color="${c[2]}"/><stop offset="1" stop-color="${c[3]}"/></linearGradient>
    <linearGradient id="p-${color}-raised" x2="1" y2="0"><stop stop-color="${c[3]}"/><stop offset=".72" stop-color="#170e13"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>
    <g id="p-${color}-down">
      <path d="M0 1H32V90H0Z" fill="#100e11"/>
      <path d="M1 2Q16 0 31 2L27 41 3 42Z" fill="url(#p-${color}-upper)"/>
      <path d="M31 2L32 83 28 87 26 42Z" fill="${c[3]}"/>
      <path d="M3 42L27 41 27 48 3 49Z" fill="${c[3]}"/>
      <path d="M3 48L27 47Q27 65 31 85L2 87Q4 65 3 48Z" fill="url(#p-${color}-lower)"/>
      <path d="M2 87L31 85 30 89 3 90Z" fill="${c[3]}"/>
      <path d="M2 3Q16 1 30 3M3 49L26 48" fill="none" stroke="${c[4]}" stroke-opacity=".48" stroke-width=".7"/>
    </g>
    <g id="p-${color}-up">
      <path d="M0 1H32V90H0Z" fill="#100e11"/>
      <path d="M1 3Q16 0 31 2L28 12 4 13Z" fill="${c[4]}"/>
      <path d="M4 13L28 12Q25 41 31 85L2 88Q7 48 4 13Z" fill="url(#p-${color}-raised)"/>
      <path d="M31 2L32 86 30 89 29 69 28 12Z" fill="${c[3]}"/>
      <path d="M2 88L31 85 30 89 2 90Z" fill="${c[2]}"/>
      <path d="M2 3Q16 1 30 3M5 13L27 12" fill="none" stroke="${c[0]}" stroke-width=".7"/>
    </g>
    <g id="p-${color}-rest">
      <path d="M0 1H32V90H0Z" fill="#100e11"/>
      <path d="M2 5L30 4 28 30 4 31Z" fill="url(#p-${color}-upper)"/>
      <path d="M4 31L28 30 30 82 2 84Z" fill="url(#p-${color}-lower)"/>
      <path d="M2 84L30 82 29 88 3 89Z" fill="${c[1]}"/>
      <path d="M30 4L32 83 29 88 28 30Z" fill="${c[3]}"/>
      <path d="M3 6L29 5M3 85L29 83" stroke="${c[4]}" stroke-opacity=".45" stroke-width=".7"/>
    </g>`).join("")}</defs>`;
}
export function paddle(color: PaddleColor, pose: PaddlePose, x: number, y: number) {
  return `<use class="mechanical-paddle" data-color="${color}" data-pose="${pose}" href="#p-${color}-${pose}" transform="translate(${x} ${y})"/>`;
}
export function setPaddle(node: Element, pose: PaddlePose) {
  const use = node.querySelector<SVGUseElement>(".mechanical-paddle");
  if (use && use.dataset.pose !== pose) {
    use.dataset.pose = pose;
    use.setAttribute("href", `#p-${use.dataset.color}-${pose}`);
  }
}
