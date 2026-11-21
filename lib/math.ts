export type Operator = '+' | '-' | '×';

export type Question = {
  left: number;
  right: number;
  operator: Operator;
  answer: number;
  prompt: string;
};

const OPERATORS: Operator[] = ['+', '-', '×'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOperator(): Operator {
  return OPERATORS[randomInt(0, OPERATORS.length - 1)];
}

export function generateQuestion(): Question {
  const operator = pickOperator();

  if (operator === '+') {
    const left = randomInt(1, 50);
    const right = randomInt(1, 50);
    return {
      left,
      right,
      operator,
      answer: left + right,
      prompt: `${left} + ${right}`,
    };
  }

  if (operator === '-') {
    const left = randomInt(10, 99);
    const right = randomInt(1, left);
    return {
      left,
      right,
      operator,
      answer: left - right,
      prompt: `${left} − ${right}`,
    };
  }

  // Multiplication: keep products mental-math friendly
  const left = randomInt(2, 12);
  const right = randomInt(2, 12);
  return {
    left,
    right,
    operator,
    answer: left * right,
    prompt: `${left} × ${right}`,
  };
}

export const SESSION_DURATION_SECONDS = 60;
