import {useEffect,useState} from 'react';
import PlayTogether from './PlayTogether';
import {gameApi,type GameAccount} from './game-api';
export default function CommunityLanding(){
 const [ready,setReady]=useState(false);
 useEffect(()=>{const c=new AbortController();void gameApi<GameAccount>('auth/me',{signal:c.signal}).then(a=>{if(c.signal.aborted)return;if(a.player){window.location.replace('/play-together/feed');return;}setReady(true);}).catch(()=>{if(!c.signal.aborted)setReady(true);});return()=>c.abort();},[]);
 return ready?<PlayTogether/>:<div className="pt-loading" role="status">Opening Play Together...</div>;
}
