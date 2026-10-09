import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Clock3, CloudSun, Compass, Crosshair, ExternalLink, Filter, LocateFixed, MapPin, Menu, Moon, Sun, SunMedium, X } from 'lucide-react';
import { findPlace, getCourts, getWeather, playScore } from './services';
import type { Court, Forecast, Place } from './types';
import { estimatedSunset, formatLocalTime } from './sun';

const INITIAL: Place = { label: 'Fairfax, Virginia', lat: 38.8462, lon: -77.3064 };
function TennisBall({ size = 20 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M6 4.9c2.5 2.2 4 4.6 4 7.1s-1.5 4.9-4 7.1M18 4.9c-2.5 2.2-4 4.6-4 7.1s1.5 4.9 4 7.1" stroke="currentColor" strokeWidth="1.5"/></svg>; }

function App() {
  const [place, setPlace] = useState<Place>(() => { try { return JSON.parse(localStorage.getItem('opencourts-place') || 'null') ?? INITIAL; } catch { return INITIAL; } });
  const [query, setQuery] = useState(''); const [courts, setCourts] = useState<Court[]>([]); const [weather, setWeather] = useState<Forecast[]>([]); const [timeZone, setTimeZone] = useState('America/New_York');
  const [loading, setLoading] = useState(true); const [weatherLoading, setWeatherLoading] = useState(true); const [error, setError] = useState(''); const [weatherError, setWeatherError] = useState('');
  const [litOnly, setLitOnly] = useState(false); const [dark, setDark] = useState(false); const [selected, setSelected] = useState<Court | null>(null);
  const [menuOpen, setMenuOpen] = useState(false); const [mobileList, setMobileList] = useState(false); const [sort, setSort] = useState<'near' | 'lighted'>('near');
  const mapEl = useRef<HTMLDivElement>(null); const map = useRef<MapLibreMap | null>(null); const request = useRef<AbortController | null>(null); const litOnlyRef = useRef(litOnly); const placeRef = useRef(place); placeRef.current = place;

  const load = useCallback(async (p: Place) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(''); setPlace(p); try { localStorage.setItem('opencourts-place', JSON.stringify(p)); } catch { /* storage optional */ }
    getCourts(p.lat, p.lon, controller.signal).then(setCourts).catch(e => { if (e.name !== 'AbortError') { setCourts([]); setError(e.message); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    setWeatherLoading(true); setWeatherError(''); getWeather(p.lat, p.lon, controller.signal).then(data => { setWeather(data.periods); setTimeZone(data.timeZone); }).catch(e => { if (e.name !== 'AbortError') { setWeather([]); setWeatherError(e.message); } }).finally(() => { if (!controller.signal.aborted) setWeatherLoading(false); });
  }, []);
  useEffect(() => { void load(place); return () => request.current?.abort(); }, []);
  useEffect(() => {
    if (!mapEl.current || map.current) return;
    let disposed = false;
    void import('maplibre-gl').then(({ default: ml }) => {
    if (disposed || !mapEl.current) return;
    const initialPlace = placeRef.current;
    const m = new ml.Map({ container: mapEl.current, style: 'https://tiles.openfreemap.org/styles/liberty', center: [initialPlace.lon, initialPlace.lat], zoom: 12, attributionControl: false });
    map.current = m; m.addControl(new ml.NavigationControl({ showCompass: true }), 'bottom-right'); m.addControl(new ml.AttributionControl({ compact: true }), 'bottom-left');
    m.on('load', () => {
      m.addSource('courts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 13, clusterRadius: 45 });
      m.addLayer({ id: 'clusters', type: 'circle', source: 'courts', filter: ['has', 'point_count'], paint: { 'circle-color': '#123d32', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 23, 30, 29], 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
      m.addLayer({ id: 'cluster-count', type: 'symbol', source: 'courts', filter: ['has', 'point_count'], layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'], 'text-size': 12 }, paint: { 'text-color': '#fff' } });
      m.addLayer({ id: 'court-points', type: 'circle', source: 'courts', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['case', ['==', ['get', 'lit'], 'yes'], '#d5f36a', '#fff'], 'circle-radius': 8, 'circle-stroke-color': '#123d32', 'circle-stroke-width': 2.5 } });
      m.on('click', 'clusters', e => { const f = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]; const id = f.properties?.cluster_id; (m.getSource('courts') as GeoJSONSource).getClusterExpansionZoom(id).then(z => m.easeTo({ center: (f.geometry as any).coordinates, zoom: z })).catch(() => undefined); });
      m.on('click', 'court-points', e => { const f = m.queryRenderedFeatures(e.point, { layers: ['court-points'] })[0]; const id = f.properties?.id; const court = courtsRef.current.find(c => c.id === id); if (court) { setSelected(court); m.flyTo({ center: [court.lon, court.lat], zoom: Math.max(14, m.getZoom()) }); } });
      const source = m.getSource('courts') as GeoJSONSource;
      source.setData({ type: 'FeatureCollection', features: courtsRef.current.filter(c => !litOnlyRef.current || c.lighting === 'yes').map(c => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lon, c.lat] }, properties: { id: c.id, lit: c.lighting } })) as any });
      m.on('mouseenter', 'clusters', () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', 'clusters', () => { m.getCanvas().style.cursor = ''; });
      m.on('mouseenter', 'court-points', () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', 'court-points', () => { m.getCanvas().style.cursor = ''; });
    });
    });
    return () => { disposed = true; map.current?.remove(); map.current = null; };
  }, []);
  const courtsRef = useRef(courts); useEffect(() => { courtsRef.current = courts; }, [courts]); useEffect(() => { litOnlyRef.current = litOnly; }, [litOnly]);
  useEffect(() => { const m = map.current; const src = m?.getSource('courts') as GeoJSONSource | undefined; if (!src) return;
    src.setData({ type: 'FeatureCollection', features: filtered.map(c => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lon, c.lat] }, properties: { id: c.id, lit: c.lighting } })) as any });
  }, [courts, litOnly]);
  useEffect(() => { if (map.current) map.current.flyTo({ center: [place.lon, place.lat], zoom: 12, duration: 900 }); }, [place]);
  const filtered = useMemo(() => courts.filter(c => !litOnly || c.lighting === 'yes').sort((a, b) => sort === 'lighted' ? Number(b.lighting === 'yes') - Number(a.lighting === 'yes') : 0), [courts, litOnly, sort]);
  const sunset = useMemo(() => estimatedSunset(place.lat, place.lon, timeZone), [place.lat, place.lon, timeZone]);

  async function submitSearch(e?: React.FormEvent) { e?.preventDefault(); if (!query.trim()) return; setError(''); try { const p = await findPlace(query.trim()); setQuery(''); setSelected(null); await load(p); } catch (e: any) { setError(e.message); } }
  function locate() { if (!navigator.geolocation) { setError('Location sharing is not supported by this browser.'); return; }
    setError(''); navigator.geolocation.getCurrentPosition(pos => { const p = { label: 'Your location', lat: pos.coords.latitude, lon: pos.coords.longitude }; setSelected(null); void load(p); }, e => setError(e.code === 1 ? 'Location access was declined. You can still search for a city or ZIP code.' : 'Couldn’t get your location. Try searching for a city or ZIP code.'), { enableHighAccuracy: true, timeout: 10000 });
  }
  function directions(c: Court) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`, '_blank', 'noopener,noreferrer'); }
  return <div className={dark ? 'app dark' : 'app'}>
    <header className="topbar"><a className="brand" href="#top" aria-label="OpenCourts home"><span className="brand-mark"><TennisBall size={20}/></span><span>open<span className="brand-light">courts</span></span></a>
      <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation"><a href="#explore" onClick={() => setMenuOpen(false)}>Explore courts</a><a href="#conditions" onClick={() => setMenuOpen(false)}>Weather</a><a href="#how" onClick={() => setMenuOpen(false)}>How it works</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a></nav>
      <div className="top-actions"><button className="quiet desktop-locate" onClick={locate}><LocateFixed size={16}/> Near me</button><button className="theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="mobile-menu" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button></div>
    </header>
    <main id="top">
      <section className="intro"><div className="eyebrow"><span className="eyebrow-dot"/> THE COURT IS CALLING</div><h1>Your next court is<br className="desktop-break"/> closer than you think.</h1><p className="intro-copy">Find public tennis courts, check the forecast, and make time for a match.</p>
        <form className="searchbox" onSubmit={submitSearch}><MapPin size={20} className="search-pin"/><input aria-label="Search by city, ZIP code, or location" placeholder="Enter a city, ZIP code, or location" value={query} onChange={e => setQuery(e.target.value)}/><button type="button" className="search-locate" aria-label="Use my location" onClick={locate}><Crosshair size={18}/></button><button type="submit" className="search-submit"><span>Find courts</span><ArrowRight size={17}/></button></form>
        <div className="intro-foot"><span><span className="green-check"><Check size={11}/></span> Always free</span><span className="foot-dot"/> <span>Open data, open to everyone</span></div>
      </section>
      <section className={mobileList ? 'explore list-open' : 'explore'} id="explore" aria-label="Explore tennis courts"><div className="results-panel">
          <div className="results-head"><div><div className="section-kicker">COURTS NEAR</div><h2>{place.label}</h2></div><button className="round-action" title="Center map on location" onClick={() => map.current?.flyTo({ center: [place.lon, place.lat], zoom: 12 })}><Compass size={18}/></button></div>
          <div className="result-meta"><span>{loading ? 'Searching nearby…' : `${filtered.length} ${filtered.length === 1 ? 'court' : 'courts'} found`}</span><button className="sort-button" onClick={() => setSort(sort === 'near' ? 'lighted' : 'near')}>{sort === 'near' ? 'Recommended' : 'Lighted first'} <ChevronDown size={14}/></button></div>
          <div className="filter-row"><button onClick={() => setLitOnly(!litOnly)} className={litOnly ? 'filter-chip active' : 'filter-chip'} aria-pressed={litOnly}><SunMedium size={16}/> Lighted courts <span className="switch"><i/></span></button><button className="filter-icon" title="Show lighted courts only" onClick={() => setLitOnly(!litOnly)}><Filter size={16}/></button></div>
          {error && <div className="error-box" role="alert"><span>{error}</span><button onClick={() => void load(place)}>Retry</button></div>}
          {loading && <div className="skeletons" aria-label="Loading courts"><div className="skeleton-card"/><div className="skeleton-card"/><div className="skeleton-card"/></div>}
          {!loading && !error && filtered.length === 0 && <div className="empty"><span className="empty-icon"><TennisBall size={22}/></span><strong>{litOnly && courts.length ? 'No lighted courts found' : 'No courts found nearby'}</strong><p>{litOnly ? 'Try turning off the lighting filter to see more courts.' : 'Try another city or zoom out on the map.'}</p>{litOnly && <button className="text-action" onClick={() => setLitOnly(false)}>Clear lighting filter <ArrowRight size={14}/></button>}</div>}
          {!loading && filtered.map((c, i) => <article key={c.id} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(c); map.current?.flyTo({ center: [c.lon, c.lat], zoom: 15 }); } }} className={selected?.id === c.id ? 'court-card selected' : 'court-card'} onClick={() => { setSelected(c); map.current?.flyTo({ center: [c.lon, c.lat], zoom: 15 }); }}>
            <div className="court-index">{String(i + 1).padStart(2, '0')}</div><div className="court-main"><h3>{c.name}</h3><p className="court-distance"><MapPin size={13}/> Public court · OpenStreetMap</p><div className="badges">{c.lighting === 'yes' ? <span className="badge lit"><SunMedium size={13}/> Lights</span> : c.lighting === 'no' ? <span className="badge"><Moon size={12}/> No lights</span> : <span className="badge"><span className="badge-dot"/> Lighting unknown</span>}{c.courts && <span className="badge">{c.courts} courts</span>}</div></div><span className="card-arrow" aria-hidden="true"><ArrowUpRight size={18}/></span>
          </article>)}
          {!loading && <div className="data-note"><span className="note-line"/><p>Court details come from OpenStreetMap and may change. Please confirm access and amenities locally.</p></div>}
        </div>
        <div className="map-panel"><div className="map-canvas" ref={mapEl} aria-label="Interactive map showing public tennis courts" role="application"/><div className="map-label"><span className="map-live"/> LIVE COURT MAP</div><button className="map-locate" onClick={locate} title="Use my location"><LocateFixed size={18}/><span>Near me</span></button>
          {selected && <div className="map-popover"><button className="popover-close" aria-label="Close selected court" onClick={() => setSelected(null)}><X size={16}/></button><span className="popover-label">COURT DETAILS</span><strong>{selected.name}</strong><span>{selected.lighting === 'yes' ? 'Lights available' : selected.lighting === 'no' ? 'No lights listed' : 'Lighting not listed'}</span><button className="directions" onClick={() => directions(selected)}>Get directions <ArrowUpRight size={15}/></button></div>}
          <div className="map-legend"><span className="legend-dot lime"/> Lighted <span className="legend-dot white"/> Lighting unknown</div>
          <button className="mobile-list-toggle" onClick={() => setMobileList(!mobileList)}>{mobileList ? <><ArrowDown size={16}/> Show map</> : <><ArrowLeft size={16}/> View {filtered.length} courts</>}</button>
        </div>
      </section>
      <section id="conditions" className="weather-section"><div className="weather-title"><div><div className="section-kicker">PLAN YOUR PLAY</div><h2>Conditions for a match.</h2><p>Local forecast for {place.label}. An easy way to find a good window.</p>{sunset && !weatherError && !weatherLoading && <p className="sunset-note"><Sun size={13}/> Estimated sunset {formatLocalTime(sunset, timeZone)} · choose a lighted court after dark</p>}</div><div className="weather-icon"><CloudSun size={26}/></div></div>
        {weatherError && <p className="weather-error" role="status">{weatherError}</p>}
        {weatherLoading ? <div className="weather-grid">{[0,1,2,3].map(n => <div className="weather-card skeleton-weather" key={n}/>)}</div> : weather.length ? <div className="weather-grid">{weather.slice(0, 4).map((f, i) => { const s = playScore(f); const afterSunset = sunset !== null && new Date(f.time) >= sunset; return <article className={`weather-card ${i === 0 ? 'best-window' : ''}`} key={f.time}><div className="weather-time">{afterSunset ? 'AFTER SUNSET' : i === 0 ? 'UP NEXT' : new Date(f.time).toLocaleTimeString([], { timeZone, hour: 'numeric' })}</div><div className="weather-condition">{f.short}</div><div className="weather-temp">{Math.round(f.temp)}°<small>F</small></div><div className="weather-bottom"><span><SunMedium size={14}/> {f.wind} mph</span><span className="play-score"><i style={{ width: `${s}%` }}/></span><strong>{s}<small> play score</small></strong></div></article>; })}</div> : null}
        <div className="score-explainer"><span className="score-mark"><Clock3 size={17}/></span><p><strong>Play score</strong> balances comfortable temperatures, wind, and precipitation. It’s a helpful guide, not a guarantee.</p><span className="weather-source">U.S. National Weather Service</span></div>
      </section>
      <section className="how-section" id="how"><div className="section-kicker">A BETTER WAY TO FIND YOUR COURT</div><h2>Less searching.<br/>More playing.</h2><div className="how-grid"><article><span className="how-num">01</span><MapPin size={21}/><h3>Find your spot</h3><p>Search a city or ZIP code, or share your location to discover nearby public courts.</p></article><article><span className="how-num">02</span><SunMedium size={21}/><h3>Know what to expect</h3><p>See lighting details from the map and the forecast before you head out.</p></article><article><span className="how-num">03</span><TennisBall size={21}/><h3>Get out and play</h3><p>Pick a court, get directions, and enjoy the game. No account or booking needed.</p></article></div></section>
      <section className="closing" id="about"><div><div className="section-kicker">OPEN TO EVERYONE</div><h2>The best plans<br/>start outside.</h2><p>OpenCourts is a free public-information service. Court locations are sourced from OpenStreetMap, an open project built by people like you.</p><a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">Learn about OpenStreetMap <ExternalLink size={14}/></a></div><div className="closing-ball"><TennisBall size={116}/><div className="ball-seam"/></div></section>
    </main>
    <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><TennisBall size={18}/></span><span>open<span className="brand-light">courts</span></span></a><span>Find Your Court. Play Your Game.</span><div><a href="/about.html">About</a><a href="/privacy.html">Privacy</a><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Data & attribution</a><a href="/contact.html">Contact</a></div><span className="copyright">© 2026 OpenCourts</span></footer>
  </div>;
}
export default App;
