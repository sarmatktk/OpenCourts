import { describe, expect, it } from 'vitest';
import { eligibleForReview } from '../src/ReviewPrompt';

describe('Google Play review eligibility', () => {
  it('accepts two directions requests', () => {
    expect(eligibleForReview({ directions: 2, courtIds: [], sections: [] })).toBe(true);
  });

  it('accepts exploring three different courts', () => {
    expect(eligibleForReview({ directions: 0, courtIds: ['a', 'b', 'c'], sections: [] })).toBe(true);
  });

  it('accepts a court followed by dry courts and weather', () => {
    expect(eligibleForReview({ directions: 0, courtIds: ['a'], sections: ['dry', 'weather'] })).toBe(true);
  });

  it('does not interrupt a user after light browsing', () => {
    expect(eligibleForReview({ directions: 1, courtIds: ['a', 'b'], sections: ['dry'] })).toBe(false);
    expect(eligibleForReview({ directions: 0, courtIds: [], sections: ['dry', 'weather'] })).toBe(false);
  });
});
