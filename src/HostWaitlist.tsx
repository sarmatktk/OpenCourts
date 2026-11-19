import {useEffect,useState} from 'react';
import {Clock3,UsersRound} from 'lucide-react';
import {gameApi} from './game-api';
type Entry={id:string;displayName:string;status:string;expiresAt:number|null};
export default function HostWaitlist({gameId}:{gameId:string}){
 const [entries,setEntries]=useState<Entry[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let controller:AbortController|null=null;async function load(){controller?.abort();const c=new AbortController();controller=c;try{const d=await gameApi<{players:Entry[]}>(`games/${gameId}/waitlist`,{signal:c.signal});if(!c.signal.aborted){setEntries(d.players);setError('');}}catch(e){if(!c.signal.aborted){setEntries([]);setError((e as Error).message);}}finally{if(!c.signal.aborted)setLoading(false);}}void load();const refresh=()=>{if(!document.hidden)void load();};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{controller?.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};},[gameId]);
 let position=0;
 return <section className="pt-waitlist" aria-label="Group game waitlist"><h3><UsersRound size={17} aria-hidden="true"/> Waitlist <span className="pt-help">({entries.length})</span></h3><p className="pt-help">Places are offered in signup order. Each offer reserves one place for up to two hours or until game start. Guests require separate approval. Showing up to 200 players.</p>{loading?<p role="status">Loading waitlist...</p>:error?<p role="alert">{error}</p>:!entries.length?<p className="pt-help">No players waiting.</p>:<ol className="pt-waitlist-rows">{entries.map(p=><li key={p.id}><span className="pt-waitlist-position">{p.status==='offered'?<Clock3 size={16} aria-label="Offered"/>:++position}</span><span><strong>{p.displayName}</strong><small>{p.status==='offered'?'Place offered - Accept by '+new Date(p.expiresAt!).toLocaleString():'Waiting for a place'}</small></span></li>)}</ol>}</section>;
}
