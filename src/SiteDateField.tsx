import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CalendarDays,ChevronLeft,ChevronRight,X} from 'lucide-react';
type Props={value:string;onChange:(value:string)=>void;required?:boolean;withTime?:boolean;futureOnly?:boolean;timeZone?:string};
function wallMinute(epoch:number,timeZone?:string){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(epoch).map(p=>[p.type,p.value]));
 return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
const pad=(n:number)=>String(n).padStart(2,'0');
export default function SiteDateField({value,onChange,required,withTime=false,futureOnly=false,timeZone}:Props){
 const wrapper=useRef<HTMLSpanElement>(null),[host,setHost]=useState<Element|null>(null);
 useLayoutEffect(()=>{setHost(wrapper.current?.closest('.app')??document.body);},[]);
 const input=useRef<HTMLInputElement>(null),[clock,setClock]=useState(Date.now);
 useEffect(()=>{if(!futureOnly)return;const timer=setInterval(()=>setClock(Date.now()),15000);return()=>clearInterval(timer);},[futureOnly]);
 const minimum=futureOnly?wallMinute(Math.floor(clock/60000)*60000+60000,timeZone):'',minDate=minimum.slice(0,10);
 useLayoutEffect(()=>{input.current?.setCustomValidity(futureOnly&&value&&value<minimum?'Choose a future start date and time in the selected time zone.':'');},[futureOnly,value,minimum]);
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [month,setMonth]=useState(()=>new Date()),[draft,setDraft]=useState('');
 const [hour,setHour]=useState('10'),[minute,setMinute]=useState('00'),[period,setPeriod]=useState<'AM'|'PM'>('AM');
 const validTime=/^\d{1,2}$/.test(hour)&&Number(hour)>=1&&Number(hour)<=12&&/^\d{1,2}$/.test(minute)&&Number(minute)<=59;
 const time=validTime?pad(Number(hour)%12+(period==='PM'?12:0))+':'+pad(Number(minute)):'';
 function setTime(next:string){const [h,m]=next.split(':');setHour(String(Number(h)%12||12));setMinute(m);setPeriod(Number(h)<12?'AM':'PM');}
 function open(){const now=Date.now();setClock(now);const min=futureOnly?wallMinute(Math.floor(now/60000)*60000+60000,timeZone):'';const candidate=value&&(!min||value>=min)?value:min;const date=candidate.split('T')[0]||new Date().toLocaleDateString('en-CA');const d=new Date(date+'T12:00:00');setMonth(Number.isNaN(d.getTime())?new Date():d);setDraft(candidate.split('T')[0]);setTime(candidate.split('T')[1]||'10:00');dialog.current?.showModal();}
 function close(){dialog.current?.close();trigger.current?.focus();}
 function select(day:number){const date=`${month.getFullYear()}-${pad(month.getMonth()+1)}-${pad(day)}`;if(futureOnly&&date<minDate)return;setDraft(date);if(futureOnly&&date===minDate&&time<minimum.slice(11))setTime(minimum.slice(11));if(!withTime){onChange(date);close();}}
 const year=month.getFullYear(),m=month.getMonth(),offset=new Date(year,m,1).getDay(),days=new Date(year,m+1,0).getDate();
 return <span ref={wrapper} className="oc-date-field"><input ref={input} aria-label={withTime?'Start date and time':'Date'} type="text" required={required} value={value} placeholder={withTime?'YYYY-MM-DDTHH:mm':'YYYY-MM-DD'} pattern={withTime?'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}':'[0-9]{4}-[0-9]{2}-[0-9]{2}'} onChange={e=>onChange(e.target.value.replace(' ','T'))}/><button ref={trigger} type="button" aria-label={withTime?'Choose date and time':'Choose date'} onClick={open}><CalendarDays size={18} aria-hidden="true"/></button>
 {host&&createPortal(<dialog className="oc-calendar" ref={dialog} aria-label={withTime?'Choose game date and time':'Choose game date'} onClick={e=>{if(e.target===e.currentTarget)close();}} onClose={()=>trigger.current?.focus()}>
 <div className="oc-calendar-title"><strong>{withTime?'Date and time':'Date'}</strong><button type="button" aria-label="Close calendar" onClick={close}><X size={18}/></button></div>
 <div className="oc-calendar-month"><button type="button" aria-label="Previous month" disabled={futureOnly&&`${year}-${pad(m+1)}`<=minDate.slice(0,7)} onClick={()=>setMonth(new Date(year,m-1,1))}><ChevronLeft size={18}/></button><strong aria-live="polite">{month.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong><button type="button" aria-label="Next month" onClick={()=>setMonth(new Date(year,m+1,1))}><ChevronRight size={18}/></button></div>
 <div className="oc-calendar-grid">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><span key={d}>{d}</span>)}{Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>{const d=i+1,date=`${year}-${pad(m+1)}-${pad(d)}`;return <button type="button" key={d} aria-label={new Date(year,m,d).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})} aria-pressed={draft===date} disabled={futureOnly&&date<minDate} onClick={()=>select(d)}>{d}</button>;})}</div>
 {withTime&&<fieldset className="oc-calendar-time-fields"><legend>Time</legend><div className="oc-calendar-time-inputs"><label>Hour<input aria-label="Hour" type="text" inputMode="numeric" autoComplete="off" maxLength={2} value={hour} aria-invalid={!/^\d{1,2}$/.test(hour)||Number(hour)<1||Number(hour)>12} onChange={e=>setHour(e.target.value.replace(/\D/g,''))}/></label><span aria-hidden="true">:</span><label>Minute<input aria-label="Minute" type="text" inputMode="numeric" autoComplete="off" maxLength={2} value={minute} aria-invalid={!/^\d{1,2}$/.test(minute)||Number(minute)>59} onChange={e=>setMinute(e.target.value.replace(/\D/g,''))} onBlur={()=>{if(/^\d{1,2}$/.test(minute)&&Number(minute)<=59)setMinute(pad(Number(minute)));}}/></label><div role="group" aria-label="AM or PM" className="oc-calendar-period">{(['AM','PM'] as const).map(p=><button key={p} type="button" aria-pressed={period===p} onClick={()=>setPeriod(p)}>{p}</button>)}</div></div><p className="oc-calendar-help">Enter an hour from 1 to 12 and minutes from 00 to 59.</p></fieldset>}
 {withTime&&!validTime&&<p className="oc-calendar-help" role="status">Enter a valid hour and minute to apply this time.</p>}
 {futureOnly&&<p className="oc-calendar-help">Only future start times are available in {timeZone||'your device time zone'}.</p>}
 <div className="oc-calendar-actions"><button type="button" className="pt-secondary" onClick={()=>{onChange('');close();}}>Clear</button>{withTime&&<button type="button" className="pt-primary" disabled={!draft||!validTime||(futureOnly&&draft+'T'+time<minimum)} onClick={()=>{if(!validTime)return;if(futureOnly&&draft+'T'+time<wallMinute(Math.floor(Date.now()/60000)*60000+60000,timeZone)){setClock(Date.now());return;}onChange(draft+'T'+time);close();}}>Apply date and time</button>}</div>
 </dialog>,host)}</span>;
}
