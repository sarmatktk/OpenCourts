import type { RainAssessment } from './types';

export type CourtCondition = { kind: 'snow' | 'ice' | 'rain' | 'heat' | 'dry' | 'loading' | 'limited' | 'unavailable'; label: string };

export function courtCondition({ rain, winterCaution, heatCaution, rainLoading, international }: {
  rain?: RainAssessment;
  winterCaution?: { type: 'snow' | 'ice'; lingering: boolean };
  heatCaution?: { high: boolean } | null;
  rainLoading: boolean;
  international?: boolean;
}): CourtCondition {
  if (winterCaution) return { kind: winterCaution.type, label: `${winterCaution.type === 'ice' ? 'Ice' : 'Snow'} risk · check surface` };
  if (rain?.confidence === 'High' && rain.score < 70) return { kind: 'rain', label: 'Recent rain · check surface' };
  if (heatCaution) return { kind: 'heat', label: heatCaution.high ? 'High heat caution' : 'Heat caution' };
  if (rain?.source === 'forecast') return { kind: 'limited', label: `${rain.forecastRainChance}% rain chance · forecast estimate` };
  if (international) return { kind: rainLoading ? 'loading' : 'unavailable', label: rainLoading ? 'Checking area forecast' : 'Area forecast unavailable' };
  if (rain?.confidence === 'High') return { kind: 'dry', label: 'Low recent rain' };
  if (rain) return { kind: 'limited', label: 'Radar data limited' };
  if (rainLoading) return { kind: 'loading', label: 'Checking recent rain' };
  return { kind: 'unavailable', label: 'Radar data unavailable' };
}
