export type DrillMode = 'arithmetic' | 'arithmeticPro' | 'sequence';
export type CompetitionMode = 'competitionMultiplication' | 'competitionDivision' | 'competitionAddition';
export type GameMode = DrillMode | CompetitionMode;

/** Session length in minutes. `0.5` is the 30-second option. */
export type DurationMinutes = 0.5 | 1 | 2 | 3 | 4 | 5;

export type TimeRange = 'all' | 'year' | 'month' | 'week' | 'day';

export type Question = {
  prompt: string;
  /** Signed vertical operands for competition sums. */
  terms?: string[];
  /** Canonical answer string (OpenQuant-style equality). */
  answer: string;
};

export type SessionScore = {
  id: string;
  mode: GameMode;
  durationMinutes: DurationMinutes;
  score: number;
  attempted: number;
  correct?: number; // Older drill sessions use score as their correct count.
  completedAt: string; // ISO timestamp
};

export const MODES: { id: DrillMode; label: string; blurb: string }[] = [
  { id: 'arithmetic', label: 'Arithmetic', blurb: 'Integers + − × ÷' },
  { id: 'arithmeticPro', label: 'Arithmetic Pro', blurb: 'Order of operations' },
  { id: 'sequence', label: 'Sequence', blurb: 'Find the next term' },
];

export const COMPETITION_MODES: { id: CompetitionMode; label: string; blurb: string }[] = [
  { id: 'competitionMultiplication', label: 'Competition Multiplication', blurb: 'Progress from 1 × 1 digits to 3 × 3 digits. 5 points per correct answer.' },
  { id: 'competitionDivision', label: 'Competition Division', blurb: 'Exact division with progressively larger divisors and quotients. 5 points per correct answer.' },
  { id: 'competitionAddition', label: 'Competition Addition & Subtraction', blurb: 'Vertical sums progress to ten signed decimal operands. 10 points per correct answer.' },
];

export const ALL_MODES = [...MODES, ...COMPETITION_MODES];

export function isCompetitionMode(mode: GameMode): mode is CompetitionMode {
  return COMPETITION_MODES.some((m) => m.id === mode);
}

export function parseGameMode(raw: string | string[] | undefined): GameMode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return ALL_MODES.find((m) => m.id === value)?.id ?? 'arithmetic';
}

export function pointsPerCorrect(mode: GameMode): number {
  return mode === 'competitionAddition' ? 10 : isCompetitionMode(mode) ? 5 : 1;
}

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
  return ALL_MODES.find((m) => m.id === mode)?.label ?? mode;
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
