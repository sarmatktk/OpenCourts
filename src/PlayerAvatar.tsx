import {useEffect,useState} from 'react';
export default function PlayerAvatar({id,name,gameId}:{id:string|null;name:string;gameId?:string}){
 const [missing,setMissing]=useState(false),[loaded,setLoaded]=useState(false),[version,setVersion]=useState(0);
 useEffect(()=>{setMissing(false);setLoaded(false);},[id,gameId]);
 useEffect(()=>{const refresh=()=>{setVersion(v=>v+1);setMissing(false);setLoaded(false);};window.addEventListener('opencourts-photo-changed',refresh);return()=>window.removeEventListener('opencourts-photo-changed',refresh);},[]);
 const initials=name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(word=>[...word][0]).join('').toLocaleUpperCase()||'?';
 return <span className="pt-player-avatar" aria-hidden="true"><span>{initials}</span>{id&&!missing&&<img src={'/api/media/player/'+encodeURIComponent(id)+(gameId?'?gameId='+encodeURIComponent(gameId):'?')+(version?'&refresh='+version:'')} alt="" width={28} height={28} loading="lazy" decoding="async" className={loaded?'loaded':''} onLoad={()=>setLoaded(true)} onError={()=>setMissing(true)}/>}</span>;
}
