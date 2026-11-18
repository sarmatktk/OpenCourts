export interface Game {
  isHost?:boolean;visibility?:string;groupId?:string|null;id:string;title:string;court:{id:string;name:string;lat:number;lon:number;access:'public'|'unknown'};
  startsAt:string;endsAt:string;timeZone:string;format:'singles'|'doubles';capacity:number;
  joinPolicy?:'instant'|'approval';skillPreference:string;status:'scheduled'|'cancelled';organizer:{displayName:string};playerCount:number;notes?:string;distanceMiles?:number;
}
export interface GameCourt {id:string;name:string;lat:number;lon:number;access:'public'|'unknown';distanceMiles:number;selectionToken:string}
export interface GameAccount {player:{id:string;displayName:string}|null;csrfToken:string|null}
export async function gameApi<T>(path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(`/api/${path}`,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error??'Games are unavailable right now. Please try again.');
  return data;
}
export function gameDate(game:Game){return new Intl.DateTimeFormat('en-US',{timeZone:game.timeZone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(game.startsAt));}
