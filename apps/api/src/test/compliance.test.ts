import { describe, expect, it } from 'vitest';
import { sanitizeNarrative, trustBand } from '../utils/disclaimers.js';

describe('compliance text filters', () => {
  it('removes forbidden advisory phrases', () => {
    const input = 'You should buy this stock now for guaranteed profit.';
    const output = sanitizeNarrative(input);

    expect(output.toLowerCase()).not.toContain('you should buy');
    expect(output.toLowerCase()).not.toContain('guaranteed profit');
  });
});

describe('trust band mapping', () => {
  it('maps scores into deterministic labels', () => {
    expect(trustBand(82)).toBe('STRONG');
    expect(trustBand(70)).toBe('WATCH');
    expect(trustBand(44)).toBe('RISKY');
    expect(trustBand(10)).toBe('AVOID');
  });
});
