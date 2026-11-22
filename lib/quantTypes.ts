import type { Question } from '@/lib/types';

export type QuantSkillId = 'dice' | 'urns' | 'ev';

export type QuantSkill = {
  id: QuantSkillId;
  label: string;
  blurb: string;
  /** Fixed questions per session (Practice-like). */
  questionCount: number;
};

export const QUANT_SKILLS: QuantSkill[] = [
  {
    id: 'dice',
    label: 'Dice & counting',
    blurb: 'Equally likely outcomes — P(sum = k) on fair dice',
    questionCount: 12,
  },
  {
    id: 'urns',
    label: 'Urns & conditional',
    blurb: 'Without replacement — conditional draws from a bag',
    questionCount: 12,
  },
  {
    id: 'ev',
    label: 'Expected value',
    blurb: 'One-shot EV and linearity of expectation',
    questionCount: 10,
  },
];

export function quantSkillById(id: string | undefined): QuantSkill | undefined {
  return QUANT_SKILLS.find((s) => s.id === id);
}

export type QuantQuestion = Question & {
  skillId: QuantSkillId;
  /** Short strategy cue (optional hint). */
  hint?: string;
};

export type QuantReviewItem = {
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
};
