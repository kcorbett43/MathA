import assert from 'node:assert/strict';
import { generateQuestion } from '../lib/generators';
import {
  competitionAnswerMatches,
  competitionIndex,
  MULTIPLICATION_PROFILES,
  DIVISION_PROFILES,
} from '../lib/generators/competition';
import { ADDITION_PROFILES } from '../lib/generators/competitionAdditionProfiles';
import {
  COMPETITION_MODES, MODES, DURATIONS, parseGameMode, parseDurationMinutes, pointsPerCorrect,
} from '../lib/types';

assert.equal(MODES.length, 3, 'Drill retains its three modes');
assert.equal(COMPETITION_MODES.length, 3);
for (const { id } of COMPETITION_MODES) {
  assert.equal(parseGameMode([id]), id);
  for (const duration of DURATIONS) assert.equal(parseDurationMinutes(String(duration)), duration);
}
assert.equal(parseGameMode('invalid'), 'arithmetic');
assert.equal(competitionIndex(-5), 0);
assert.equal(competitionIndex(5000), 59);
assert.equal(competitionIndex(NaN), 0);

// Explicit source boundaries catch an accidental shift in the sample progression.
assert.deepEqual(MULTIPLICATION_PROFILES[5], [1, 1]);
assert.deepEqual(MULTIPLICATION_PROFILES[6], [2, 1]);
assert.deepEqual(MULTIPLICATION_PROFILES[13], [3, 1]);
assert.deepEqual(MULTIPLICATION_PROFILES[20], [2, 2]);
assert.deepEqual(MULTIPLICATION_PROFILES[40], [3, 2]);
assert.deepEqual(MULTIPLICATION_PROFILES[55], [3, 3]);
assert.deepEqual(DIVISION_PROFILES[7], [1, 1]);
assert.deepEqual(DIVISION_PROFILES[8], [2, 1]);
assert.deepEqual(DIVISION_PROFILES[15], [3, 1]);
assert.deepEqual(DIVISION_PROFILES[20], [2, 2]);
assert.deepEqual(DIVISION_PROFILES[55], [3, 3]);
assert.equal(ADDITION_PROFILES[0].length, 4);
assert.equal(ADDITION_PROFILES[35].length, 10);
assert.ok(ADDITION_PROFILES.slice(40).every((p) => p.length === 10));

let checked = 0;
for (const { id } of COMPETITION_MODES) {
  for (let index = 0; index < 85; index++) {
    for (let trial = 0; trial < 50; trial++) {
      const q = generateQuestion(id, index);
      const i = Math.min(index, 59);
      const answer = Number(q.answer);
      assert.ok(Number.isFinite(answer));
      assert.ok(competitionAnswerMatches(q.answer, q.answer));
      if (id === 'competitionAddition') {
        assert.ok(q.terms);
        assert.equal(q.terms.length, ADDITION_PROFILES[i].length);
        // Independently sum integer hundredths parsed from the displayed operands.
        const scale = i >= 40 ? 100 : 1;
        const sum = q.terms.reduce((n, term) => n + Math.round(Number(term) * scale), 0);
        assert.equal(Math.round(answer * scale), sum);
        if (i >= 40) assert.ok(q.terms.every((t) => /^-?\d+\.\d{2}$/.test(t)));
      } else {
        const [a, b] = q.prompt.split(id === 'competitionDivision' ? ' ÷ ' : ' × ').map(Number);
        assert.equal(answer, id === 'competitionDivision' ? a / b : a * b);
        assert.equal(Number.isInteger(answer), true);
        const widths = id === 'competitionDivision' ? DIVISION_PROFILES[i] : MULTIPLICATION_PROFILES[i];
        assert.equal(String(id === 'competitionDivision' ? answer : a).length, widths[0]);
        assert.equal(String(b).length, widths[1]);
      }
      checked++;
    }
  }
}
for (const [input, expected] of [['.5', '0.50'], ['-0.5', '-0.50'], ['12.3', '12.30'], ['12', '12.00'], ['0', '0.00']]) {
  assert.ok(competitionAnswerMatches(input, expected));
}
for (const input of ['', '-', '.', '-.', '1..2', '1/2', 'NaN', 'Infinity', ' 1', '1e0']) {
  assert.equal(competitionAnswerMatches(input, '1'), false, input);
}
assert.equal(competitionAnswerMatches('12.31', '12.30'), false);
assert.equal(pointsPerCorrect('competitionMultiplication'), 5);
assert.equal(pointsPerCorrect('competitionDivision'), 5);
assert.equal(pointsPerCorrect('competitionAddition'), 10);
assert.equal(pointsPerCorrect('arithmetic'), 1);
console.log(`Competition tests passed: ${checked} generated questions, progression boundaries, decimal answers, scoring and duration options.`);
