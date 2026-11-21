/** Inclusive integer in [lo, hi]. */
export function randInt(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

export function pick<T>(items: readonly T[]): T {
  return items[randInt(0, items.length - 1)];
}
