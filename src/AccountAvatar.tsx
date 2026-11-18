import {useEffect,useRef,useState} from 'react';
import {UserRound} from 'lucide-react';
import {gameApi,type GameAccount} from './game-api';
export default function AccountAvatar(){
 const [src,setSrc]=useState<string|null>(null);const generation=useRef(0);
 useEffect(()=>{const c=new AbortController();async function refresh(){const ticket=++generation.current;setSrc(null);try{const a=await gameApi<GameAccount>('auth/me',{signal:c.signal});if(ticket===generation.current&&!c.signal.aborted&&a.player)setSrc('/api/media/player/'+encodeURIComponent(a.player.id)+'?v='+Date.now());}catch{/* Signed-out/unavailable account uses neutral fallback. */}}void refresh();window.addEventListener('opencourts-photo-changed',refresh);window.addEventListener('focus',refresh);return()=>{++generation.current;c.abort();window.removeEventListener('opencourts-photo-changed',refresh);window.removeEventListener('focus',refresh);};},[]);
 return src?<img className="pt-account-avatar" src={src} alt="" onError={()=>setSrc(null)}/>:<UserRound size={20} aria-hidden="true"/>;
}
