import { AuthError } from './auth';

function wallTime(epoch: number, timeZone: string) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' })
    .formatToParts(new Date(epoch)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
}
export function gameStart(local: unknown, zone: unknown, now=Date.now()) {
  if (typeof local!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || typeof zone!=='string' || zone.length>80) throw new AuthError(400,'Choose a valid start time and time zone.');
  let timeZone: string;
  try { timeZone=new Intl.DateTimeFormat('en-US',{timeZone:zone}).resolvedOptions().timeZone; }
  catch { throw new AuthError(400,'Choose a valid IANA time zone, such as America/New_York.'); }
  const naive=Date.parse(`${local}:00Z`);
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0,16)!==local) throw new AuthError(400,'Choose a valid calendar date and time.');
  const offsets=new Set<number>();
  for(let h=-36;h<=36;h+=6){
    const epoch=naive+h*3600_000; const p=wallTime(epoch,timeZone);
    offsets.add(Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`)-epoch);
  }
  const candidates=[...offsets].map(offset=>naive-offset).filter(epoch=>{
    const p=wallTime(epoch,timeZone); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`===local;
  });
  if(!candidates.length) throw new AuthError(400,'This local time does not exist because the clocks change. Choose another time.');
  if(candidates.length!==1) throw new AuthError(400,'This local time occurs twice because the clocks change. Choose an unambiguous time.');
  if(candidates[0]<=now || candidates[0]>now+180*86400_000) throw new AuthError(400,'Games must start in the future, within the next 180 days.');
  return {startsAt:candidates[0],timeZone};
}
