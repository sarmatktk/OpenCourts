import {useEffect,useState} from 'react';
import {gameApi,type Game} from './game-api';
import SiteSelect from './SiteSelect';

type Preview={confirmedPlaces:number;reservedPlaces:number;candidates:{playerId:string;displayName:string;willConfirm:boolean|number}[];demoted?:{playerId:string;displayName:string;partySize:number}[]};
export default function GameSettings({game,version,csrf,busy,onSave}:{game:Game;version:number;csrf:string;busy:boolean;onSave:(body:Record<string,unknown>)=>Promise<void>}){
 const [title,setTitle]=useState(game.title),[notes,setNotes]=useState(game.notes??''),[format,setFormat]=useState(game.format),[courts,setCourts]=useState(game.courtCount??1),[capacity,setCapacity]=useState(game.capacity);
 const [preview,setPreview]=useState<Preview|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setTitle(game.title);setNotes(game.notes??'');setFormat(game.format);setCourts(game.courtCount??1);setCapacity(game.capacity);},[game.id,version,game.title,game.notes,game.format,game.courtCount,game.capacity]);
 const minimum=courts*(format==='singles'?2:4),increasing=capacity>game.capacity,capacityChanged=capacity!==game.capacity;
 const invalid=!Number.isInteger(capacity)||capacity<minimum||capacity>128||!Number.isInteger(courts)||courts<1||courts>16;
 useEffect(()=>{
  setPreview(null);setError('');if(!capacityChanged||invalid){setLoading(false);return;}
  const controller=new AbortController();setLoading(true);
  const timer=setTimeout(()=>{void gameApi<Preview>('games/'+game.id+'/edit-preview',{method:'POST',signal:controller.signal,headers:{'X-CSRF-Token':csrf},body:JSON.stringify({format,courtCount:courts,capacity,version})}).then(p=>{if(!controller.signal.aborted)setPreview(p);}).catch(e=>{if(!controller.signal.aborted)setError((e as Error).message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});},250);
  return()=>{clearTimeout(timer);controller.abort();};
 },[game.id,capacityChanged,invalid,format,courts,capacity,version,csrf]);
 const count=preview?.candidates?.filter(p=>p.willConfirm).length??0;
 return <form className="pt-form pt-game-settings" onSubmit={e=>{e.preventDefault();void onSave({title,notes,format,courtCount:courts,capacity,version});}}>
  <label>Game title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} required/></label>
  <div className="pt-game-settings-fields">
   <label>Game format<SiteSelect value={format} onValueChange={v=>{const next=v as Game['format'],oldMinimum=courts*(format==='singles'?2:4);setFormat(next);setCapacity(c=>c===oldMinimum?courts*(next==='singles'?2:4):c);}}><option value="singles">Singles</option><option value="doubles">Doubles</option></SiteSelect></label>
   <label>Courts planned<input type="number" min={1} max={16} step={1} value={courts} onChange={e=>{const n=Number(e.target.value),oldMinimum=courts*(format==='singles'?2:4);setCourts(n);if(Number.isInteger(n)&&capacity===oldMinimum)setCapacity(n*(format==='singles'?2:4));}} required/></label>
   <label className="pt-game-settings-capacity">Total player capacity<input type="number" min={minimum} max={128} step={1} value={capacity} onChange={e=>setCapacity(Number(e.target.value))} required/><span className="pt-help">Includes approved guests. At least {minimum} places for the planned courts. If needed, the most recently joined players move to waiting.</span></label>
  </div>
  {invalid&&<p className="pt-help" role="alert">Capacity must cover the planned court places, up to 128.</p>}
  {capacityChanged&&<div className="pt-capacity-fill">
   {increasing&&game.visibility==='group'&&<p className="pt-help">Eligible active group members are confirmed from the waitlist in request-time order. Pending join requests are not treated as waitlist entries.</p>}
   {increasing&&game.visibility!=='group'&&<p className="pt-help">Pending join requests still need your approval. Capacity changes never approve them automatically.</p>}
   {loading?<p className="pt-help" role="status">Reviewing capacity changes...</p>:error?<p className="pt-help" role="alert">{error}</p>:preview&&<div className="pt-help" role="status">
    {preview.demoted?.length? <p>The most recently joined player(s) will move out of confirmed places: {preview.demoted.map(p=>p.displayName).join(', ')}. They will be notified. Group players enter the waitlist; standalone players return to pending host approval.</p>:null}
    {increasing&&game.visibility==='group'?<p>Up to {count} waitlisted group {count===1?'member':'members'} will be automatically confirmed. The count can change before saving.</p>:null}
    {!preview.demoted?.length&&!count&&capacity<game.capacity?<p>No confirmed player needs to move based on the current attendance.</p>:null}
   </div>}
  </div>}
  <label>Organizer notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000}/></label>
  <p className="pt-help">{game.seriesId?'These changes apply to this date only. ':''}Use schedule management to change the date or time. Court availability must still be checked.</p>
  <button className="pt-primary" disabled={busy||invalid||(capacityChanged&&(loading||!preview||!!error))} type="submit">Save game changes</button>
 </form>;
}
