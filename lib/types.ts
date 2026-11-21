export type GameMode = 'arithmetic' | 'arithmeticPro' | 'sequence';

export type DurationMinutes = 1 | 2 | 3 | 4 | 5;

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

export const DURATIONS: DurationMinutes[] = [1, 2, 3, 4, 5];

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
