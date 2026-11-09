export type Lighting = 'yes' | 'no' | 'unknown';
export type Access = 'public' | 'restricted' | 'unknown';
export interface Court { id: string; name: string; lat: number; lon: number; lighting: Lighting; access: Access; surface?: string; courts?: number; sheltered?: boolean; address?: string; addressApprox?: boolean; contextName?: string; contextCached?: boolean; sourceUrl: string; }
export type WinterRisk = 'snow' | 'ice';
export interface Forecast { time: string; endTime?: string; temp: number; wind: number; precip: number; precipKnown?: boolean; humidity?: number; heatIndex?: number; winterRisk?: WinterRisk; winterCaution?: { type: WinterRisk; lingering: boolean }; short: string; icon: string; }
export interface PlayWindow extends Forecast { score: number; }
export interface DailyPlayWindows { date: string; windows: PlayWindow[]; overnightPrecipitation?: { type: 'rain' | WinterRisk; chance: number }; }
export interface WeatherData { periods: Forecast[]; outlook: Forecast[]; timeZone: string; source?: 'NWS' | 'MET Norway' | 'WeatherAPI' | 'Open-Meteo'; attributionUrl?: string; }
export interface WeatherAlert { id: string; event: string; severity: string; headline: string; area: string; effective: string | null; ends: string | null; url: string; }
export interface WeatherAlertData { supported: boolean; alerts: WeatherAlert[]; }
export interface RainAssessment { courtId: string; rain1h: number | null; rain3h: number | null; rain6h: number | null; score: number; confidence: 'Low' | 'Moderate' | 'High'; summary: string; source?: 'forecast'; forecastRainChance?: number; }
export interface Place { label: string; lat: number; lon: number; countryCode?: string; }
export interface PlaceSuggestion extends Place { title: string; detail: string; }
