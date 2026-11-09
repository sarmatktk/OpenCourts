import type { Court, Forecast, RainAssessment } from './types';

/** Area forecast guidance only; rainfall amounts and surface dryness are unknown. */
export function internationalRainAssessments(courts: Court[], periods: Forecast[], now = Date.now()): RainAssessment[] {
  const end = now + 6 * 60 * 60_000;
  const upcoming = periods.filter(period => {
    const start = Date.parse(period.time);
    const finish = period.endTime ? Date.parse(period.endTime) : start + 60 * 60_000;
    return start < end && finish > now && Number.isFinite(period.precip) && period.precip >= 0 && period.precip <= 100 && period.precipKnown !== false;
  }).sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  // Require coverage of the entire window, including the current hour.
  let coveredUntil = now;
  let weightedChance = 0;
  for (const period of upcoming) {
    const start = Date.parse(period.time);
    const finish = Math.min(end, period.endTime ? Date.parse(period.endTime) : start + 60 * 60_000);
    if (start > coveredUntil) return [];
    const duration = Math.max(0, finish - coveredUntil);
    weightedChance += period.precip * duration;
    coveredUntil = Math.max(coveredUntil, finish);
  }
  if (coveredUntil < end) return [];
  const chance = Math.round(weightedChance / (end - now));
  return courts.map(court => ({ courtId: court.id, source: 'forecast', forecastRainChance: chance,
    rain1h: null, rain3h: null, rain6h: null, score: 100 - chance, confidence: 'Moderate',
    summary: `${chance}% average hourly rain chance over the next 6 hours`,
  }));
}
