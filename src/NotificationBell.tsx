import {useEffect,useState} from 'react';
import {Bell} from 'lucide-react';
import {gameApi,type GameAccount} from './game-api';
export default function NotificationBell(){
 const [count,setCount]=useState(0),[signedIn,setSignedIn]=useState(false);
 useEffect(()=>{const c=new AbortController();async function load(){if(document.hidden)return;try{const a=await gameApi<GameAccount>('auth/me',{signal:c.signal});if(!a.player){setSignedIn(false);setCount(0);return;}const d=await gameApi<{notifications:{readAt:number|null;archived?:boolean}[]}>('games/notifications',{signal:c.signal});if(!c.signal.aborted){setSignedIn(true);setCount(d.notifications.filter(n=>!n.readAt&&!n.archived).length);}}catch{if(!c.signal.aborted){setCount(0);setSignedIn(false);}}}void load();const timer=setInterval(()=>void load(),30000);window.addEventListener('focus',load);window.addEventListener('opencourts-notifications-changed',load);return()=>{c.abort();clearInterval(timer);window.removeEventListener('focus',load);window.removeEventListener('opencourts-notifications-changed',load);};},[]);
 if(!signedIn)return null;
 return <a className="pt-account-link pt-notification-bell" href="/play-together/notifications" aria-label={`Notifications, ${count} unread`}><Bell size={20} aria-hidden="true"/>{count>0&&<span className="pt-notification-count" aria-hidden="true">{count>=100?'99+':count}</span>}</a>;
}
