/** Parse `#rrggbb` to sRGB channels in 0–1 — same encoding as CSS / `<input type="color">`. */
export function parseHexColor(hex: string): [number, number, number, number] {
  const h = hex.replace(/^#/, "");
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return [r, g, b, 1];
  }
  return [1, 1, 1, 1];
}
