import { ArrowUpRight, CloudSun, CloudRain, Droplet, Lightbulb, LightbulbOff, MapPin, Sun, Trophy, Medal } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Court, RainAssessment } from './types';

type Props = {
  court: Court;
  rain: RainAssessment;
  rank: number;
  distance: number;
  onSelect: () => void;
  onDirections: () => void;
  caution?: string;
  nearbyRain?: boolean;
};

export default function DryCourtCard({ court, rain, rank, distance, onSelect, onDirections, caution, nearbyRain }: Props) {
  const likelyDry = rain.score >= 70;
  const rainAmounts = [rain.rain1h, rain.rain3h, rain.rain6h];
  return <article className={`dry-court-card${rank === 1 ? ' dry-court-card-best' : ''}`}>
    <div className="dry-court-card-top">
      <div className="dry-score-ring" style={{ '--dry-score': `${Math.max(0, Math.min(100, rain.score))}%` } as CSSProperties} aria-label={`Radar score ${rain.score} out of 100`}><strong>{rain.score}</strong></div>
      <div className="dry-court-card-heading"><span className="dry-court-rank">{rank === 1 ? <Trophy size={13}/> : <Medal size={13}/>} {rank === 1 ? 'BEST OPTION' : `TOP PICK ${rank}`}</span><button type="button" className="dry-court-name" onClick={onSelect}>{court.name}</button><span className="dry-court-distance"><MapPin size={13}/>{distance.toFixed(1)} mi away</span></div>
      {likelyDry ? <Sun className="dry-court-weather" size={25} aria-hidden="true"/> : <CloudSun className="dry-court-weather" size={25} aria-hidden="true"/>}
    </div>
    <div className={`dry-court-verdict${likelyDry ? '' : ' dry-court-verdict-caution'}`}>{likelyDry ? 'Likely dry' : 'Check the surface'}</div>
    <div className="dry-rain-timeline" aria-label="Recent radar precipitation">{rainAmounts.map((amount, index) => <div className="dry-rain-period" key={index}><span><Droplet size={12}/>{[1, 3, 6][index]}H</span><strong>{amount === null ? '—' : `${amount.toFixed(3)} in`}</strong></div>)}</div>
    <div className="dry-court-card-bottom"><div className="dry-court-tags"><span>{court.lighting === 'yes' ? <Lightbulb size={14}/> : <LightbulbOff size={14}/>} {court.lighting === 'yes' ? 'Lighted' : court.lighting === 'no' ? 'Unlighted' : 'Lights unknown'}</span>{court.courts && <span>{court.courts} {court.courts === 1 ? 'court' : 'courts'}</span>}</div><button type="button" className="dry-directions" onClick={onDirections}>Directions <ArrowUpRight size={15}/></button></div>
    {nearbyRain && <p className="dry-court-note"><CloudRain size={14}/> Recent rain nearby · check conditions</p>}
    {caution && <p className="dry-court-note"><CloudRain size={14}/>{caution}</p>}
    <p className="dry-court-detail">{rain.summary} · Radar quality: {rain.confidence}. Radar estimates cannot confirm the current court surface.</p>
  </article>;
}
