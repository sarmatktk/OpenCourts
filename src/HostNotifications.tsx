import {useCallback,useEffect,useRef,useState} from 'react';
import {gameApi,type GameAccount} from './game-api';
type Note={id:string;gameId?:string;gameTitle?:string;groupId?:string;groupName?:string;displayName:string;kind:string;reason?:string;placesReleased?:number;guestCount?:number;createdAt:number;readAt:number|null;actionPlayerId?:string|null;requestStatus?:string|null};
const messages:Record<string,string>={guest_requested:'requested guest places ? review in the game',guest_approved:'approved your guest request',guest_rejected:'declined your guest request',guest_cancelled:'cancelled guest places',group_requested:'requested group membership',group_active:'approved your group membership',group_rejected:'declined your group membership request',group_removed:'removed you from the group',group_archived:'archived the group',requested:'requested to join',withdrawn:'withdrew their request',approved:'approved your request',rejected:'declined your request',removed:'removed you from the game',game_cancelled:'cancelled the game',cancelled:'cancelled their place'};
function status(note:Note){
 if(note.actionPlayerId)return 'Awaiting your approval';
 if(note.kind==='requested'||note.kind==='group_requested')return ({approved:'Approved',active:'Approved',rejected:'Declined',removed:'Removed',withdrawn:'Withdrawn',left:'Withdrawn',superseded:'Earlier request'} as Record<string,string>)[note.requestStatus??'']??'View current request status';
 return note.readAt?'Read':'Unread';
}
export default function HostNotifications(){
 const [unreadOnly,setUnreadOnly]=useState(false),[limit,setLimit]=useState(20),[loaded,setLoaded]=useState(false);
 const [notes,setNotes]=useState<Note[]>([]),[csrf,setCsrf]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null),[notice,setNotice]=useState('');
 const active=useRef(false),controller=useRef<AbortController|null>(null);
 const load=useCallback(async()=>{
 controller.current?.abort();const c=new AbortController();controller.current=c;
 try{const a=await gameApi<GameAccount>('auth/me',{signal:c.signal});if(!active.current||c.signal.aborted)return;if(!a.player){setNotes([]);setCsrf('');setLoaded(true);setError('Sign in to view notifications.');return;}
 const d=await gameApi<{notifications:Note[]}>('games/notifications',{signal:c.signal});if(active.current&&!c.signal.aborted){setCsrf(a.csrfToken??'');setNotes(d.notifications);setLoaded(true);setError('');}}
 catch(e){if(active.current&&!c.signal.aborted){setNotes([]);setError((e as Error).message);setLoaded(true);}}
 },[]);
 useEffect(()=>{active.current=true;void load();const refresh=()=>{if(!document.hidden)void load();};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{active.current=false;controller.current?.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};},[load]);
 async function markRead(id:string){await gameApi('games/notifications/read',{method:'POST',headers:{'X-CSRF-Token':csrf},body:JSON.stringify({id})});setNotes(previous=>previous.map(n=>n.id===id?{...n,readAt:Date.now()}:n));window.dispatchEvent(new Event('opencourts-notifications-changed'));}
 async function read(id:string){setBusy(id);setError('');try{await markRead(id);}catch(e){setError((e as Error).message);}finally{setBusy(null);}}
 async function decide(n:Note,action:'approve'|'reject'){
 if(!n.actionPlayerId)return;setBusy(n.id);setError('');setNotice('');
 try{const path=n.groupId?'groups/'+n.groupId:'games/'+n.gameId;await gameApi(path+'/'+action,{method:'POST',headers:{'X-CSRF-Token':csrf},body:JSON.stringify({playerId:n.actionPlayerId})});await markRead(n.id);await load();setNotice(action==='approve'?'Request approved. The requester has been notified.':'Request denied. The requester has been notified.');}
 catch(e){await load();setError((e as Error).message);}finally{setBusy(null);}
 }
 const filtered=unreadOnly?notes.filter(n=>!n.readAt):notes;
 if(!loaded&&!error)return <p role="status">Loading notifications...</p>;
 return <section id="host-notifications" className="pt-panel pt-notifications" aria-label="Notifications">
 <h2>Notifications ({notes.filter(n=>!n.readAt).length} unread)</h2><div className="pt-feed-filters" role="group" aria-label="Notification filters">{[false,true].map(only=><button key={String(only)} className={only===unreadOnly?'pt-primary':'pt-secondary'} aria-pressed={only===unreadOnly} onClick={()=>{setUnreadOnly(only);setLimit(20);}}>{only?'Unread':'All'}</button>)}</div>{!filtered.length&&!error&&<p>{unreadOnly?'You have no unread notifications.':'You have no notifications yet.'}</p>}
 {error&&<p className="pt-message pt-error" role="alert">{error}</p>}{notice&&<p className="pt-message" role="status">{notice}</p>}
 <ul className="pt-notification-list">{filtered.slice(0,limit).map(n=><li key={n.id}><article className="pt-notification-card">
 <div className="pt-notification-heading"><strong>{!n.readAt?'New: ':''}{n.displayName} {messages[n.kind]??'updated your activity'}</strong><span className="pt-coming">{status(n)}</span></div>
 <div className="pt-notification-meta"><a className="pt-text-link" href={n.groupId?`/play-together/group?id=${n.groupId}`:`/play-together/game?id=${n.gameId}`}>{n.groupName??n.gameTitle}</a><time className="pt-help" dateTime={new Date(n.createdAt).toISOString()}>{new Date(n.createdAt).toLocaleString()}</time></div>
 {n.kind.startsWith('guest_')&&<p>{n.guestCount} guest places. <a className="pt-text-link" href={'/play-together/game?id='+n.gameId}>View guest request</a></p>}
 {n.reason&&<p>Reason: {n.reason}</p>}
 {n.kind==='approved'&&<p>Your place is confirmed.</p>}
 {(n.kind==='withdrawn'||n.kind==='cancelled')&&<p>{n.placesReleased??0} places released.</p>}
 {(n.actionPlayerId||!n.readAt)&&<div className="pt-notification-actions">{n.actionPlayerId&&<><button type="button" className="pt-primary" disabled={busy!==null} onClick={()=>void decide(n,'approve')}>Approve</button><button type="button" className="pt-secondary" disabled={busy!==null} onClick={()=>void decide(n,'reject')}>Deny</button></>}{!n.readAt&&<button type="button" className="pt-secondary pt-muted-action" disabled={busy!==null} onClick={()=>void read(n.id)}>Mark as read</button>}</div>}
 </article></li>)}</ul>{filtered.length>limit&&<button className="pt-secondary" onClick={()=>setLimit(n=>n+20)}>More notifications</button>}<p className="pt-help">Showing your latest 100 notifications.</p></section>;
}
