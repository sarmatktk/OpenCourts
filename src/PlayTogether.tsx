import SiteDateField from './SiteDateField';
import SiteSelect from './SiteSelect';
import {focusSearch} from './search-focus';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, LoaderCircle, MapPin, Plus, Search, SlidersHorizontal, UsersRound } from 'lucide-react';
import { findPlace } from './services';
import { gameApi, gameDate, type Game } from './game-api';
import PlayTogetherShell from './PlayTogetherShell';

type Page={games:Game[];nextCursor:string|null};
export default function PlayTogether(){
  const [filtersOpen,setFiltersOpen]=useState(false),[query,setQuery]=useState(''),[date,setDate]=useState(''),[radius,setRadius]=useState('25'),[format,setFormat]=useState('any'),[skill,setSkill]=useState('any');
  const [location,setLocation]=useState('All locations'),[games,setGames]=useState<Game[]>([]),[next,setNext]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const current=useRef(new URLSearchParams()),controller=useRef<AbortController|null>(null);
  const load=useCallback(async(params:URLSearchParams,append=false)=>{
    controller.current?.abort();const c=new AbortController();controller.current=c;setLoading(true);setError('');
    try{const data=await gameApi<Page>(`games?${params}`,{signal:c.signal});if(c.signal.aborted)return;setGames(old=>append?[...old,...data.games.filter(game=>!old.some(g=>g.id===game.id))]:data.games);setNext(data.nextCursor);}
    catch(e){if(!c.signal.aborted)setError((e as Error).message);}
    finally{if(!c.signal.aborted)setLoading(false);}
  },[]);
  useEffect(()=>{void load(new URLSearchParams());return()=>controller.current?.abort();},[load]);
  useEffect(()=>{const focus=()=>{if(window.location.hash==='#search')focusSearch();};focus();window.addEventListener('hashchange',focus);return()=>window.removeEventListener('hashchange',focus);},[]);
  async function search(e:React.FormEvent){
    e.preventDefault();controller.current?.abort();setLoading(true);setError('');
    try{
      const params=new URLSearchParams({radius,format,skill});let label='All locations';
      if(query.trim()){const place=await findPlace(query.trim());params.set('lat',String(place.lat));params.set('lon',String(place.lon));label=place.label;}
      if(date){const start=new Date(`${date}T00:00:00`),end=new Date(start);end.setDate(end.getDate()+1);params.set('from',start.toISOString());params.set('to',end.toISOString());}
      current.current=params;setLocation(label);await load(params);
    }catch(e){setError((e as Error).message);setLoading(false);}
  }
  function clear(){setQuery('');setDate('');setRadius('25');setFormat('any');setSkill('any');setLocation('All locations');current.current=new URLSearchParams();void load(current.current);}
  return <PlayTogetherShell home>
    <div className="pt-games-heading"><div className="pt-heading pt-heading-mobile-compact"><span className="section-kicker">PLAY TOGETHER</span><h1>Find tennis games.</h1><p>Browse public games or organize one at a court.</p></div><a className="pt-primary" href="/play-together/create"><Plus size={18}/> Create a game</a></div>
    <form id="search" className={`pt-panel pt-game-filters${filtersOpen?' pt-game-filters-open':''}`} onSubmit={search} aria-label="Find tennis games"><div className="pt-game-search"><label><span>City or area</span><div className="pt-search-input"><MapPin size={18}/><input autoFocus={window.location.hash==='#search'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a city, area or ZIP code" type="search"/><button type="button" className="pt-game-filter-toggle" aria-label="Search filters" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(value=>!value)}><SlidersHorizontal size={20} aria-hidden="true"/></button></div></label><button className="pt-primary" type="submit" disabled={loading}><Search size={17}/>Find games</button></div><div className="pt-filter-grid"><label>Date<SiteDateField value={date} onChange={setDate}/></label><label>Distance<SiteSelect aria-label="Distance" value={radius} onValueChange={value=>setRadius(value)}>{[5,10,25,50].map(n=><option value={n} key={n}>Within {n} miles</option>)}</SiteSelect></label><label>Format<SiteSelect aria-label="Format" value={format} onValueChange={value=>setFormat(value)}><option value="any">All formats</option><option value="singles">Singles</option><option value="doubles">Doubles</option></SiteSelect></label><label>Skill preference<SiteSelect aria-label="Skill preference" value={skill} onValueChange={value=>setSkill(value)}><option value="any">All skill levels</option><option value="beginner">Beginner & open games</option><option value="intermediate">Intermediate & open games</option><option value="advanced">Advanced & open games</option></SiteSelect></label></div><div className="pt-filter-foot"><span>Dates follow your device’s time zone. Select a location to apply distance.</span><button className="pt-text-button" type="button" onClick={clear} disabled={loading}>Reset filters</button></div></form>
    <section className="pt-game-results" aria-labelledby="games-title" aria-busy={loading}><div className="pt-results-title"><div><h2 id="games-title">Upcoming public games</h2><p>{location}</p></div><CalendarDays size={24} aria-hidden="true"/></div>
      {error&&<div className="pt-message pt-error" role="alert">{error}<button className="pt-text-button" onClick={()=>void load(current.current)}>Try again</button></div>}
      {loading&&<p className="pt-inline-status" role="status"><LoaderCircle className="search-spinner" size={18}/>Finding games…</p>}
      {!loading&&!error&&games.length===0&&<div className="pt-panel pt-empty"><h3>No upcoming games found.</h3><p>Try another date or location.</p><a className="pt-primary" href="/play-together/create">Create a game <ArrowRight size={16}/></a></div>}
      <div className="pt-game-grid">{games.map(game=><article className="pt-panel pt-game-card" key={game.id}><div className="pt-game-tag">{game.format==='singles'?'Singles':'Doubles'} · {game.skillPreference==='any'?'All skill levels':game.skillPreference}</div><h3><a href={`/play-together/game?id=${encodeURIComponent(game.id)}`}>{game.title}</a></h3><p><Clock3 size={16}/>{gameDate(game)}</p><p><MapPin size={16}/>{game.court.name}{game.distanceMiles!==undefined?` · ${game.distanceMiles} mi`:''}</p><p><UsersRound size={16}/>{game.playerCount} of {game.capacity} players · Organized by {game.organizer.displayName}</p><a className="pt-secondary pt-card-action" href={`/play-together/game?id=${encodeURIComponent(game.id)}`}>View game <ArrowRight size={16}/></a></article>)}</div>
      {next&&!loading&&<button className="pt-secondary pt-load-more" onClick={()=>{const params=new URLSearchParams(current.current);params.set('cursor',next);void load(params,true);}}>Show more games</button>}
    </section>
    <aside className="pt-community-account"><div><h2>Your tennis groups</h2><p>Find public and private groups, request membership, or create your own tennis community.</p></div><a className="pt-secondary" href="/play-together/groups">Find tennis groups</a></aside>
  </PlayTogetherShell>;
}
