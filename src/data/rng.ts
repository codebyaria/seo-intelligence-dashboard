/**
 * Deterministic seedable PRNG (Mulberry32).
 *
 * Why: portfolio demo data must be reproducible across builds so reviewers
 * see identical numbers on every visit and Vitest snapshots are stable.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return function rng(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inclusive integer in [min, max]. */
export function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Pick one element from a non-empty array. */
export function pickOne<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}
