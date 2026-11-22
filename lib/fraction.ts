/** Exact rational helpers for Quant answers (fractions + decimal equivalents). */

export type Rational = { n: number; d: number };

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x === 0 ? 1 : x;
}

export function reduce(n: number, d: number): Rational {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) {
    return { n: 0, d: 1 };
  }
  let num = n;
  let den = d;
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  return { n: num / g, d: den / g };
}

/** Canonical answer string: integer or reduced `n/d`. */
export function formatFraction(n: number, d: number): string {
  const r = reduce(n, d);
  if (r.d === 1) return String(r.n);
  return `${r.n}/${r.d}`;
}

function fromDecimalString(raw: string): Rational | null {
  const neg = raw.startsWith('-');
  const body = neg ? raw.slice(1) : raw;
  if (!/^\d+(\.\d+)?$/.test(body)) return null;
  if (!body.includes('.')) {
    const n = Number(body);
    if (!Number.isInteger(n)) return null;
    return reduce(neg ? -n : n, 1);
  }
  const [intPart, fracPart] = body.split('.');
  if (!fracPart || fracPart.length > 8) return null;
  const den = 10 ** fracPart.length;
  const num = Number(intPart) * den + Number(fracPart);
  if (!Number.isInteger(num)) return null;
  return reduce(neg ? -num : num, den);
}

/**
 * Parse user or canonical answer into a reduced rational.
 * Accepts `11/13`, `1/2`, `0.5`, `2`, `-3/4`.
 */
export function parseRational(input: string): Rational | null {
  const s = input.trim().replace(/\s+/g, '');
  if (!s || s === '-' || s === '/' || s === '-/' || s.endsWith('/')) return null;

  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length !== 2) return null;
    const [a, b] = parts;
    if (a === '' || a === '-' || b === '' || b === '-') return null;
    if (!/^-?\d+$/.test(a) || !/^-?\d+$/.test(b)) return null;
    const n = Number(a);
    const d = Number(b);
    if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) return null;
    return reduce(n, d);
  }

  return fromDecimalString(s);
}

/** True when both strings represent the same reduced rational. */
export function answersMatch(user: string, canonical: string): boolean {
  const a = parseRational(user);
  const b = parseRational(canonical);
  if (!a || !b) return false;
  return a.n === b.n && a.d === b.d;
}
