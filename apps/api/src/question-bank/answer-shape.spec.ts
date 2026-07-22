import { isResponseCorrect, validateAnswerShape } from './answer-shape';

describe('isResponseCorrect (server-side scoring)', () => {
  it('single choice: exact key', () => {
    expect(isResponseCorrect('SINGLE_CHOICE', ['C'], 'C')).toBe(true);
    expect(isResponseCorrect('SINGLE_CHOICE', ['C'], 'A')).toBe(false);
    expect(isResponseCorrect('SINGLE_CHOICE', ['C'], null)).toBe(false);
  });

  it('multiple choice: set equality (order-insensitive, no partials)', () => {
    expect(isResponseCorrect('MULTIPLE_CHOICE', ['A', 'C'], ['C', 'A'])).toBe(true);
    expect(isResponseCorrect('MULTIPLE_CHOICE', ['A', 'C'], ['A'])).toBe(false);
    expect(isResponseCorrect('MULTIPLE_CHOICE', ['A', 'C'], ['A', 'C', 'D'])).toBe(false);
  });

  it('true/false: case-insensitive', () => {
    expect(isResponseCorrect('TRUE_FALSE', ['TRUE'], 'true')).toBe(true);
    expect(isResponseCorrect('TRUE_FALSE', ['FALSE'], 'TRUE')).toBe(false);
  });

  it('numeric: within tolerance', () => {
    expect(isResponseCorrect('NUMERIC', { value: 42 }, 42)).toBe(true);
    expect(isResponseCorrect('NUMERIC', { value: 42, tolerance: 1 }, 42.5)).toBe(true);
    expect(isResponseCorrect('NUMERIC', { value: 42 }, 43)).toBe(false);
  });

  it('match: all pairs present', () => {
    const correct = [{ left: '1', right: 'A' }, { left: '2', right: 'B' }];
    expect(isResponseCorrect('MATCH', correct, [{ left: '2', right: 'B' }, { left: '1', right: 'A' }])).toBe(true);
    expect(isResponseCorrect('MATCH', correct, [{ left: '1', right: 'B' }, { left: '2', right: 'A' }])).toBe(false);
  });
});

describe('validateAnswerShape (import/create guard)', () => {
  it('rejects a single-choice with two correct keys', () => {
    expect(() => validateAnswerShape('SINGLE_CHOICE', [{ key: 'A' }, { key: 'B' }], ['A', 'B'])).toThrow();
  });
  it('rejects a correct key not among options', () => {
    expect(() => validateAnswerShape('SINGLE_CHOICE', [{ key: 'A' }, { key: 'B' }], ['C'])).toThrow();
  });
  it('accepts a valid numeric answer', () => {
    expect(() => validateAnswerShape('NUMERIC', [], { value: 10 })).not.toThrow();
  });
  it('rejects true/false that is not TRUE/FALSE', () => {
    expect(() => validateAnswerShape('TRUE_FALSE', [], ['MAYBE'])).toThrow();
  });
});
