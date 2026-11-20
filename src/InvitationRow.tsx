import {useState} from 'react';
import {MoreHorizontal} from 'lucide-react';
import FocusedConfirmation from './FocusedConfirmation';
type Props={label:string;context:string;createdAt?:number;expiresAt:number|null;revokedAt:number|null;busy:boolean;onRevoke:()=>Promise<void>};
export default function InvitationRow(p:Props){
 const [confirm,setConfirm]=useState(false),[menuOpen,setMenuOpen]=useState(false);const expired=p.expiresAt!==null&&p.expiresAt<=Date.now();
 const status=p.revokedAt?'Revoked':expired?'Expired':'Active';
 return <li className="pt-invitation-row"><div className="pt-invitation-info"><strong>{p.label}</strong><span>{p.context}</span><small>{p.createdAt?'Created '+new Date(p.createdAt).toLocaleString()+' ? ':''}{p.revokedAt?'Revoked '+new Date(p.revokedAt).toLocaleString():p.expiresAt?'Expires '+new Date(p.expiresAt).toLocaleString():'No expiry'}</small><span className="pt-invitation-status">{status}</span></div>{!p.revokedAt&&!expired&&<div className="pt-invitation-menu"><button type="button" className="pt-invitation-menu-trigger" aria-label={'Actions for '+p.label} aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}><MoreHorizontal size={18}/></button>{menuOpen&&<button type="button" className="pt-secondary" disabled={p.busy} onClick={()=>{setMenuOpen(false);setConfirm(true);}}>Revoke invitation</button>}</div>}{confirm&&<FocusedConfirmation><p>Revoke {p.label} for {p.context}? Existing approved membership or participation will remain.</p><button type="button" className="pt-primary" disabled={p.busy} onClick={()=>void p.onRevoke().then(()=>setConfirm(false))}>Revoke invitation</button><button type="button" className="pt-secondary" disabled={p.busy} onClick={()=>setConfirm(false)}>Keep invitation</button></FocusedConfirmation>}</li>;
}
