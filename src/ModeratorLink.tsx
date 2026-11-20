import {useEffect,useState} from 'react';
import {ShieldCheck} from 'lucide-react';
import {gameApi} from './game-api';
export default function ModeratorLink(){
 const [allowed,setAllowed]=useState(false);
 const [expanded,setExpanded]=useState(true);
 useEffect(()=>{const c=new AbortController();void gameApi<{moderator:boolean}>('players/blocks',{signal:c.signal}).then(d=>{if(!c.signal.aborted)setAllowed(d.moderator===true);}).catch(()=>{});return()=>c.abort();},[]);
 return allowed?<div className="pt-moderator-entry">{location.pathname.replace(/\/$/,'')==='/play-together/players'?<button type="button" className="pt-secondary" aria-expanded={expanded} aria-controls="moderation" onClick={()=>{const next=!expanded;setExpanded(next);window.dispatchEvent(new CustomEvent('opencourts:moderation-toggle',{detail:next}));}}><ShieldCheck size={18} aria-hidden="true"/>Site moderation - reports and accounts</button>:<a className="pt-secondary" href="/play-together/players#moderation"><ShieldCheck size={18} aria-hidden="true"/>Site moderation - reports and accounts</a>}</div>:null;
}
