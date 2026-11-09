import { ArrowUpRight, CircleHelp, CloudRain, Grid2X2, Lightbulb, LightbulbOff, LoaderCircle, Snowflake, Sun, ThermometerSun, ThermometerSnowflake, Users } from 'lucide-react';
import type { Court, RainAssessment } from './types';
import { courtCondition } from './court-condition';

function CourtGlyph() {
  return <span className="court-list-logo" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.5"/><path d="M8 6c4 3 6 6 6 10s-2 7-6 10M24 6c-4 3-6 6-6 10s2 7 6 10" stroke="currentColor" strokeWidth="2.5"/></svg></span>;
}

export default function CourtListItem({ court, distance, rain, winterCaution, heatCaution, rainLoading, selected, onSelect, international }: {
  international?: boolean;
  court: Court; distance: number; rain?: RainAssessment; winterCaution?: { type: 'snow' | 'ice'; lingering: boolean }; heatCaution?: { high: boolean } | null; rainLoading: boolean; selected: boolean; onSelect: () => void;
}) {
  const lighting = court.lighting === 'yes' ? 'Lighted' : court.lighting === 'no' ? 'Unlighted' : 'Lights unknown';
  const LightingIcon = court.lighting === 'yes' ? Lightbulb : court.lighting === 'no' ? LightbulbOff : CircleHelp;
  const condition = courtCondition({ rain, winterCaution, heatCaution, rainLoading, international });
  const ConditionIcon = condition.kind === 'snow' ? Snowflake : condition.kind === 'ice' ? ThermometerSnowflake : condition.kind === 'rain' ? CloudRain : condition.kind === 'heat' ? ThermometerSun : condition.kind === 'dry' ? Sun : condition.kind === 'loading' ? LoaderCircle : CircleHelp;
  return <button type="button" className={`court-list-card${selected ? ' selected' : ''}`} onClick={onSelect}>
    <span className="court-list-top">
      <CourtGlyph/>
      <span className="court-list-heading"><strong>{court.name}</strong><small>{court.contextName || court.address || 'Location details unavailable'}</small></span>
      <span className="court-list-distance"><strong>{distance.toFixed(1)}</strong><small>MILES</small></span>
    </span>
    <span className="court-list-badges">
      <span className={`court-list-badge lighting-${court.lighting}`}><LightingIcon size={14} aria-hidden="true"/>{lighting}</span>
      <span className="court-list-badge"><Grid2X2 size={14} aria-hidden="true"/>{court.courts ? `${court.courts} ${court.courts === 1 ? 'court' : 'courts'}` : 'Count not listed'}</span>
      <span className={`court-list-badge condition-${condition.kind}`}><ConditionIcon size={14} aria-hidden="true"/>{condition.label}</span>
    </span>
    <span className="court-list-footer"><span><Users size={14} aria-hidden="true"/>{court.access === 'public' ? 'Public access listed' : 'Access not confirmed'}</span><span className="court-list-open"><ArrowUpRight size={17} aria-hidden="true"/></span></span>
  </button>;
}
