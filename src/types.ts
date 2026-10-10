export type Lighting = 'yes' | 'no' | 'unknown';
export type Access = 'public' | 'restricted' | 'unknown';
export interface Court { id: string; name: string; lat: number; lon: number; lighting: Lighting; access: Access; surface?: string; courts?: number; sheltered?: boolean; address?: string; addressApprox?: boolean; contextCached?: boolean; sourceUrl: string; }
export interface Forecast { time: string; endTime?: string; temp: number; wind: number; precip: number; short: string; icon: string; }
export interface PlayWindow extends Forecast { score: number; }
export interface DailyPlayWindows { date: string; windows: PlayWindow[]; }
export interface WeatherData { periods: Forecast[]; outlook: Forecast[]; timeZone: string; }
export interface RainAssessment { courtId: string; rain1h: number | null; rain3h: number | null; rain6h: number | null; score: number; confidence: 'Low' | 'Moderate' | 'High'; summary: string; }
export interface Place { label: string; lat: number; lon: number; }
export interface PlaceSuggestion extends Place { title: string; detail: string; }
