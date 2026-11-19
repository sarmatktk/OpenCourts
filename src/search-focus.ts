/** Focus the editable search input, not just its surrounding panel. */
export function focusSearch(){
 const container=document.getElementById('search');
 const input=container?.querySelector<HTMLInputElement>('input[type="search"],input[role="combobox"]');
 if(!input||input.disabled)return false;
 container?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 // Keep focus synchronous with a tap so mobile browsers can open their keyboard.
 input.focus({preventScroll:true});
 input.setSelectionRange(input.value.length,input.value.length);
 return document.activeElement===input;
}
