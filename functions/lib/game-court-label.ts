import type { Court } from '../../src/types';
/** Prefer mapped court names, then associated venues, then approximate streets. */
export function gameCourtLabel(c:Pick<Court,'name'|'contextName'|'address'>):string {
 const generic=/^(?:tennis\s+)?courts?(?:\s*#?\s*\d+)?$/i.test(c.name.trim());
 if(!generic)return [c.name,c.address].filter(Boolean).join(' - ').slice(0,200);
 const venue=c.contextName?.replace(/^At\s+/i,'').trim();
 if(venue)return venue.slice(0,200);
 if(c.address?.startsWith('At '))return c.address.slice(3,203);
 return (c.address?'Tennis courts - '+c.address:c.name).slice(0,200);
}
