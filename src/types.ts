export type Lighting = 'yes' | 'no' | 'unknown';
export type Access = 'public' | 'restricted' | 'unknown';
export interface Court { id: string; name: string; lat: number; lon: number; lighting: Lighting; access: Access; surface?: string; courts?: number; sourceUrl: string; }
export interface Forecast { time: string; temp: number; wind: number; precip: number; short: string; icon: string; }
export interface WeatherData { periods: Forecast[]; timeZone: string; }
export interface Place { label: string; lat: number; lon: number; }
