import { useEffect } from 'react';
import { ArrowUpRight, CloudRain, Grid2X2, Lightbulb, LightbulbOff, MapPin, Sun, Umbrella, Users, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Court, RainAssessment } from './types';

type Props = {
  court: Court;
  international?: boolean;
  distance: number;
  rain?: RainAssessment;
  rainLoading: boolean;
  rainError?: string;
  caution?: string;
  nearbyRain: boolean;
  onClose: () => void;
  onDirections: () => void;
};

export default function CourtDetailSheet({ international, court, distance, rain, rainLoading, rainError, caution, nearbyRain, onClose, onDirections }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const lighting = court.lighting === 'yes' ? 'Lighted' : court.lighting === 'no' ? 'Unlighted' : 'Lights unknown';
  const LightingIcon = court.lighting === 'yes' ? Lightbulb : LightbulbOff;
  const courtCount = court.courts ? `${court.courts} ${court.courts === 1 ? 'court' : 'courts'}` : 'Court count unknown';
  const access = court.access === 'public' ? 'Public access listed' : court.access === 'restricted' ? 'Restricted access listed' : 'Access not confirmed';
  return <section className="map-popover court-detail-sheet" role="region" aria-labelledby="court-detail-title">
      <div className="court-detail-bar"><span>Court details</span><button type="button" onClick={onClose} aria-label="Close court details"><X size={20}/></button></div>
      <div className="court-detail-scroll">
        <div className="court-detail-hero"><div className="court-detail-hero-top"><span className="court-detail-ball" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.5"/><path d="M8 6c4 3 6 6 6 10s-2 7-6 10M24 6c-4 3-6 6-6 10s2 7 6 10" stroke="currentColor" strokeWidth="2.5"/></svg></span><div><h2 id="court-detail-title">{court.name}</h2><p>{court.contextName || court.address || 'Location details unavailable'}</p></div></div><div className="court-detail-hero-facts"><span><MapPin size={15}/>{distance.toFixed(1)} mi away</span><span><LightingIcon size={15}/>{lighting}</span></div></div>
        {court.address && <p className="court-detail-address"><MapPin size={15}/>{court.address}{court.addressApprox && <small>Approximate address</small>}</p>}
        <section className="court-detail-panel"><h3>COURT FEATURES</h3><div className="court-detail-features"><span><Users size={17}/>{access}</span><span><Grid2X2 size={17}/>{courtCount}</span><span><Grid2X2 size={17}/>{court.surface?.replaceAll('_', ' ') || 'Surface unknown'}</span><span>{court.sheltered ? <Umbrella size={17}/> : <Sun size={17}/>} {court.sheltered ? 'Sheltered' : 'Outdoor'}</span></div></section>
        <section className="court-detail-panel court-detail-radar"><h3><CloudRain size={15}/> {international ? 'AREA RAIN FORECAST' : 'RECENT PRECIPITATION'}</h3>{rain ? <div className="court-detail-radar-main"><span className="court-detail-score" style={{ '--detail-score': `${Math.max(0, Math.min(100, rain.score))}%` } as CSSProperties} aria-label={`${international ? 'Forecast' : 'Radar'} score ${rain.score} out of 100`}><strong>{rain.score}</strong></span><div><strong>{rain.summary}</strong><span>{international ? 'Area forecast estimate' : `Radar quality: ${rain.confidence}`}</span>{!international && <small>1h {rain.rain1h === null ? '—' : `${rain.rain1h.toFixed(3)} in`} · 3h {rain.rain3h === null ? '—' : `${rain.rain3h.toFixed(3)} in`} · 6h {rain.rain6h === null ? '—' : `${rain.rain6h.toFixed(3)} in`}</small>}</div></div> : <p>{international ? (rainLoading ? 'Checking area forecast…' : rainError || 'Area forecast estimate unavailable.') : rainLoading ? 'Checking recent radar near this court…' : rainError || 'No radar estimate available for this court.'}</p>}{nearbyRain && <p className="court-detail-warning">Recent rain nearby. Check current conditions.</p>}{caution && <p className="court-detail-warning">{caution}</p>}<p className="court-detail-disclaimer">{international ? 'Forecasts cannot confirm surface dryness or drying time after rain.' : 'Radar estimates cannot confirm the court’s current surface.'}</p></section>
        <button type="button" className="court-detail-directions" onClick={onDirections}>Get directions <ArrowUpRight size={18}/></button>
        <a className="court-detail-source" href={court.sourceUrl} target="_blank" rel="noreferrer">View source on OpenStreetMap <ArrowUpRight size={15}/></a>
      </div>
  </section>;
}
