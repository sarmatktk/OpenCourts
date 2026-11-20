import {useEffect,useState} from 'react';
import {gameApi,type Game} from './game-api';
import SiteSelect from './SiteSelect';

type Preview={confirmedPlaces:number;reservedPlaces:number;candidates:{playerId:string;displayName:string;willConfirm:boolean|number}[]};
export default function GameSettings({game,version,csrf,busy,onSave}:{game:Game;version:number;csrf:string;busy:boolean;onSave:(body:Record<string,unknown>)=>Promise<void>}){
 const [title,setTitle]=useState(game.title),[notes,setNotes]=useState(game.notes??''),[format,setFormat]=useState(game.format),[courts,setCourts]=useState(game.courtCount??1),[capacity,setCapacity]=useState(game.capacity),[fill,setFill]=useState(true);
 const [preview,setPreview]=useState<Preview|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setTitle(game.title);setNotes(game.notes??'');setFormat(game.format);setCourts(game.courtCount??1);setCapacity(game.capacity);},[game.id,version,game.title,game.notes,game.format,game.courtCount,game.capacity]);
 const minimum=courts*(format==='singles'?2:4),increasing=capacity>game.capacity;
 const invalid=!Number.isInteger(capacity)||capacity<Math.max(minimum,game.playerCount)||capacity>128||!Number.isInteger(courts)||courts<1||courts>16;
 useEffect(()=>{
  setPreview(null);setError('');if(!increasing||!fill||invalid){setLoading(false);return;}
  const controller=new AbortController();setLoading(true);
  const timer=setTimeout(()=>{void gameApi<Preview>('games/'+game.id+'/edit-preview',{method:'POST',signal:controller.signal,headers:{'X-CSRF-Token':csrf},body:JSON.stringify({format,courtCount:courts,capacity,version})}).then(p=>{if(!controller.signal.aborted)setPreview(p);}).catch(e=>{if(!controller.signal.aborted)setError((e as Error).message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});},250);
  return()=>{clearTimeout(timer);controller.abort();};
 },[game.id,increasing,fill,invalid,format,courts,capacity,version,csrf]);
 const count=preview?.candidates?.filter(p=>p.willConfirm).length??0;
 return <form className="pt-form pt-game-settings" onSubmit={e=>{e.preventDefault();void onSave({title,notes,format,courtCount:courts,capacity,fillWaiting:increasing&&fill,version});}}>
  <label>Game title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} required/></label>
  <div className="pt-game-settings-fields">
   <label>Game format<SiteSelect value={format} onValueChange={v=>{const next=v as Game['format'];setFormat(next);setCapacity(c=>Math.max(c,courts*(next==='singles'?2:4)));}}><option value="singles">Singles</option><option value="doubles">Doubles</option></SiteSelect></label>
   <label>Courts planned<input type="number" min={1} max={16} step={1} value={courts} onChange={e=>{const n=Number(e.target.value);setCourts(n);if(Number.isInteger(n))setCapacity(c=>Math.max(c,n*(format==='singles'?2:4)));}} required/></label>
   <label className="pt-game-settings-capacity">Total player capacity<input type="number" min={Math.max(minimum,game.playerCount)} max={128} step={1} value={capacity} onChange={e=>setCapacity(Number(e.target.value))} required/><span className="pt-help">Includes approved guests. At least {minimum} places for the planned courts; confirmed players stay.</span></label>
  </div>
  {invalid&&<p className="pt-help" role="alert">Capacity must cover the planned court places and confirmed players, up to 128.</p>}
  {increasing&&<div className="pt-capacity-fill"><label className="pt-check"><input type="checkbox" checked={fill} onChange={e=>setFill(e.target.checked)}/><span>Confirm waiting players automatically<small>Honors reserved offers, then fills from the waitlist and pending join requests in request order. Guest requests still need your approval.</small></span></label>
   {fill&&<p className="pt-help" role="status">{loading?'Checking waiting players...':error?error:preview?`Up to ${count} waiting ${count===1?'player':'players'} will be confirmed. The count can change as requests change.`:'No waiting-player preview yet.'}</p>}
  </div>}
  <label>Organizer notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000}/></label>
  <p className="pt-help">{game.seriesId?'These changes apply to this date only. ':''}Use schedule management to change the date or time. Court availability must still be checked.</p>
  <button className="pt-primary" disabled={busy||invalid||(increasing&&fill&&(loading||!preview||!!error))} type="submit">Save game changes</button>
 </form>;
}
