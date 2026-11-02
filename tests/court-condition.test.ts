import { describe, expect, it } from 'vitest';
import { courtCondition } from '../src/court-condition';
import type { RainAssessment } from '../src/types';

const radar = (score: number, confidence: RainAssessment['confidence'] = 'High'): RainAssessment => ({
  courtId: 'court-1', score, confidence, rain1h: 0, rain3h: 0, rain6h: 0, summary: '',
});

describe('court condition badge', () => {
  it('puts snow and ice risk ahead of a low-rain radar score', () => {
    expect(courtCondition({ rain: radar(100), winterCaution: { type: 'snow', lingering: false }, rainLoading: false }).kind).toBe('snow');
    expect(courtCondition({ rain: radar(100), winterCaution: { type: 'ice', lingering: true }, rainLoading: false }).kind).toBe('ice');
  });

  it('puts recent rain ahead of heat, then heat ahead of low recent rain', () => {
    expect(courtCondition({ rain: radar(60), heatCaution: { high: true }, rainLoading: false }).kind).toBe('rain');
    expect(courtCondition({ rain: radar(100), heatCaution: { high: true }, rainLoading: false }).kind).toBe('heat');
    expect(courtCondition({ rain: radar(100), rainLoading: false }).kind).toBe('dry');
  });

  it('does not imply conditions are dry when radar data is limited or absent', () => {
    expect(courtCondition({ rain: radar(100, 'Moderate'), rainLoading: false }).kind).toBe('limited');
    expect(courtCondition({ rainLoading: true }).kind).toBe('loading');
    expect(courtCondition({ rainLoading: false }).kind).toBe('unavailable');
  });
});
