import {useEffect,useRef,type ReactNode} from 'react';

/** Top-layer confirmation keeps actions reachable above navigation on every screen. */
export default function FocusedConfirmation({children}:{children:ReactNode}){
 const panel=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const trigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const node=panel.current;
  node?.showModal();
  const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{node?.close();document.body.style.overflow=oldOverflow;if(trigger?.isConnected)trigger.focus({preventScroll:true});};
 },[]);
 return <dialog ref={panel} className="pt-message pt-confirmation" aria-label="Confirm action" onCancel={e=>{e.preventDefault();const cancel=Array.from(panel.current?.querySelectorAll('button')??[]).find(b=>/keep|cancel|discard/i.test(b.textContent??''));if(cancel&&!cancel.disabled)cancel.click();}}>{children}</dialog>;
}
