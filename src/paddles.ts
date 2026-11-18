/** Photo-calibrated molded faces, 32 × 90 reference units. Fixed pigment and
 * mechanical pose are independent. Rounded edges and the hidden pivot remain photographic approximations. */
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
    <linearGradient id="p-${color}-raised" x2="1" y2="0"><stop stop-color="${c[3]}"/><stop offset=".6" stop-color="#170e13"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>
    <g id="p-${color}-down">
      <path d="M0 1H32V90H0Z" fill="#100e11"/>
      <path d="M.6 2.8Q16 .4 32.2 2.5L29 38Q28.5 42 27.5 43L3.1 43.8Q2.1 42.4 2 39Z" fill="url(#p-${color}-upper)"/>
      <path d="M32.2 2.5L33 82.7Q32.7 87 30.7 88.5L28.1 66 27.5 43 29 38Z" fill="${c[3]}"/>
      <path d="M3.1 43.8Q15.5 44.6 27.5 43L28.1 47Q15.5 48.2 2.6 47.5Z" fill="${c[3]}"/>
      <path d="M2.6 47.5Q15.5 48.2 28.1 47C27.8 59 30.6 75 32.3 84Q32.4 87.2 30.7 88.5L3.2 89Q.7 88.5 .7 85.8C1.2 72 4 60 2.6 47.5Z" fill="url(#p-${color}-lower)"/>
      <path d="M.7 85.8Q15.8 87.9 32.3 84Q32.4 88.7 29.6 89.6L3.2 90Q.5 89.7 .7 85.8Z" fill="${c[3]}"/>
      <path d="M1.7 3.4Q16 1.7 31 3.2M3.5 48.1Q15.7 48.8 27 47.7" fill="none" stroke="${c[4]}" stroke-opacity=".3" stroke-width=".7"/>
    </g>
    <g id="p-${color}-up">
      <path d="M0 1H32V90H0Z" fill="#100e11"/>
      <path d="M.7 3.5Q16 .8 32.1 2.8L29.9 10.3Q16.7 11.5 3.7 10.8Z" fill="${c[4]}"/>
      <path d="M3.7 10.8Q16.7 11.5 29.9 10.3C28.2 31 28.2 52 31.5 76Q32.7 83 31.6 87.7Q16 89.7 .6 87.8C3.8 66 5.4 35 3.7 10.8Z" fill="url(#p-${color}-raised)"/>
      <path d="M32.1 2.8L32.8 83Q32.6 87 31.6 87.7L29.4 74C27.9 51 27.8 31 29.9 10.3ZM.7 3.5L3.7 10.8C5.4 35 3.8 66 .6 87.8L.2 82C2.9 55 3.2 30 .7 3.5Z" fill="${c[2]}" fill-opacity=".42"/>
      <path d="M.6 87.8Q16 89.1 31.6 87.7Q31.1 90 28.8 90L3.4 90Q1.2 89.9 .6 87.8Z" fill="${c[2]}" fill-opacity=".48"/>
      <path d="M1.8 3.7Q16 2 31 3.5M4.5 11.2Q16.5 11.8 29 10.8" fill="none" stroke="${c[0]}" stroke-width=".7"/>
    </g>
    <g id="p-${color}-rest">
      <path d="M0 1H32V90H0Z" fill="#100e11"/>
      <path d="M.9 5.5Q16 3.7 31.8 4.7L29 28.2Q28.8 30 27.8 30.8L3.3 31.5Q2.2 30.4 2.1 28Z" fill="url(#p-${color}-upper)"/>
      <path d="M3.3 31.5Q15.5 32.3 27.8 30.8C28.2 46 29.6 68 32.2 82.3Q32.6 84.6 30.8 85.5L2.7 86Q.9 85.8 1 83.6C2.2 64 3.5 48 3.3 31.5Z" fill="url(#p-${color}-lower)"/>
      <path d="M1 83.6Q16 85.7 32.2 82.3Q32.6 87.2 29.4 88.3L3.1 89Q.8 88.1 1 83.6Z" fill="${c[1]}"/>
      <path d="M31.8 4.7L33 82.5Q32.8 86.1 29.4 88.3L30.8 85.5 27.8 30.8 29 28.2Z" fill="${c[3]}"/>
      <path d="M2 6.1Q16 4.7 30.8 5.5M2.2 84.6Q16 86 30.9 83.5" fill="none" stroke="${c[4]}" stroke-opacity=".28" stroke-width=".7"/>
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
