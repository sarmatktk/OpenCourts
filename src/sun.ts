function radians(value: number) { return value * Math.PI / 180; }
function degrees(value: number) { return value * 180 / Math.PI; }
function normalize(value: number, full: number) { return ((value % full) + full) % full; }
export function estimatedSunset(lat: number, lon: number, timeZone: string, now = new Date()): Date | null {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const year = part('year'); const month = part('month'); const day = part('day');
  const midnight = Date.UTC(year, month - 1, day); const dayOfYear = Math.floor((midnight - Date.UTC(year, 0, 0)) / 86400000);
  const longitudeHour = lon / 15; const t = dayOfYear + (18 - longitudeHour) / 24; const m = 0.9856 * t - 3.289;
  const longitude = normalize(m + 1.916 * Math.sin(radians(m)) + 0.020 * Math.sin(2 * radians(m)) + 282.634, 360);
  let rightAscension = normalize(degrees(Math.atan(0.91764 * Math.tan(radians(longitude)))), 360);
  rightAscension += Math.floor(longitude / 90) * 90 - Math.floor(rightAscension / 90) * 90; rightAscension /= 15;
  const sinDeclination = 0.39782 * Math.sin(radians(longitude)); const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHourAngle = (Math.cos(radians(90.833)) - sinDeclination * Math.sin(radians(lat))) / (cosDeclination * Math.cos(radians(lat)));
  if (cosHourAngle < -1 || cosHourAngle > 1) return null;
  const hourAngle = degrees(Math.acos(cosHourAngle)) / 15; const meanTime = hourAngle + rightAscension - 0.06571 * t - 6.622;
  let utcHour = meanTime - longitudeHour;
  if (utcHour < 12) utcHour += 24; // U.S. sunsets in western time zones can fall on the following UTC date.
  return new Date(midnight + utcHour * 3600000);
}
export function formatLocalTime(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(value);
}
export function formatLocalTimeRange(start: string, end: string | undefined, timeZone: string) {
  const formatHour = (value: string) => new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric' }).format(new Date(value));
  const startLabel = formatHour(start);
  if (!end) return startLabel;
  const endLabel = formatHour(end);
  const startParts = startLabel.match(/^(\d+)(?:\s*(AM|PM))?$/i);
  const endParts = endLabel.match(/^(\d+)(?:\s*(AM|PM))?$/i);
  if (!startParts || !endParts) return `${startLabel}–${endLabel}`;
  const startPeriod = startParts[2]?.toUpperCase();
  const endPeriod = endParts[2]?.toUpperCase();
  if (startPeriod === endPeriod) return `${startParts[1]}–${endParts[1]}${endPeriod ? ` ${endPeriod}` : ''}`;
  return `${startLabel}–${endLabel}`;
}
