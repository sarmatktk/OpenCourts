import {useId,useLayoutEffect,useRef,useState,type SelectHTMLAttributes} from 'react';
import {createPortal} from 'react-dom';
import {Check} from 'lucide-react';

type Props=Omit<SelectHTMLAttributes<HTMLSelectElement>,'onChange'> & {onValueChange?:(value:string)=>void};
type Item={value:string;label:string;disabled:boolean};
export default function SiteSelect({onValueChange,...props}:Props){
 const trigger=useRef<HTMLButtonElement>(null);
 const field=useRef<HTMLSelectElement>(null),menu=useRef<HTMLDivElement>(null),id=useId();
 const [open,setOpen]=useState(false),[items,setItems]=useState<Item[]>([]),[active,setActive]=useState(0),[position,setPosition]=useState({left:12,top:12,width:200,maxHeight:280});
 const [selectedLabel,setSelectedLabel]=useState('');
 useLayoutEffect(()=>{const select=field.current;if(select)setSelectedLabel(select.selectedOptions[0]?.text??'');});
 const [label,setLabel]=useState<string|undefined>(props['aria-label']);
 useLayoutEffect(()=>{setLabel((props['aria-label']??field.current?.labels?.[0]?.firstChild?.textContent?.trim())||undefined);},[props['aria-label']]);
 const typed=useRef({text:'',time:0});
 function show(){if(props.disabled||!field.current)return;const all=Array.from(field.current.options,o=>({value:o.value,label:o.text,disabled:o.disabled}));setItems(all);setActive(Math.max(0,all.findIndex(o=>o.value===field.current!.value)));setOpen(true);trigger.current?.focus();}
 function choose(index:number){const item=items[index];if(!item||item.disabled||!field.current)return;field.current.value=item.value;setSelectedLabel(item.label);onValueChange?.(item.value);setOpen(false);trigger.current?.focus();}
 useLayoutEffect(()=>{
 if(!open)return;
 function place(){if(!field.current)return;const b=trigger.current!.getBoundingClientRect(),v=window.visualViewport,left=v?.offsetLeft??0,top=v?.offsetTop??0,w=v?.width??innerWidth,h=v?.height??innerHeight;const below=top+h-b.bottom-12,above=b.top-top-12,up=below<180&&above>below;const maxHeight=Math.max(80,Math.min(280,up?above:below));const height=Math.min(maxHeight,menu.current?.scrollHeight??280);setPosition({left:Math.max(left+12,Math.min(b.left,left+w-Math.min(b.width,w-24)-12)),top:up?b.top-height-5:b.bottom+5,width:Math.min(b.width,w-24),maxHeight});}
 function outside(e:PointerEvent){if(!trigger.current?.contains(e.target as Node)&&!menu.current?.contains(e.target as Node))setOpen(false);}
 place();document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);window.visualViewport?.addEventListener('resize',place);
 return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);window.visualViewport?.removeEventListener('resize',place);};
 },[open]);
 useLayoutEffect(()=>{if(open)menu.current?.querySelector('[data-active="true"]')?.scrollIntoView({block:'nearest'});},[active,open]);
 return <span className="oc-select"><select {...props} ref={field} hidden tabIndex={-1} aria-hidden="true" data-site-select="true" onChange={e=>onValueChange?.(e.currentTarget.value)} onInvalid={e=>{e.preventDefault();trigger.current?.focus();}}/><button type="button" ref={trigger} className="oc-select-trigger" role="combobox" aria-label={label} aria-haspopup="listbox" aria-required={props.required} disabled={props.disabled} aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined}
 onClick={()=>{open?setOpen(false):show();}}
 onBlur={e=>{if(e.relatedTarget&&!menu.current?.contains(e.relatedTarget as Node))setOpen(false);}}
 onKeyDown={e=>{
 if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){e.preventDefault();if(!open){show();return;}if(e.key==='Enter'||e.key===' '){choose(active);return;}const step=e.key==='ArrowUp'?-1:1;let n=e.key==='Home'?0:e.key==='End'?items.length-1:Math.max(0,Math.min(items.length-1,active+step));while(items[n]?.disabled&&n>=0&&n<items.length)n+=step;if(n>=0&&n<items.length)setActive(n);}
 else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false);}else if(e.key==='Tab')setOpen(false);
 else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){e.preventDefault();if(!open){show();const n=Array.from(field.current?.options??[]).findIndex(o=>!o.disabled&&o.text.toLowerCase().startsWith(e.key.toLowerCase()));if(n>=0)setActive(n);typed.current={text:e.key.toLowerCase(),time:Date.now()};return;}const now=Date.now();typed.current={text:(now-typed.current.time<700?typed.current.text:'')+e.key.toLowerCase(),time:now};const n=items.findIndex(o=>!o.disabled&&o.label.toLowerCase().startsWith(typed.current.text));if(n>=0)setActive(n);}
 }}>{selectedLabel}</button>{open&&createPortal(<div ref={menu} id={id} role="listbox" aria-label={field.current?.getAttribute('aria-label')??field.current?.labels?.[0]?.firstChild?.textContent?.trim()??'Options'} className="oc-options" style={{position:'fixed',...position}}>{items.map((item,i)=><div id={`${id}-${i}`} role="option" aria-selected={field.current?.value===item.value} aria-disabled={item.disabled} data-active={i===active} className="oc-option" key={item.value} onPointerDown={e=>e.preventDefault()} onClick={e=>{e.preventDefault();e.stopPropagation();choose(i);}}><span>{item.label}</span>{field.current?.value===item.value&&<Check size={16} aria-hidden="true"/>}</div>)}</div>,field.current?.closest('dialog')??field.current?.closest('.app')??document.body)}</span>;
}
