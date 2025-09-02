export function clampSlippageBp(bp?: number) {
  const n = Number(bp ?? 100);
  return Math.min(500, Math.max(10, Math.floor(n)));
}
