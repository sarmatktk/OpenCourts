import {useLayoutEffect,useRef,type ReactNode} from 'react';

/** Native top-layer dialog: background is inert; nested report dialogs remain usable. */
export default function ChatDialog({id,label,onClose,children}:{id:string;label:string;onClose:()=>void;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null);
 useLayoutEffect(()=>{
  const node=dialog.current!;
  const active=document.activeElement;const trigger=active instanceof HTMLElement&&active!==document.body?active:document.getElementById('chat')?.querySelector<HTMLElement>('button')??null;
  const {scrollX,scrollY}=window,overflow=document.body.style.overflow;
  node.showModal();
  node.querySelector<HTMLElement>('[data-chat-initial-focus]')?.focus({preventScroll:true});
  document.body.style.overflow='hidden';
  const viewport=window.visualViewport;
  const resize=()=>{const height=viewport?.height??window.innerHeight;node.dataset.keyboard=String(height<window.innerHeight*.75);node.style.setProperty('--chat-viewport-height',height+'px');node.style.setProperty('--chat-viewport-top',(viewport?.offsetTop??0)+'px');};
  resize();viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);window.addEventListener('resize',resize);
  return()=>{viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);window.removeEventListener('resize',resize);node.close();document.body.style.overflow=overflow;trigger?.isConnected&&trigger.focus({preventScroll:true});window.scrollTo({left:scrollX,top:scrollY,behavior:'instant'});};
 },[]);
 return <dialog ref={dialog} id={id} aria-label={label} className="pt-chat-dialog" onCancel={e=>{if(e.target!==e.currentTarget)return;e.preventDefault();onClose();}} onKeyDown={e=>{
  const node=dialog.current;if(e.key!=='Tab'||!node||(e.target as Element).closest('dialog')!==node)return;
  const controls=[...node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(n=>n.getClientRects().length>0&&n.closest('dialog')===node);
  const first=controls[0],last=controls.at(-1);if(!first)return;
  if(e.shiftKey&&(document.activeElement===first||document.activeElement===node.querySelector('[data-chat-initial-focus]'))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }}>{children}</dialog>;
}
