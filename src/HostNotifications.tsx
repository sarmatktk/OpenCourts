import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Users} from 'lucide-react';
import TennisBall from './TennisBall';
import {gameApi,type GameAccount} from './game-api';
type Note={postId?:string;oldStart?:number;newStart?:number;timeZone?:string;id:string;gameId?:string;gameTitle?:string;groupId?:string;groupName?:string;displayName:string;kind:string;reason?:string;placesReleased?:number;guestCount?:number;createdAt:number;readAt:number|null;actionPlayerId?:string|null;requestStatus?:string|null;invitationStatus?:string;archived?:boolean};
const messages:Record<string,string>={discussion_reply:'replied to a group discussion',chat_message:'has new messages',schedule_changed:'has changed',waitlist_offer:'a place opened in your group game',game_invited:'invited you to a game',guest_requested:'requested guest places ? review in the game',guest_approved:'approved your guest request',guest_rejected:'declined your guest request',guest_cancelled:'cancelled guest places',group_requested:'requested group membership',group_active:'approved your group membership',group_rejected:'declined your group membership request',group_removed:'removed you from the group',group_archived:'archived the group',requested:'requested to join',withdrawn:'withdrew their request',approved:'approved your request',rejected:'declined your request',removed:'removed you from the game',game_cancelled:'cancelled the game',cancelled:'cancelled their place'};
function status(note:Note){
 if(note.kind==='game_invited')return ({available:'Invitation',requested:'Awaiting approval',joined:'Going',closed:'Closed',expired:'Expired',completed:'Completed',cancelled:'Cancelled'} as Record<string,string>)[note.invitationStatus??'']??'View game';
 if(note.actionPlayerId)return 'Awaiting your approval';
 if(note.kind==='requested'||note.kind==='group_requested')return ({approved:'Approved',active:'Approved',rejected:'Declined',removed:'Removed',withdrawn:'Withdrawn',left:'Withdrawn',superseded:'Earlier request'} as Record<string,string>)[note.requestStatus??'']??'View current request status';
 return note.readAt?'Read':'Unread';
}
export default function HostNotifications(){
 const [view,setView]=useState<'active'|'unread'|'history'>('active'),[limit,setLimit]=useState(20),[loaded,setLoaded]=useState(false);
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
 try{const path=n.groupId?'groups/'+n.groupId:'games/'+n.gameId;await gameApi(path+'/'+action,{method:'POST',headers:{'X-CSRF-Token':csrf},body:JSON.stringify({playerId:n.actionPlayerId})});await markRead(n.id);await load();setNotice(action==='approve'?'Request approved. The requester has been notified.':'Request rejected. The requester has been notified.');}
 catch(e){await load();setError((e as Error).message);}finally{setBusy(null);}
 }
 async function acceptInvitation(n:Note){
 setBusy(n.id);setError('');setNotice('');try{await gameApi('games/'+n.gameId+'/join',{method:'POST',headers:{'X-CSRF-Token':csrf},body:'{}'});await markRead(n.id);await load();setNotice('Join request sent. The organizer must approve your place.');}catch(e){await load();setError((e as Error).message);}finally{setBusy(null);}
 }
 const filtered=notes.filter(n=>view==='history'?!!n.archived:!n.archived&&(view!=='unread'||!n.readAt));
 if(!loaded&&!error)return <p role="status">Loading notifications...</p>;
 return <section id="host-notifications" className="pt-panel pt-notifications" aria-label="Notifications">
 <h2>Notifications ({notes.filter(n=>!n.readAt&&!n.archived).length} unread)</h2><div className="pt-feed-filters" role="group" aria-label="Notification filters">{(['active','unread','history'] as const).map(tab=><button key={tab} className={tab===view?'pt-primary':'pt-secondary'} aria-pressed={tab===view} onClick={()=>{setView(tab);setLimit(20);}}>{tab==='active'?'Active':tab==='unread'?'Unread':'History'}</button>)}</div>{!filtered.length&&!error&&<p>{view==='unread'?'You have no unread notifications.':view==='history'?'No archived invitations yet.':'You have no active notifications.'}</p>}
 {error&&<p className="pt-message pt-error" role="alert">{error}</p>}{notice&&<p className="pt-message" role="status">{notice}</p>}
 <ul className="pt-notification-list">{filtered.slice(0,limit).map(n=><li key={n.id}><article className="pt-notification-card">
 <div className="pt-notification-heading"><strong>{!n.readAt&&!n.archived?'New: ':''}{n.displayName} {messages[n.kind]??'updated your activity'}</strong><span className="pt-coming">{status(n)}</span></div>
 <div className="pt-notification-meta"><a className="pt-notification-destination" href={n.groupId?`/play-together/group?id=${n.groupId}${n.postId?'#discussion-'+n.postId:''}`:`/play-together/game?id=${n.gameId}${n.kind==='chat_message'?'#chat':''}`}>{n.groupId?<Users size={16} aria-hidden="true"/>:<TennisBall size={16}/>}<span>{n.groupName??n.gameTitle??(n.groupId?"View group":"View game")}</span><ArrowUpRight size={15} aria-hidden="true"/></a><time className="pt-help" dateTime={new Date(n.createdAt).toISOString()}>{new Date(n.createdAt).toLocaleString()}</time></div>
 {n.kind.startsWith('guest_')&&<p>{n.guestCount} guest places. <a className="pt-text-link" href={'/play-together/game?id='+n.gameId}>View guest request</a></p>}
 {n.kind==='schedule_changed'&&n.oldStart&&n.newStart&&<p>Previously: {new Intl.DateTimeFormat('en-US',{timeZone:n.timeZone,dateStyle:'medium',timeStyle:'short'}).format(n.oldStart)}<br/>Now: {new Intl.DateTimeFormat('en-US',{timeZone:n.timeZone,dateStyle:'medium',timeStyle:'short'}).format(n.newStart)} ({n.timeZone})</p>}{n.reason&&<p>Reason: {n.reason}</p>}
 {n.kind==='waitlist_offer'&&<a className="pt-primary" href={'/play-together/game?id='+n.gameId}>Review place offer</a>}{n.kind==='game_invited'&&<div className="pt-notification-actions">{n.invitationStatus==='available'&&<button className="pt-primary" disabled={busy!==null} onClick={()=>void acceptInvitation(n)}>Request a place</button>}<a className="pt-secondary" href={'/play-together/game?id='+n.gameId}>View game</a><p className="pt-help">{n.archived?(n.invitationStatus==='cancelled'?'This game was cancelled.':n.invitationStatus==='completed'?'This game has finished.':'This invitation expired when the game started.'):'Invitations do not reserve places. Organizer approval is required.'}</p></div>}
 {n.kind==='approved'&&<p>Your place is confirmed.</p>}
 {(n.kind==='withdrawn'||n.kind==='cancelled')&&<p>{n.placesReleased??0} places released.</p>}
 {(n.actionPlayerId||(!n.readAt&&!n.archived))&&<div className="pt-notification-actions">{n.actionPlayerId&&<><button type="button" className="pt-secondary" disabled={busy!==null} onClick={()=>void decide(n,'approve')}>Approve</button><button type="button" className="pt-secondary" disabled={busy!==null} onClick={()=>void decide(n,'reject')}>Reject</button></>}{!n.readAt&&<button type="button" className="pt-secondary pt-muted-action" disabled={busy!==null} onClick={()=>void read(n.id)}>Mark as read</button>}</div>}
 </article></li>)}</ul>{filtered.length>limit&&<button className="pt-secondary" onClick={()=>setLimit(n=>n+20)}>More notifications</button>}<p className="pt-help">Showing your latest 100 notifications.</p></section>;
}
