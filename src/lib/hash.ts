// Simple hash function for deterministic color generation
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Generate a number between 0 and max from a hash
export function hashToRange(hash: number, max: number): number {
  return hash % max;
}

// Generate a color from a hash value
export function hashToColor(hash: number): string {
  const hue = hashToRange(hash, 360);
  const saturation = 70 + hashToRange(hash >> 8, 30); // 70-100%
  const lightness = 45 + hashToRange(hash >> 16, 20); // 45-65%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Convert HSL to hex
export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
