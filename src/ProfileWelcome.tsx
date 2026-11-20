import {useEffect,useRef,useState} from 'react';
import PhotoUpload from './PhotoUpload';
import {useTheme} from './useTheme';
import './play-together.css';

type Profile={id:string;displayName:string;bio:string;generalLocation:string;skillLevel:string;discoverable:boolean};
export default function ProfileWelcome(){
 const {dark}=useTheme();
 const [account,setAccount]=useState<{player:Profile;csrfToken:string}|null>(null);
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const controller=new AbortController();void fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store',signal:controller.signal}).then(async r=>r.ok?r.json():null).then(a=>{if(controller.signal.aborted||!a?.player||a.player.displayName?.trim()||!a.csrfToken)return;try{if(sessionStorage.getItem('opencourts-profile-later')===a.player.id)return;}catch{/* Storage is optional. */}setAccount(a);}).catch(()=>{});return()=>controller.abort();},[]);
 useEffect(()=>{if(!account)return;const previous=document.activeElement;const node=dialog.current;node?.showModal();return()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};},[account]);
 function dismiss(){try{sessionStorage.setItem('opencourts-profile-later',account!.player.id);}catch{/* Storage is optional. */}setAccount(null);}
 async function save(e:React.FormEvent){e.preventDefault();if(!account||!name.trim()||busy)return;setBusy(true);setError('');try{const p=account.player;const r=await fetch('/api/auth/me',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':account.csrfToken},body:JSON.stringify({displayName:name.trim(),bio:p.bio??'',generalLocation:p.generalLocation??'',skillLevel:p.skillLevel??'unspecified',discoverable:p.discoverable??false})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Your name could not be saved. Try again.');window.dispatchEvent(new Event('opencourts-profile-changed'));window.dispatchEvent(new Event('focus'));setAccount(null);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!account)return null;
 return <div className={dark?'app dark':'app'} style={{display:'contents'}}><dialog ref={dialog} className="pt-confirmation pt-welcome" aria-labelledby="welcome-title" aria-describedby="welcome-description" onCancel={e=>{e.preventDefault();if(!busy)dismiss();}}><h2 id="welcome-title">What should we call you?</h2><p id="welcome-description">Choose a display name other players can see when you join games or groups.</p><form className="pt-form" onSubmit={save}><label>Display name<input autoFocus required maxLength={60} autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label><PhotoUpload kind="player" id={account.player.id} csrf={account.csrfToken}/>{error&&<p role="alert" className="pt-error">{error}</p>}<div className="pt-welcome-actions"><button className="pt-primary" disabled={busy||!name.trim()}>{busy?'Saving...':'Save and continue'}</button><button type="button" className="pt-secondary" disabled={busy} onClick={dismiss}>Browse for now</button></div><p className="pt-help">You can add a photo later in Account. A display name is required to take part in games and groups.</p></form></dialog></div>;
}
