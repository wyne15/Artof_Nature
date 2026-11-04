import { escapeHtml } from "./escape";

/**
 * Hand-drawn SVG illustrations (placeholders until real photos exist).
 * They return SVG markup strings built only from constants, validated colours and escaped text.
 */
export type ArtInput = {
  name: string;
  category: "candles" | "skincare" | "gifts";
  artKind: "candle" | "tin" | "balm" | "tube" | "cream" | "set";
  artColor: string;
  artWax: string;
};

const TINT = { candles: ["#EFE6D0", "#E3D3AC"], skincare: ["#E6E9D3", "#D3DBB2"], gifts: ["#F1E3D2", "#E6CDAE"] } as const;
const hex = (v: string, fallback: string) => (/^#[0-9A-Fa-f]{6}$/.test(v) ? v : fallback);

function flame(x: number, y: number, s: number): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="flame"><path d="M0 -30 C-9 -14 -9 -4 0 3 C9 -4 9 -14 0 -30Z" fill="#F3B63F"/><path d="M0 -16 C-4 -9 -3 -4 0 0 C3 -4 4 -9 0 -16Z" fill="#FFF3C9"/></g></g>`;
}

export function hexPts(cx: number, cy: number, r: number): string {
  const a: string[] = [];
  for (let i = 0; i < 6; i++) {
    const t = (Math.PI / 180) * (60 * i - 30);
    a.push(`${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`);
  }
  return a.join(" ");
}

function label(x: number, y: number, w: number, h: number): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#FFFDF8"/><polygon points="${hexPts(x + w / 2, y + h / 2 - 3, 8)}" fill="none" stroke="#5C6B2E" stroke-width="1.6"/><rect x="${x + w / 2 - 12}" y="${y + h - 11}" width="24" height="2.2" rx="1" fill="#5C6B2E" opacity=".55"/>`;
}

function prod(p: ArtInput): string {
  const c = hex(p.artColor, "#C9993A");
  const w = hex(p.artWax, "#EBCB7D");
  switch (p.artKind) {
    case "candle":
      return `<rect x="56" y="100" width="88" height="118" rx="13" fill="${c}"/><rect x="63" y="112" width="74" height="100" rx="8" fill="${w}"/><ellipse cx="100" cy="112" rx="37" ry="7" fill="${w}"/><ellipse cx="100" cy="112" rx="37" ry="7" fill="#fff" opacity=".25"/>${label(76, 142, 48, 48)}<rect x="99" y="94" width="2.4" height="19" rx="1" fill="#3B2F1E"/>${flame(100, 98, 1.05)}`;
    case "tin":
    case "balm": {
      const s = p.artKind === "tin" ? 1 : 0.8;
      return `<g transform="translate(${100 - 100 * s} ${40 * (1 - s) + (p.artKind === "balm" ? 18 : 0)}) scale(${s})"><rect x="40" y="150" width="120" height="48" rx="8" fill="${c}"/><ellipse cx="100" cy="150" rx="60" ry="15" fill="${c}"/><ellipse cx="100" cy="150" rx="60" ry="15" fill="#fff" opacity=".22"/><ellipse cx="100" cy="150" rx="46" ry="10" fill="#FFFDF8"/><polygon points="${hexPts(100, 150, 7)}" fill="none" stroke="#5C6B2E" stroke-width="1.6"/></g>`;
    }
    case "tube":
      return `<rect x="82" y="92" width="36" height="122" rx="9" fill="#FFFDF8"/><rect x="82" y="148" width="36" height="26" fill="${c}" opacity=".9"/><polygon points="${hexPts(100, 161, 7)}" fill="none" stroke="#FFFDF8" stroke-width="1.6"/><rect x="82" y="70" width="36" height="34" rx="9" fill="${c}"/><rect x="82" y="96" width="36" height="8" fill="${c}" opacity=".6"/>`;
    case "cream":
      return `<rect x="48" y="142" width="104" height="72" rx="13" fill="${w}"/><rect x="42" y="118" width="116" height="30" rx="8" fill="${c}"/><rect x="42" y="118" width="116" height="30" rx="8" fill="#fff" opacity=".15"/>${label(78, 160, 44, 40)}`;
    case "set":
      return `<rect x="38" y="134" width="124" height="82" rx="7" fill="${c}"/><rect x="32" y="116" width="136" height="26" rx="6" fill="${c}"/><rect x="32" y="116" width="136" height="26" rx="6" fill="#000" opacity=".1"/><rect x="92" y="116" width="16" height="100" fill="#D4A843"/><ellipse cx="90" cy="108" rx="14" ry="9" fill="none" stroke="#D4A843" stroke-width="5"/><ellipse cx="110" cy="108" rx="14" ry="9" fill="none" stroke="#D4A843" stroke-width="5"/><circle cx="100" cy="112" r="5" fill="#D4A843"/>`;
  }
}

const SPRIG = `<g stroke="#5C6B2E" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"><path d="M26 236 C30 190 38 160 52 130"/><path d="M34 196 C24 192 20 184 22 178 M38 180 C48 176 52 168 50 162 M44 160 C34 158 30 150 32 144"/></g><g fill="#5C6B2E" opacity=".4"><ellipse cx="22" cy="178" rx="5" ry="9" transform="rotate(-30 22 178)"/><ellipse cx="50" cy="161" rx="5" ry="9" transform="rotate(30 50 161)"/><ellipse cx="32" cy="144" rx="5" ry="9" transform="rotate(-30 32 144)"/></g>`;

/** variant 0 = product on a plain tint, 1 = close-up with a sprig. `cls` is added to the <svg>. */
export function productArt(p: ArtInput, variant: 0 | 1, cls = "", ariaLabel?: string): string {
  const t = TINT[p.category][variant];
  const inner = `<ellipse cx="100" cy="220" rx="56" ry="7" fill="#2A2615" opacity=".14"/>${prod(p)}`;
  const body = variant ? `${SPRIG}<g transform="translate(-36 -60) scale(1.36)">${inner}</g>` : inner;
  const label = ariaLabel ? ` role="img" aria-label="${escapeHtml(ariaLabel)}"` : ' aria-hidden="true"';
  return `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice"${label}><rect width="200" height="250" fill="${t}"/>${body}</svg>`;
}

/** Third gallery slide on the product page. */
export function pouredArt(category: ArtInput["category"], ariaLabel: string): string {
  const t = TINT[category][1];
  return `<svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeHtml(ariaLabel)}"><rect width="200" height="250" fill="${t}"/><g transform="translate(100 125)"><polygon points="${hexPts(0, 0, 52)}" fill="#EBCB7D" stroke="#5C6B2E" stroke-width="2.4"/><polygon points="${hexPts(0, 0, 34)}" fill="none" stroke="#5C6B2E" stroke-width="1.6" opacity=".6"/></g><g transform="translate(76 101)" style="color:#2F3817"><svg width="48" height="48" viewBox="0 0 64 64"><use href="#beeico"/></svg></g></svg>`;
}

export function heroArt(ariaLabel: string): string {
  let g = "";
  g += '<rect width="560" height="620" fill="none"/>';
  g += '<circle cx="318" cy="330" r="250" fill="#D4A843" opacity=".05"/><circle cx="318" cy="330" r="178" fill="#D4A843" opacity=".08"/><circle cx="318" cy="330" r="112" fill="#D4A843" opacity=".13"/>';
  g += '<rect x="0" y="520" width="560" height="100" fill="#1E2410"/><rect x="0" y="520" width="560" height="4" fill="#D4A843" opacity=".25"/>';
  g += '<ellipse cx="318" cy="524" rx="150" ry="14" fill="#000" opacity=".28"/>';
  g += '<rect x="224" y="344" width="188" height="178" rx="20" fill="#C9993A"/><rect x="236" y="362" width="164" height="154" rx="12" fill="#EBCB7D"/><ellipse cx="318" cy="362" rx="82" ry="13" fill="#F1D893"/>';
  g += `<rect x="262" y="410" width="112" height="82" rx="5" fill="#FFFDF8"/><polygon points="${hexPts(318, 438, 17)}" fill="none" stroke="#5C6B2E" stroke-width="2.4"/><rect x="288" y="468" width="60" height="3" rx="1.5" fill="#5C6B2E" opacity=".55"/>`;
  g += `<rect x="316" y="322" width="4" height="42" rx="2" fill="#3B2F1E"/>${flame(318, 330, 2.6)}`;
  g += `<rect x="96" y="420" width="92" height="102" rx="10" fill="#E9DFC6"/><rect x="96" y="420" width="92" height="102" rx="10" fill="#000" opacity=".08"/><ellipse cx="142" cy="420" rx="46" ry="8" fill="#F5ECD5"/><rect x="140" y="394" width="3" height="28" rx="1.5" fill="#3B2F1E"/>${flame(141.5, 400, 1.3)}`;
  g += `<ellipse cx="456" cy="508" rx="58" ry="14" fill="#5C6B2E"/><rect x="398" y="480" width="116" height="28" rx="6" fill="#5C6B2E"/><ellipse cx="456" cy="480" rx="58" ry="14" fill="#7A8A42"/><ellipse cx="456" cy="480" rx="44" ry="9" fill="#FFFDF8"/><polygon points="${hexPts(456, 480, 6.5)}" fill="none" stroke="#5C6B2E" stroke-width="1.6"/>`;
  g += '<g fill="#D4A843"><circle class="mote" cx="200" cy="250" r="3" opacity=".7"/><circle class="mote" cx="430" cy="210" r="2.4" opacity=".6" style="animation-delay:-3s"/><circle class="mote" cx="360" cy="150" r="2" opacity=".5" style="animation-delay:-5s"/><circle class="mote" cx="270" cy="140" r="2.6" opacity=".6" style="animation-delay:-7s"/><circle class="mote" cx="480" cy="330" r="2.2" opacity=".5" style="animation-delay:-2s"/></g>';
  return `<svg class="scene" viewBox="0 0 560 620" role="img" aria-label="${escapeHtml(ariaLabel)}">${g}</svg>`;
}

export function honeycombArt(ariaLabel: string): string {
  const R = 46;
  const dx = R * Math.sqrt(3);
  const pos: [number, number, string][] = [[0, 0, "#D4A843"], [dx, 0, "#EBCB7D"], [-dx, 0, "none"], [dx / 2, R * 1.5, "#C9993A"], [-dx / 2, R * 1.5, "#EBCB7D"], [dx / 2, -R * 1.5, "none"], [-dx / 2, -R * 1.5, "#D4A843"], [dx * 1.5, R * 1.5, "none"], [-dx * 1.5, R * 1.5, "#EBCB7D"], [0, R * 3, "#D4A843"], [dx, R * 3, "none"], [-dx, R * 3, "#C9993A"], [0, -R * 3, "#EBCB7D"], [dx, -R * 3, "#D4A843"]];
  const cells = pos.map(([x, y, f]) => `<polygon points="${hexPts(300 + x, 300 + y, R - 2)}" fill="${f}" stroke="#5C6B2E" stroke-width="2.4" stroke-opacity=".7"/>`).join("");
  return `<svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeHtml(ariaLabel)}"><rect width="600" height="600" fill="#EFE6D0"/>${cells}<g transform="translate(262 252) rotate(-14)" style="color:#2F3817"><svg width="80" height="80" viewBox="0 0 64 64"><use href="#beeico"/></svg></g></svg>`;
}
