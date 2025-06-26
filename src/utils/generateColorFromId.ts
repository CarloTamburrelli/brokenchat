export function generateColorFromId(userId: number | string): string {
  const hash = Array.from(String(userId))
    .reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

  const color = `#${(hash >>> 0).toString(16).padStart(6, '0').slice(0, 6)}`;
  return normalizeColor(color);
}

function normalizeColor(hex: string): string {
  const clamp = (value: number) => Math.max(60, Math.min(200, value));
  const r = clamp(parseInt(hex.slice(1, 3), 16));
  const g = clamp(parseInt(hex.slice(3, 5), 16));
  const b = clamp(parseInt(hex.slice(5, 7), 16));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
