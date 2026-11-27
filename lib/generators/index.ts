import type { GameMode, Question } from '@/lib/types';

import { generateCompetitionQuestion } from './competition';

import { generateArithmeticQuestion } from './arithmetic';
import { generateArithmeticProQuestion } from './arithmeticPro';
import { generateSequenceQuestion } from './sequence';

export function generateQuestion(mode: GameMode, questionIndex = 0): Question {
  switch (mode) {
    case 'competitionMultiplication':
    case 'competitionDivision':
    case 'competitionAddition':
      return generateCompetitionQuestion(mode, questionIndex);
    case 'arithmetic':
      return generateArithmeticQuestion();
    case 'arithmeticPro':
      return generateArithmeticProQuestion();
    case 'sequence':
      return generateSequenceQuestion();
  }
}

export { generateArithmeticQuestion, generateArithmeticProQuestion, generateSequenceQuestion };
