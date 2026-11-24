export type GameMode = 'arithmetic' | 'arithmeticPro' | 'sequence';

/** Session length in minutes. `0.5` is the 30-second option. */
export type DurationMinutes = 0.5 | 1 | 2 | 3 | 4 | 5;

export type TimeRange = 'all' | 'year' | 'month' | 'week' | 'day';

export type Question = {
  prompt: string;
  /** Canonical answer string (OpenQuant-style equality). */
  answer: string;
};

export type SessionScore = {
  id: string;
  mode: GameMode;
  durationMinutes: DurationMinutes;
  score: number;
  attempted: number;
  completedAt: string; // ISO timestamp
};

export const MODES: { id: GameMode; label: string; blurb: string }[] = [
  { id: 'arithmetic', label: 'Arithmetic', blurb: 'Integers + − × ÷' },
  { id: 'arithmeticPro', label: 'Arithmetic Pro', blurb: 'Order of operations' },
  { id: 'sequence', label: 'Sequence', blurb: 'Find the next term' },
];

export const DURATIONS: DurationMinutes[] = [0.5, 1, 2, 3, 4, 5];

export const DEFAULT_DURATION_MINUTES: DurationMinutes = 2;

export const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'year', label: 'Year' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];

export function modeLabel(mode: GameMode): string {
  return MODES.find((m) => m.id === mode)?.label ?? mode;
}

export function durationLabel(durationMinutes: DurationMinutes): string {
  if (durationMinutes < 1) {
    return `${Math.round(durationMinutes * 60)} sec`;
  }
  return `${durationMinutes} min`;
}

export function parseDurationMinutes(
  raw: string | string[] | undefined,
): DurationMinutes {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value ?? DEFAULT_DURATION_MINUTES);
  if ((DURATIONS as number[]).includes(n)) {
    return n as DurationMinutes;
  }
  return DEFAULT_DURATION_MINUTES;
}
