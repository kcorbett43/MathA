import type { GameMode, Question } from '@/lib/types';

import { generateArithmeticQuestion } from './arithmetic';
import { generateArithmeticProQuestion } from './arithmeticPro';
import { generateSequenceQuestion } from './sequence';

export function generateQuestion(mode: GameMode): Question {
  switch (mode) {
    case 'arithmetic':
      return generateArithmeticQuestion();
    case 'arithmeticPro':
      return generateArithmeticProQuestion();
    case 'sequence':
      return generateSequenceQuestion();
  }
}

export { generateArithmeticQuestion, generateArithmeticProQuestion, generateSequenceQuestion };
