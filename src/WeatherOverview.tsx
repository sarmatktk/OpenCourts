import { Cloud, CloudRain, CloudSun, Droplets, Sun, Wind } from 'lucide-react';
import { formatLocalTime } from './sun';
import type { DailyPlayWindows, Forecast, PlayWindow } from './types';

function WeatherGlyph({ forecast, size = 23 }: { forecast: Forecast; size?: number }) {
  const text = `${forecast.short} ${forecast.icon}`.toLowerCase();
  const Icon = /rain|shower|drizzle|storm/.test(text) ? CloudRain : /partly|mostly sunny/.test(text) ? CloudSun : /cloud|fog|overcast/.test(text) ? Cloud : Sun;
  return <Icon size={size} aria-hidden="true"/>;
}

function localDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(value));
}

export default function WeatherOverview({ periods, days, place, timeZone, now }: {
  periods: Forecast[]; days: DailyPlayWindows[]; place: string; timeZone: string; now: number;
}) {
  const current = periods.find(period => Date.parse(period.time) <= now && now < Date.parse(period.endTime || period.time) + (period.endTime ? 0 : 60 * 60_000)) || periods[0];
  const daily = days.map(day => ({ day, best: day.windows.reduce<PlayWindow | undefined>((best, window) => !best || window.score > best.score ? window : best, undefined) })).filter((item): item is { day: DailyPlayWindows; best: PlayWindow } => Boolean(item.best));
  const overall = daily.reduce<(typeof daily)[number] | undefined>((best, item) => !best || item.best.score > best.best.score ? item : best, undefined);
  if (!current && !daily.length) return null;

  return <div className="weather-overview">
    {current && <div className="current-weather-hero">
      <span className="current-weather-icon"><WeatherGlyph forecast={current} size={35}/></span>
      <span className="current-weather-main"><small>{place}</small><strong>{Math.round(current.temp)}°</strong><span>{current.short}</span></span>
      <span className="current-weather-stats"><span><Droplets size={15}/>{Math.round(current.precip)}%</span><span><Wind size={15}/>{Math.round(current.wind)} mph</span>{current.humidity != null && <span>Humidity {Math.round(current.humidity)}%</span>}</span>
    </div>}
    {overall && <div className="best-play-card"><span className="best-play-icon"><Sun size={24}/></span><span className="best-play-copy"><small>BEST TIME TO PLAY</small><strong>{localDate(overall.best.time, timeZone)} at {formatLocalTime(new Date(overall.best.time), timeZone)}</strong><span>{overall.best.short} · {Math.round(overall.best.temp)}°F</span></span><span className="best-play-score"><strong>{overall.best.score}</strong><small>PLAY SCORE</small></span></div>}
    {daily.length > 0 && <div className="daily-best"><div className="daily-best-heading"><strong>BEST TENNIS WINDOWS</strong><span>Best daylight window each day</span></div>{daily.map(({ day, best }) => <div className={`daily-best-row${day.date === overall?.day.date ? ' overall' : ''}`} key={day.date}><span className="daily-best-icon"><WeatherGlyph forecast={best}/></span><span className="daily-best-copy"><strong>{localDate(best.time, timeZone)}{day.date === overall?.day.date && <em>BEST OVERALL</em>}</strong><span>Best around {formatLocalTime(new Date(best.time), timeZone)} · {Math.round(best.temp)}°F</span><small><Droplets size={12}/>{Math.round(best.precip)}% <Wind size={12}/>{Math.round(best.wind)} mph</small></span><span className="daily-best-score"><strong>{best.score}</strong><small>SCORE</small></span></div>)}</div>}
  </div>;
}
