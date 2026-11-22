import type { QuantQuestion, QuantSkillId } from '@/lib/quantTypes';

import { generateDiceQuestion } from './dice';
import { generateEvQuestion } from './ev';
import { generateUrnQuestion } from './urns';

export function generateQuantQuestion(skillId: QuantSkillId): QuantQuestion {
  switch (skillId) {
    case 'dice':
      return generateDiceQuestion();
    case 'urns':
      return generateUrnQuestion();
    case 'ev':
      return generateEvQuestion();
  }
}

export { generateDiceQuestion, generateEvQuestion, generateUrnQuestion };
