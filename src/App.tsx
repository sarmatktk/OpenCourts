import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Clock3, CloudSun, Compass, Crosshair, ExternalLink, Filter, LoaderCircle, LocateFixed, MapPin, Menu, Moon, Sun, SunMedium, X } from 'lucide-react';
import { findPlace, getCourts, getPlaceSuggestions, getRainAssessments, getWeather, weeklyPlayWindows } from './services';
import type { Court, Forecast, Place, PlaceSuggestion, RainAssessment } from './types';
import { estimatedSunset, formatLocalTime, formatLocalTimeRange } from './sun';

const INITIAL: Place = { label: 'Fairfax, Virginia', lat: 38.8462, lon: -77.3064 };
function TennisBall({ size = 20 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M6 4.9c2.5 2.2 4 4.6 4 7.1s-1.5 4.9-4 7.1M18 4.9c-2.5 2.2-4 4.6-4 7.1s1.5 4.9 4 7.1" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function distanceMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }) { const rad = Math.PI / 180; const dLat = (b.lat-a.lat)*rad; const dLon = (b.lon-a.lon)*rad; const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2; return 3958.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)); }
function rainfallDetail(rain: RainAssessment) { const amount = (value: number | null) => value === null ? '—' : `${value.toFixed(3)} in`; return `Rain (1h / 3h / 6h): ${amount(rain.rain1h)} / ${amount(rain.rain3h)} / ${amount(rain.rain6h)}`; }

function App() {
  const [place, setPlace] = useState<Place>(() => { try { return JSON.parse(localStorage.getItem('opencourts-place') || 'null') ?? INITIAL; } catch { return INITIAL; } });
  const [query, setQuery] = useState(''); const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]); const [suggestionsOpen, setSuggestionsOpen] = useState(false); const [suggestionsLoading, setSuggestionsLoading] = useState(false); const [suggestionsError, setSuggestionsError] = useState(''); const [activeSuggestion, setActiveSuggestion] = useState(-1); const [courts, setCourts] = useState<Court[]>([]); const [hourlyForecast, setHourlyForecast] = useState<Forecast[]>([]); const [timeZone, setTimeZone] = useState('America/New_York'); const [visibleCount, setVisibleCount] = useState(30);
  const [loading, setLoading] = useState(true); const [searchSlow, setSearchSlow] = useState(false); const [placeLookupLoading, setPlaceLookupLoading] = useState(false); const [weatherLoading, setWeatherLoading] = useState(true); const [rainLoading, setRainLoading] = useState(false); const [rainError, setRainError] = useState(''); const [rainAssessments, setRainAssessments] = useState<RainAssessment[]>([]); const [selectedRainLoading, setSelectedRainLoading] = useState(false); const [selectedRainError, setSelectedRainError] = useState(''); const [error, setError] = useState(''); const [weatherError, setWeatherError] = useState('');
  const [mapError, setMapError] = useState(''); const [mapReady, setMapReady] = useState(false);
  const [litOnly, setLitOnly] = useState(false); const [dark, setDark] = useState(() => { try { return localStorage.getItem('opencourts-theme') === 'dark'; } catch { return false; } }); const [selected, setSelected] = useState<Court | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radius, setRadius] = useState('all'); const [publicOnly, setPublicOnly] = useState(false); const [surface, setSurface] = useState('all');
  const activeFilters = Number(litOnly) + Number(publicOnly) + Number(radius !== 'all') + Number(surface !== 'all');
  function resetFilters() { setLitOnly(false); setPublicOnly(false); setRadius('all'); setSurface('all'); }
  const [menuOpen, setMenuOpen] = useState(false); const [mobileList, setMobileList] = useState(false); const [sort, setSort] = useState<'near' | 'lighted'>('near');
  const mapEl = useRef<HTMLDivElement>(null); const map = useRef<MapLibreMap | null>(null); const request = useRef<AbortController | null>(null); const suggestionRequest = useRef<AbortController | null>(null); const placeRef = useRef(place); placeRef.current = place;

  function toggleTheme() { setDark(current => { const next = !current; try { localStorage.setItem('opencourts-theme', next ? 'dark' : 'light'); } catch { /* storage optional */ } return next; }); }

  useEffect(() => {
    const search = query.trim();
    suggestionRequest.current?.abort();
    if (!suggestionsOpen || search.length < 3) {
      setSuggestions([]); setSuggestionsLoading(false); setSuggestionsError(''); setActiveSuggestion(-1);
      return;
    }
    const controller = new AbortController(); suggestionRequest.current = controller;
    const timer = window.setTimeout(() => {
      setSuggestionsLoading(true); setSuggestionsError('');
      getPlaceSuggestions(search, controller.signal).then(results => {
        if (!controller.signal.aborted) { setSuggestions(results); setActiveSuggestion(-1); }
      }).catch(error => {
        if (error.name !== 'AbortError' && !controller.signal.aborted) { setSuggestions([]); setSuggestionsError('Suggestions are unavailable. Press Enter to search.'); }
      }).finally(() => { if (!controller.signal.aborted) setSuggestionsLoading(false); });
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, suggestionsOpen]);

  function selectCourt(court: Court) {
    setSelected(court);
    setMobileList(false);
    requestAnimationFrame(() => {
      map.current?.resize();
      map.current?.flyTo({ center: [court.lon, court.lat], zoom: 15 });
    });
  }

  function showMapView() {
    setMobileList(false);
    requestAnimationFrame(() => map.current?.resize());
  }

  const load = useCallback(async (p: Place) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(''); setPlace(p); try { localStorage.setItem('opencourts-place', JSON.stringify(p)); } catch { /* storage optional */ }
    setRainAssessments([]); setRainError(''); setSelectedRainLoading(false); setSelectedRainError('');
    getCourts(p.lat, p.lon, controller.signal, p.label, enriched => { if (!controller.signal.aborted) setCourts(enriched); }).then(setCourts).catch(e => { if (e.name !== 'AbortError') { setCourts([]); setError(e.message); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    setWeatherLoading(true); setWeatherError(''); getWeather(p.lat, p.lon, controller.signal).then(data => { setHourlyForecast(data.periods); setTimeZone(data.timeZone); }).catch(e => { if (e.name !== 'AbortError') { setHourlyForecast([]); setWeatherError(e.message); } }).finally(() => { if (!controller.signal.aborted) setWeatherLoading(false); });
  }, []);
  useEffect(() => {
    if (!loading) { setSearchSlow(false); return; }
    setSearchSlow(false);
    const timer = window.setTimeout(() => setSearchSlow(true), 7000);
    return () => window.clearTimeout(timer);
  }, [loading, place]);
  useEffect(() => { void load(place); return () => request.current?.abort(); }, []);
  useEffect(() => {
    if (!mapEl.current || map.current) return;
    let disposed = false;
    void import('maplibre-gl').then(async ({ default: ml }) => {
    if (disposed || !mapEl.current) return;
    const initialPlace = placeRef.current;
    const m = new ml.Map({ container: mapEl.current, style: {
      version: 8,
      sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
      layers: [{ id: 'osm-raster', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }],
    }, center: [initialPlace.lon, initialPlace.lat], zoom: 12, attributionControl: false });
    map.current = m; m.addControl(new ml.NavigationControl({ showCompass: true }), 'bottom-right');
    m.addControl(new ml.AttributionControl({ compact: true }), 'bottom-left');
    let failedOsmTiles = 0;
    let mapFailureReported = false;
    m.on('error', event => {
      if ('sourceId' in event && event.sourceId === 'osm') {
        failedOsmTiles++;
        if (failedOsmTiles >= 3 && !mapFailureReported) {
          mapFailureReported = true;
          setMapError('Map tiles are temporarily unavailable. Court results are still available in the list.');
        }
        return;
      }
      if (!mapFailureReported) console.warn('[OpenCourts] Map could not load a resource', event.error);
    });
    m.on('load', () => {
      m.addSource('courts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 13, clusterRadius: 45 });
      m.addLayer({ id: 'clusters', type: 'circle', source: 'courts', filter: ['has', 'point_count'], paint: { 'circle-color': '#123d32', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 23, 30, 29], 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
      m.addLayer({ id: 'cluster-count', type: 'symbol', source: 'courts', filter: ['has', 'point_count'], layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['Open Sans Regular'], 'text-size': 12 }, paint: { 'text-color': '#fff' } });
      m.addLayer({ id: 'court-points', type: 'circle', source: 'courts', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['case', ['==', ['get', 'lit'], 'yes'], '#d5f36a', '#fff'], 'circle-radius': 8, 'circle-stroke-color': ['match', ['get', 'confidence'], 'High', '#84a92d', 'Moderate', '#c08a2e', 'Low', '#b65c58', '#123d32'], 'circle-stroke-width': 2.5 } });
      m.on('click', 'clusters', e => { const f = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]; const id = f.properties?.cluster_id; (m.getSource('courts') as GeoJSONSource).getClusterExpansionZoom(id).then(z => m.easeTo({ center: (f.geometry as any).coordinates, zoom: z })).catch(() => undefined); });
      m.on('click', 'court-points', e => { const f = m.queryRenderedFeatures(e.point, { layers: ['court-points'] })[0]; const id = f.properties?.id; const court = courtsRef.current.find(c => c.id === id); if (court) { setSelected(court); m.flyTo({ center: [court.lon, court.lat], zoom: Math.max(14, m.getZoom()) }); } });
      const source = m.getSource('courts') as GeoJSONSource;
      source.setData({ type: 'FeatureCollection', features: filteredRef.current.map(c => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lon, c.lat] }, properties: { id: c.id, lit: c.lighting } })) as any });
      setMapReady(true);
      m.on('mouseenter', 'clusters', () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', 'clusters', () => { m.getCanvas().style.cursor = ''; });
      m.on('mouseenter', 'court-points', () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', 'court-points', () => { m.getCanvas().style.cursor = ''; });
    });
    }).catch(error => { console.error('[OpenCourts] Map failed to initialize', error); setMapError('The map could not load. Court results are still available in the list.'); });
    return () => { disposed = true; map.current?.remove(); map.current = null; };
  }, []);
  const filtered = useMemo(() => courts.filter(c => (!litOnly || c.lighting === 'yes') && (!publicOnly || c.access === 'public') && (radius === 'all' || distanceMiles(c, place) <= Number(radius)) && (surface === 'all' || (surface === 'hard' ? ['asphalt', 'concrete', 'hard', 'acrylic'].includes(c.surface || '') : c.surface === surface))).sort((a, b) => (sort === 'lighted' ? Number(b.lighting === 'yes') - Number(a.lighting === 'yes') : 0) || distanceMiles(a, place) - distanceMiles(b, place)), [courts, litOnly, publicOnly, radius, surface, sort, place]);
  const filteredRef = useRef(filtered); filteredRef.current = filtered;
  const courtsRef = useRef(courts); useEffect(() => { courtsRef.current = courts; }, [courts]);
  useEffect(() => { const m = map.current; const src = m?.getSource('courts') as GeoJSONSource | undefined; if (!src) return;
    src.setData({ type: 'FeatureCollection', features: filtered.map(c => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lon, c.lat] }, properties: { id: c.id, lit: c.lighting, confidence: rainAssessments.find(assessment => assessment.courtId === c.id)?.confidence ?? 'Unknown' } })) as any });
  }, [filtered, rainAssessments, mapReady]);
  useEffect(() => { if (map.current) map.current.flyTo({ center: [place.lon, place.lat], zoom: 12, duration: 900 }); }, [place]);

  const displayed = filtered.slice(0, visibleCount);
  useEffect(() => setVisibleCount(30), [place, litOnly, publicOnly, radius, surface, sort]);
  const sunset = useMemo(() => estimatedSunset(place.lat, place.lon, timeZone), [place.lat, place.lon, timeZone]);
  const bestWindows = useMemo(() => weeklyPlayWindows(hourlyForecast, timeZone), [hourlyForecast, timeZone]);
  const bestWindowDay = useMemo(() => {
    let bestIndex = 0; let highestScore = -1;
    bestWindows.forEach((day, index) => {
      const dayScore = Math.max(...day.windows.map(window => window.score));
      if (dayScore > highestScore) { bestIndex = index; highestScore = dayScore; }
    });
    return bestIndex;
  }, [bestWindows]);
  const rainCandidates = useMemo(() => [...courts].sort((a, b) => distanceMiles(a, place) - distanceMiles(b, place)).slice(0, 50), [courts, place]);
  const rainCandidateIds = useMemo(() => new Set(rainCandidates.map(court => court.id)), [rainCandidates]);
  const rainById = useMemo(() => new Map(rainAssessments.map(assessment => [assessment.courtId, assessment])), [rainAssessments]);
  const selectedRain = selected ? rainById.get(selected.id) : undefined;
  const recommendedCourts = useMemo(() => [...filtered].filter(court => court.access !== 'restricted' && rainById.has(court.id)).sort((a, b) => (rainById.get(b.id)?.score ?? -1) - (rainById.get(a.id)?.score ?? -1) || distanceMiles(a, place) - distanceMiles(b, place)).slice(0, 3), [filtered, rainById, place]);
  useEffect(() => {
    if (!rainCandidates.length) { setRainAssessments([]); return; }
    const controller = new AbortController(); setRainLoading(true); setRainError('');
    getRainAssessments(rainCandidates, controller.signal).then(setRainAssessments).catch(error => { if (error.name !== 'AbortError') { setRainAssessments([]); setRainError(error.message || 'Recent court-by-court radar data is unavailable right now.'); } }).finally(() => { if (!controller.signal.aborted) setRainLoading(false); });
    return () => controller.abort();
  }, [rainCandidates]);
  useEffect(() => {
    if (!selected || rainCandidateIds.has(selected.id) || rainById.has(selected.id)) { setSelectedRainLoading(false); setSelectedRainError(''); return; }
    const controller = new AbortController(); setSelectedRainLoading(true); setSelectedRainError('');
    getRainAssessments([selected], controller.signal).then(assessments => {
      if (!assessments.length) throw new Error('The rain endpoint returned no assessment for this court.');
      setRainAssessments(previous => [...previous.filter(item => item.courtId !== selected.id), ...assessments]);
    }).catch(error => { if (error.name !== 'AbortError') setSelectedRainError(error.message || 'Recent radar estimate unavailable for this court.'); }).finally(() => { if (!controller.signal.aborted) setSelectedRainLoading(false); });
    return () => controller.abort();
  }, [selected, rainCandidateIds, rainById]);

  function chooseSuggestion(item: PlaceSuggestion) { setSuggestionsOpen(false); setSuggestions([]); setSuggestionsError(''); setActiveSuggestion(-1); setQuery(''); setSelected(null); setError(''); void load({ label: item.label, lat: item.lat, lon: item.lon }); }
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && suggestionsOpen && suggestions.length) { e.preventDefault(); setActiveSuggestion(index => Math.min(index + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp' && suggestionsOpen && suggestions.length) { e.preventDefault(); setActiveSuggestion(index => Math.max(index - 1, 0)); }
    else if (e.key === 'Escape' && suggestionsOpen) { e.preventDefault(); setSuggestionsOpen(false); setActiveSuggestion(-1); }
    else if (e.key === 'Enter' && suggestionsOpen && activeSuggestion >= 0 && suggestions[activeSuggestion]) { e.preventDefault(); chooseSuggestion(suggestions[activeSuggestion]); }
  }
  async function submitSearch(e?: React.FormEvent) { e?.preventDefault(); if (!query.trim() || placeLookupLoading) return; setSuggestionsOpen(false); setError(''); setPlaceLookupLoading(true); try { const p = await findPlace(query.trim()); setQuery(''); setSelected(null); await load(p); } catch (e: any) { setError(e.message); } finally { setPlaceLookupLoading(false); } }
  function locate() { if (!navigator.geolocation) { setError('Location sharing is not supported by this browser.'); return; }
    setError(''); navigator.geolocation.getCurrentPosition(pos => { const p = { label: 'Your location', lat: pos.coords.latitude, lon: pos.coords.longitude }; setSelected(null); void load(p); }, e => setError(e.code === 1 ? 'Location access was declined. You can still search for a city or ZIP code.' : 'Couldn’t get your location. Try searching for a city or ZIP code.'), { enableHighAccuracy: true, timeout: 10000 });
  }
  function directions(c: Court) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`, '_blank', 'noopener,noreferrer'); }
  return <div className={dark ? 'app dark' : 'app'}>
    <header className="topbar"><a className="brand" href="#top" aria-label="OpenCourts home"><span className="brand-mark"><TennisBall size={20}/></span><span>open<span className="brand-light">courts</span></span></a>
      <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation"><a href="#explore" onClick={() => setMenuOpen(false)}>Explore courts</a><a href="#conditions" onClick={() => setMenuOpen(false)}>Weather</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a><a href="/support.html" onClick={() => setMenuOpen(false)}>Support</a></nav>
      <div className="top-actions"><button className="quiet desktop-locate" onClick={locate}><LocateFixed size={16}/> Near me</button><button className="theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="mobile-menu" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button></div>
    </header>
    <main id="top">
      <section className="intro"><h1>Find your court.</h1><p className="intro-copy">Explore nearby courts, compare amenities, and check the forecast.</p>
        <div className="search-wrap" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSuggestionsOpen(false); }}>
          <form className="searchbox" onSubmit={submitSearch}><MapPin size={20} className="search-pin"/><input aria-label="Search by address, city, or ZIP code" aria-autocomplete="list" aria-controls="place-suggestions" aria-expanded={suggestionsOpen && query.trim().length >= 3} aria-activedescendant={activeSuggestion >= 0 ? `place-suggestion-${activeSuggestion}` : undefined} type="search" enterKeyHint="search" placeholder="Address, city, or ZIP code" value={query} onFocus={() => { if (query.trim().length >= 3) setSuggestionsOpen(true); }} onKeyDown={handleSearchKeyDown} onChange={e => { setQuery(e.target.value); setSuggestionsOpen(true); setActiveSuggestion(-1); }}/><button type="button" className="search-locate" aria-label="Use my location" onClick={locate}><Crosshair size={18}/></button><button type="submit" className="search-submit" disabled={placeLookupLoading}><span>{placeLookupLoading || loading ? 'Searching…' : 'Find courts'}</span>{placeLookupLoading || loading ? <LoaderCircle size={16} className="search-spinner" aria-hidden="true"/> : <ArrowRight size={17}/>}</button></form>
          {suggestionsOpen && query.trim().length >= 3 && <div className="place-suggestions" id="place-suggestions" role="listbox" aria-label="Address suggestions">
            {suggestionsLoading && <div className="suggestion-message" role="status">Searching places…</div>}
            {!suggestionsLoading && suggestionsError && <div className="suggestion-message" role="status">{suggestionsError}</div>}
            {!suggestionsLoading && !suggestionsError && suggestions.map((item, index) => <button type="button" role="option" aria-selected={activeSuggestion === index} id={`place-suggestion-${index}`} className={`place-suggestion ${activeSuggestion === index ? 'active' : ''}`} key={`${item.lat}:${item.lon}:${item.label}`} onMouseDown={event => event.preventDefault()} onClick={() => chooseSuggestion(item)}><MapPin size={16}/><span><strong>{item.title}</strong>{item.detail && <small>{item.detail}</small>}</span></button>)}
            {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && <div className="suggestion-message">No matching places yet. Keep typing or press Enter to search.</div>}
          </div>}
        </div>
      </section>
      <section className={mobileList ? 'explore list-open' : 'explore'} id="explore" aria-label="Explore tennis courts"><div className="mobile-view-switch" role="group" aria-label="Choose map or list view"><button type="button" aria-pressed={!mobileList} className={!mobileList ? 'active' : ''} onClick={showMapView}>Map</button><button type="button" aria-pressed={mobileList} className={mobileList ? 'active' : ''} onClick={() => setMobileList(true)}>List <span>{filtered.length}</span></button></div><div className="results-panel">
          <div className="results-head"><div><div className="section-kicker">COURTS NEAR</div><h2>{place.label}</h2></div><button className="round-action" title="Center map on location" onClick={() => map.current?.flyTo({ center: [place.lon, place.lat], zoom: 12 })}><Compass size={18}/></button></div>
          <div className="result-meta"><span>{loading ? <><LoaderCircle size={14} className="search-spinner" aria-hidden="true"/> Searching nearby…</> : error ? 'Results unavailable' : `${filtered.length} courts`}</span><label className="sort-control"><span>Sort</span><select aria-label="Sort courts" value={sort} onChange={e => setSort(e.target.value as 'near' | 'lighted')}><option value="near">Nearest first</option><option value="lighted">Lighted first</option></select><ChevronDown size={13}/></label></div>
          {loading && <div className="search-progress" role="status" aria-live="polite"><LoaderCircle size={17} className="search-spinner" aria-hidden="true"/><span>{searchSlow ? 'This area is taking longer than usual. Still searching for courts…' : `Finding tennis courts near ${place.label}…`}</span></div>}
          <div className="filter-toolbar"><button className={`filter-trigger ${filtersOpen || activeFilters ? 'active' : ''}`} aria-expanded={filtersOpen} aria-controls="court-filters" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={15}/> Filters {activeFilters > 0 && <span className="filter-count">{activeFilters}</span>}<ChevronDown size={14}/></button><button className={`quick-filter ${litOnly ? 'active' : ''}`} aria-pressed={litOnly} onClick={() => setLitOnly(!litOnly)}><SunMedium size={15}/> With lights</button>{activeFilters > 0 && <button className="filter-reset" onClick={resetFilters}>Reset</button>}</div>
          {filtersOpen && <div id="court-filters" className="filter-panel">
            <div className="filter-panel-heading"><strong>Refine your search</strong><button aria-label="Close filters" onClick={() => setFiltersOpen(false)}><X size={16}/></button></div>
            <div className="filter-fields"><label>Distance<select value={radius} onChange={e => setRadius(e.target.value)}><option value="all">Nearby area</option><option value="2">Within 2 miles</option><option value="5">Within 5 miles</option><option value="10">Within 10 miles</option></select></label><label>Surface<select value={surface} onChange={e => setSurface(e.target.value)}><option value="all">Any surface</option><option value="hard">Hard court</option><option value="clay">Clay</option><option value="grass">Grass</option></select></label></div>
            <label className="filter-check"><input type="checkbox" checked={publicOnly} onChange={e => setPublicOnly(e.target.checked)}/><span>Confirmed public access<small>Only courts explicitly marked public</small></span></label>
            <p className="filter-note">Filters use listed amenities. Some courts have incomplete details.</p>
            <button className="filter-done" onClick={() => setFiltersOpen(false)}>View {filtered.length} courts<ArrowRight size={15}/></button>
          </div>}
          {activeFilters > 0 && <div className="active-filters">{radius !== 'all' && <button onClick={() => setRadius('all')}>{radius} miles<X size={12}/></button>}{surface !== 'all' && <button onClick={() => setSurface('all')}>{surface === 'hard' ? 'Hard court' : surface}<X size={12}/></button>}{publicOnly && <button onClick={() => setPublicOnly(false)}>Public access<X size={12}/></button>}</div>}
          {error && <div className="error-box" role="alert"><span>{error}</span><button onClick={() => void load(place)}>Retry</button></div>}
          {loading && <div className="skeletons" aria-label="Loading courts"><div className="skeleton-card"/><div className="skeleton-card"/><div className="skeleton-card"/></div>}
          {!loading && !error && filtered.length === 0 && <div className="empty"><span className="empty-icon"><TennisBall size={22}/></span><strong>{activeFilters ? 'No courts match these filters' : 'No courts found nearby'}</strong><p>{activeFilters ? 'Widen the distance or remove a filter.' : 'Try a nearby city or ZIP code.'}</p>{activeFilters > 0 && <button className="text-action" onClick={resetFilters}>Clear filters <ArrowRight size={14}/></button>}</div>}
          {!loading && displayed.map((c, i) => <article key={c.id} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCourt(c); } }} className={selected?.id === c.id ? 'court-card selected' : 'court-card'} onClick={() => selectCourt(c)}>
            <div className="court-index">{String(i + 1).padStart(2, '0')}</div><div className="court-main"><h3 title={c.name}>{c.name}</h3>{c.contextName && <p className="court-context">{c.contextName}</p>}<p className="court-distance"><MapPin size={13}/> {distanceMiles(c, place).toFixed(1)} mi · {c.access === 'public' ? 'Public access listed' : 'Access not listed'}</p><p className="court-address">{c.address ? <>{c.address}{c.addressApprox && <small> · approximate</small>}</> : 'Address not listed'}</p><div className="badges">{c.lighting === 'yes' ? <span className="badge lit"><SunMedium size={13}/> Lights listed</span> : c.lighting === 'no' ? <span className="badge"><Moon size={12}/> No lights listed</span> : <span className="badge"><span className="badge-dot"/> Lighting unknown</span>}{c.courts && <span className="badge">{c.courts} courts</span>}{c.surface && <span className="badge surface">{c.surface.replaceAll('_', ' ')}</span>}</div></div><span className="card-arrow" aria-hidden="true"><ArrowUpRight size={18}/></span>
          </article>)}
          {!loading && displayed.length < filtered.length && <button className="load-more" onClick={() => setVisibleCount(n => n + 30)}>Show 30 more courts <span>({filtered.length - displayed.length} remaining)</span></button>}
          {!loading && <div className="data-note"><span className="note-line"/><p>Court details come from OpenStreetMap and may change. Please confirm access and amenities locally.</p></div>}
        </div>
        <div className="map-panel"><div className="map-canvas" ref={mapEl} aria-label="Interactive map showing public tennis courts" role="application"/>{mapError && <div className="map-error" role="status"><Compass size={22}/><strong>Map unavailable</strong><span>{mapError}</span><button onClick={() => window.location.reload()}>Reload map</button></div>}<div className="map-label">COURT MAP</div><button className="map-locate" onClick={locate} title="Use my location"><LocateFixed size={18}/><span>Near me</span></button>
          {selected && <div className="map-popover"><button className="popover-close" aria-label="Close selected court" onClick={() => setSelected(null)}><X size={16}/></button><span className="popover-label">COURT DETAILS</span><strong>{selected.name}</strong>{selected.contextName && <span className="popover-context">{selected.contextName}</span>}<span className="popover-address">{selected.address || 'Address not listed'}{selected.addressApprox && selected.address ? ' · approximate' : ''}</span><span>{selected.courts ? `${selected.courts} courts` : 'Court count not listed'}{selected.surface ? ` · ${selected.surface} surface` : ''} · {selected.access === 'public' ? 'Public access listed' : 'Access not listed'} · {selected.lighting === 'yes' ? 'Lights listed' : selected.lighting === 'no' ? 'No lights listed' : 'Lighting not listed'}</span><div className="popover-rain"><span className="popover-label">RECENT RAIN · PLAYABILITY ESTIMATE</span>{selectedRain ? <><strong>{selectedRain.score}<small>/100</small><i className={`rain-confidence confidence-${selectedRain.confidence.toLowerCase()}`}>{selectedRain.confidence} confidence</i></strong><span>{selectedRain.summary}</span><span>{rainfallDetail(selectedRain)}</span></> : selectedRainLoading || rainLoading ? <span>Checking recent radar near this court…</span> : selectedRainError || rainError ? <span>{selectedRainError || rainError}</span> : <span>No radar estimate available for this court.</span>}</div><a className="court-source-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">Check or edit OpenStreetMap data <ExternalLink size={13}/></a><button className="directions" onClick={() => directions(selected)}>Get directions <ArrowUpRight size={15}/></button></div>}
          <div className="map-legend" aria-label="Map legend"><span className="legend-item"><span className="legend-dot lime"/>Lighted</span><span className="legend-item"><span className="legend-dot white"/>Lighting unknown</span><span className="legend-label">Radar confidence</span><span className="legend-item"><span className="legend-ring confidence-high"/>High</span><span className="legend-item"><span className="legend-ring confidence-moderate"/>Moderate</span><span className="legend-item"><span className="legend-ring confidence-low"/>Low</span></div>
          <button className="mobile-list-toggle" onClick={() => setMobileList(!mobileList)}>{mobileList ? <><ArrowDown size={16}/> Show map</> : <><ArrowLeft size={16}/> View {filtered.length} courts</>}</button>
        </div>
      </section>
      <section className="rain-planner" aria-labelledby="rain-planner-title"><div className="rain-planner-heading"><div><div className="section-kicker">RECENT RAIN · NEARBY COURTS</div><h2 id="rain-planner-title">Courts with the least recent rain.</h2><p>Recent radar rainfall is compared across nearby courts. Courts with less rain appear first.</p></div><span className="rain-live"><i/> NOAA radar</span></div>
        {rainLoading && <p className="rain-status" role="status">Checking recent rainfall near public courts…</p>}
        {rainError && <p className="rain-status" role="status">{rainError}</p>}
        {!rainLoading && !rainError && recommendedCourts.length > 0 && <div className="rain-recommendations">{recommendedCourts.map((court, index) => { const result = rainById.get(court.id)!; return <button className="rain-recommendation" key={court.id} onClick={() => { selectCourt(court); document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="rain-rank">0{index + 1}</span><span className="rain-court-info"><strong>{court.name}</strong><small className="rain-court-distance"><MapPin size={13}/>{distanceMiles(court, place).toFixed(1)} mi · {court.access === 'public' ? 'Public access listed' : 'Access not listed'}</small><small>{court.contextName ? `${court.contextName} · ` : ''}{court.address || 'Address not listed'}{court.addressApprox ? ' · approx.' : ''}</small><span className="badges rain-court-badges">{court.lighting === 'yes' ? <span className="badge lit"><SunMedium size={13}/> Lights listed</span> : court.lighting === 'no' ? <span className="badge"><Moon size={12}/> No lights listed</span> : <span className="badge"><span className="badge-dot"/> Lighting unknown</span>}{court.courts && <span className="badge">{court.courts} courts</span>}{court.surface && <span className="badge surface">{court.surface.replaceAll('_', ' ')}</span>}</span><small>{result.summary}</small><small>{rainfallDetail(result)}</small></span><span className="rain-score"><small>PLAYABILITY</small><strong>{result.score}<small>/100</small></strong><small className={`rain-confidence confidence-${result.confidence.toLowerCase()}`}>{result.confidence} confidence</small></span><ArrowUpRight size={16}/></button>; })}</div>}
        {!rainLoading && !rainError && !recommendedCourts.length && <p className="rain-status">{rainCandidates.length ? 'No nearby courts have usable radar estimates yet.' : 'No courts were found nearby.'}</p>}
        <p className="rain-caveat">The estimate uses radar rainfall sampled at about 1 km. It cannot account for shade, drainage, or the court’s current surface. Courts marked private, membership-only, fee-based, or as clubs are left out. OpenStreetMap details may be incomplete, so confirm access, address, and lighting locally.</p>
      </section>
      <section id="conditions" className="weather-section"><div className="weather-title"><div><div className="section-kicker">7-DAY WEATHER</div><h2>Plan around the forecast.</h2><p>{place.label} · forecast for the next 7 days</p>{sunset && !weatherError && !weatherLoading && <p className="sunset-note"><Sun size={13}/> Estimated sunset {formatLocalTime(sunset, timeZone)}</p>}</div><div className="weather-icon"><CloudSun size={26}/></div></div>
        {weatherError && <p className="weather-error" role="status">{weatherError}</p>}
        {weatherLoading ? <div className="weather-grid">{[0,1,2,3].map(n => <div className="weather-card skeleton-weather" key={n}/>)}</div> : bestWindows.length ? <div className="weather-grid weekly-grid">{bestWindows.map((day, i) => <article className={`weather-card ${i === bestWindowDay ? 'best-window' : ''}`} key={day.date}><div className="weather-time"><span>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })}</span>{i === bestWindowDay && <span className="best-window-tag">BEST DAY</span>}</div><div className="window-list">{day.windows.map(window => <div className="window-item" key={window.time}><div className="window-details"><strong>{formatLocalTimeRange(window.time, window.endTime, timeZone)}</strong><span>{window.short}</span><small>{window.wind} mph wind · {window.precip}% rain</small></div><span className="window-score">{window.score}<small>score</small></span></div>)}</div></article>)}</div> : <p className="weather-error">No two-hour period in the forecast meets the play-score threshold.</p>}
        <div className="score-explainer"><span className="score-mark"><Clock3 size={17}/></span><p><strong>Play score</strong> ranks available two-hour forecast slots by temperature, wind, and rain probability. Multiple non-overlapping slots are shown when conditions support them. The radar planner above compares recent rainfall by court.</p><span className="weather-source">U.S. National Weather Service</span></div>
      </section>
      <section className="about-strip" id="about"><div><span className="section-kicker">ABOUT OPENCOURTS</span><h2>A local guide to tennis.</h2></div><div><p>Court locations and amenities come from OpenStreetMap. Access and opening hours can change; check with the venue before visiting.</p><a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">Explore the source<ExternalLink size={14}/></a></div></section>
      <section className="support-strip" id="support" aria-labelledby="support-title"><div className="support-copy"><span className="section-kicker">SUPPORT THE PROJECT</span><h2 id="support-title">Help keep OpenCourts available.</h2><p>OpenCourts is free to use. If it has helped you find a court or plan around the weather, you can help pay for hosting and data costs. Contributions are optional and are not tax-deductible.</p></div><a className="support-qr" href="https://buymeacoffee.com/OpenCourts" target="_blank" rel="noreferrer" aria-label="Scan the QR code to support OpenCourts on Buy Me a Coffee"><img src="/qr-code.png" alt="QR code for OpenCourts on Buy Me a Coffee"/><span>Scan to support</span></a><a className="support-button" href="https://buymeacoffee.com/OpenCourts" target="_blank" rel="noreferrer">Support OpenCourts<ExternalLink size={15}/></a></section>
    </main>
    <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><TennisBall size={18}/></span><span>open<span className="brand-light">courts</span></span></a><span>Find Your Court. Play Your Game.</span><div><a href="/support.html">Support</a><a href="/about.html">About</a><a href="/privacy.html">Privacy</a><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Data & attribution</a><a href="/contact.html">Contact</a></div><span className="copyright">© 2026 OpenCourts</span></footer>
  </div>;
}
export default App;
