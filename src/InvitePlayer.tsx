import SiteSelect from './SiteSelect';
import {useEffect,useState,useId} from 'react';
import {MailPlus} from 'lucide-react';
import {gameApi,type GameAccount} from './game-api';
type Choice={id:string;title:string;startsAt:number;timeZone:string;invited:boolean|number};

export default function InvitePlayer({playerId,displayName}:{playerId:string;displayName:string}){
 const pickerId=useId();
 const [open,setOpen]=useState(false),[games,setGames]=useState<Choice[]>([]),[selected,setSelected]=useState(''),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{
  if(!open)return;const c=new AbortController();setLoading(true);setError('');setNotice('');setGames([]);setSelected('');
  void gameApi<{games:Choice[]}>('players/invitable-games?'+new URLSearchParams({playerId}),{signal:c.signal}).then(d=>{
   if(c.signal.aborted)return;setGames(d.games);setSelected(d.games.find(g=>!g.invited)?.id??'');
  }).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});
  return()=>c.abort();
 },[open,playerId]);
 async function send(){setBusy(true);setError('');try{
  const a=await gameApi<GameAccount>('auth/me');if(a.player?.id===playerId){setError('You cannot invite yourself.');return;}await gameApi('players/invite-game',{method:'POST',headers:{'X-CSRF-Token':a.csrfToken??''},body:JSON.stringify({playerId,gameId:selected})});
  setGames(previous=>previous.map(g=>g.id===selected?{...g,invited:true}:g));setNotice('Invitation sent. They can request a place; your approval is still required.');
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const chosen=games.find(g=>g.id===selected);
 return <div className="pt-player-invite">
  <button type="button" className="pt-primary pt-player-invite-toggle" aria-label={'Invite '+displayName+' to a game'} aria-expanded={open} aria-controls={pickerId} onClick={()=>setOpen(value=>!value)}><MailPlus size={16} aria-hidden="true"/>Invite to game</button>
  {open&&<div id={pickerId} className="pt-invite-picker" role="region" aria-label={'Invite '+displayName}>
   <p className="pt-help">Invite {displayName} to a public game you organize. Invite up to 10 players per game. Invitations do not reserve places.</p>
   {loading?<p role="status">Loading your public games...</p>:games.length?<form className="pt-form" onSubmit={e=>{e.preventDefault();void send();}}>
    <label>Your upcoming public games<SiteSelect value={selected} disabled={busy} onValueChange={value=>{setSelected(value);setNotice('');}} required><option value="" disabled>Choose a game</option>{games.map(g=><option key={g.id} value={g.id} disabled={!!g.invited}>{g.title} - {new Intl.DateTimeFormat('en-US',{timeZone:g.timeZone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(g.startsAt))}{g.invited?' (invited)':''}</option>)}</SiteSelect></label>
    <button className="pt-primary" disabled={busy||!chosen||!!chosen.invited}>{busy?'Sending...':chosen?.invited?'Invitation sent':'Send invitation'}</button>
    {!selected&&games.every(g=>g.invited)&&<p role="status">This player has already been invited to your available games.</p>}
   </form>:!error&&<p className="pt-help">No eligible public games. Choose a future game with space, fewer than 10 invited players and no existing request from this player. <a href="/play-together/create">Create a public game</a></p>}
   {error&&<p className="pt-message pt-error" role="alert">{error}</p>}{notice&&<p className="pt-help" role="status">{notice}</p>}
  </div>}
 </div>;
}
