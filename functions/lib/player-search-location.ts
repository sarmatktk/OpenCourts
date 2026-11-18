import {AuthError} from './auth';
import {onRequestGet as geocode,cityStateQuery} from '../api/geocode';
import {normalizeLocationQuery} from '../../src/zip-query';
export async function playerSearchLocation(query:string,origin:string){
 const q=query.trim(),normalized=normalizeLocationQuery(q);
 if(normalized.error)throw new AuthError(400,normalized.error);
 if(!normalized.zipOnly){const cityState=cityStateQuery(q);return {terms:Array.from(new Set([q,...(cityState?[cityState.city,cityState.city.replace(/\s+(county|borough|parish|municipality)$/i,'')]:[])])),resolvedLocation:null as string|null};}
 const zip=normalized.zip!;
 const response=await geocode({request:new Request(origin+'/api/geocode?q='+encodeURIComponent(zip)),waitUntil:(p:Promise<unknown>)=>{void p.catch(()=>{});}} as Parameters<typeof geocode>[0]);
 if(!response.ok)throw new AuthError(response.status===429?429:503,'ZIP lookup is unavailable right now. Try searching by city.');
 const data=await response.json() as {result?:{display_name?:string;postcode?:string;country_code?:string}|null};const result=data.result;
 if(!result?.display_name||result.postcode!==zip||result.country_code!=='us')throw new AuthError(400,'That ZIP code could not be resolved. Try a city and state.');
 // Use general locality/county names only; never geocode a player's private address.
 const parts=result.display_name.split(',').map(p=>p.trim());const localityParts=parts.slice(0,-2).filter(p=>p&&!/^\d/.test(p));
 const names=localityParts.map(p=>p.replace(/\s+(County|Borough|Parish|Municipality)$/i,'').trim()).filter(p=>p.length>=2).slice(0,5);
 if(!names.length)throw new AuthError(400,'This ZIP has no usable city/area label. Try searching by city.');
 return {terms:Array.from(new Set([zip,...names])),resolvedLocation:zip+' � '+localityParts.join(', ')};
}
