import {useEffect,useRef,type ReactNode} from 'react';

/** Inline confirmation: announce the choice and bring it into keyboard/touch reach. */
export default function FocusedConfirmation({children}:{children:ReactNode}){
 const panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const trigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const node=panel.current;
  node?.focus({preventScroll:true});
  node?.scrollIntoView({block:'center',behavior:'instant'});
  return()=>{if(trigger?.isConnected&&(node?.contains(document.activeElement)||document.activeElement===document.body))trigger.focus({preventScroll:true});};
 },[]);
 return <div ref={panel} className="pt-message pt-confirmation" role="alert" aria-label="Confirm action" tabIndex={-1}>{children}</div>;
}
