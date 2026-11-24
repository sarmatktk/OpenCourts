import {gameChat} from './game-chat';
import {gameSeries} from './game-series';
import {gameSharing,canViewUnlisted,unlistedAccessSql} from './game-sharing';
import {groupGameAccess,groupEventViewSql} from './group-game-access';
import { participation } from './game-participation';
import { SignJWT, jwtVerify } from 'jose';
import { AuthError, assertEnvironment, checkCsrf, checkOrigin, hashToken, json, readJson, requireSession, session, type AuthEnv, type AuthDatabase } from './auth';
import { onRequestGet as courtsHandler } from '../api/courts';
import { findCourtsInCatalog } from './court-catalog';
import { queryOverpass } from './overpass';
import { normalizeCourt, enrichNearbyCourtDetails, groupCourtsByVenue } from '../../src/services';
import { gameCourtLabel } from './game-court-label';
import { gameStart } from './game-time';

export type GamesEnv = AuthEnv & { GEOAPIFY_API_KEY?: string };
type Court = { id:string; name:string; lat:number; lon:number; access:'public'|'unknown'; courtCount?:number };
type GameRow = { organizer_id:string;visibility:string;group_id:string|null;group_visibility:string|null; id:string; title:string; court_id:string; court_name:string; court_lat:number; court_lon:number; court_access:string; starts_at:number; ends_at:number; time_zone:string; format:string; series_id:string|null;series_week:number|null;series_weeks:number|null;court_count:number; capacity:number; skill_preference:string; status:string; join_policy:string; notes:string; organizer_name:string; organizer_playing:number; player_count:number };
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(message:string):never=>{throw new AuthError(400,message);};
function text(value:unknown,max:number,label:string,required=false){
  if(typeof value!=='string') return fail(`Invalid ${label}.`);
  const result=value.trim();
  if((required&&!result)||result.length>max||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(result)) return fail(`Invalid ${label}.`);
  return result;
}
function point(params:URLSearchParams){
  const lat=params.get('lat'),lon=params.get('lon');
  if(lat===null&&lon===null)return null;
  if(!lat?.trim()||!lon?.trim()||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon))||Math.abs(Number(lat))>90||Math.abs(Number(lon))>180) return fail('Choose a valid search location.');
  return {lat:Number(lat),lon:Number(lon)};
}
export function milesBetween(a:{lat:number;lon:number},b:{lat:number;lon:number}){
  const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;
  const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
  return 3958.8*2*Math.atan2(Math.sqrt(Math.min(1,h)),Math.sqrt(Math.max(0,1-h)));
}
async function signingKey(env:GamesEnv,origin:string){
  if(origin.startsWith('https:')&&!env.AUTH_RATE_LIMIT_SECRET)throw new AuthError(503,'Court selection is temporarily unavailable.');
  return new TextEncoder().encode(await hashToken(`court-selection-v1:${env.AUTH_RATE_LIMIT_SECRET??'localhost-development-only'}`));
}
export async function courtSelectionToken(court:Court,playerId:string,env:GamesEnv,origin:string){
  return new SignJWT({court,kind:'court-selection'}).setProtectedHeader({alg:'HS256'}).setIssuer(origin).setAudience('opencourts-game-court').setSubject(playerId).setIssuedAt().setExpirationTime('30m').sign(await signingKey(env,origin));
}
async function readCourtToken(token:unknown,playerId:string,env:GamesEnv,origin:string):Promise<Court>{
  if(typeof token!=='string'||token.length>4096) return fail('Select an OpenCourts location.');
  try{
    const {payload}=await jwtVerify(token,await signingKey(env,origin),{algorithms:['HS256'],issuer:origin,audience:'opencourts-game-court',subject:playerId,requiredClaims:['exp','iat']});
    const c=payload.court as Court;
    if(payload.kind!=='court-selection'||!c||typeof c.id!=='string'||!c.id||typeof c.name!=='string'||!c.name||!Number.isFinite(c.lat)||!Number.isFinite(c.lon)||Math.abs(c.lat)>90||Math.abs(c.lon)>180||!['public','unknown'].includes(c.access))throw new Error();
    return c;
  }catch{return fail('Your court selection expired or could not be verified. Search for the court again.');}
}
async function courtElements(url:URL,env:GamesEnv):Promise<unknown[]>{
  const request=new Request(`${url.origin}/api/courts?${url.searchParams}`);
  const centerPoint=point(url.searchParams)!;
  const country=url.searchParams.get('country')?.toLowerCase();
  const international=Boolean(country&&country!=='us');
  const dlat=.135,dlon=dlat/Math.max(.2,Math.cos(centerPoint.lat*Math.PI/180));
  // Read our isolated catalog first so recently seeded context is not masked by
  // a cached raw-map response. Never contact the production catalog.
  // International searches must use the same country-aware source and provider
  // fallback as the public Courts search, never the U.S.-oriented D1 shortcut.
  const catalog=!international&&env.COURTS_DB?await findCourtsInCatalog(env.COURTS_DB,{south:centerPoint.lat-dlat,north:centerPoint.lat+dlat,west:centerPoint.lon-dlon,east:centerPoint.lon+dlon}).catch(()=>[]):[];
  const response=catalog.length?Response.json({elements:catalog}):await courtsHandler({request,env,waitUntil(promise:Promise<unknown>){void promise.catch(()=>{});}} as Parameters<typeof courtsHandler>[0]);
  if(!response.ok)throw new AuthError(503,'Court search is unavailable. Try again shortly.');
  const body=await response.json() as {elements?:unknown[]};
  const elements=Array.isArray(body.elements)?body.elements:[];
  if(international)return elements;
  const center=point(url.searchParams)!;
  const candidates=elements.map(e=>normalizeCourt(e)).filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lon)&&c.access!=='restricted').sort((a,b)=>milesBetween(center,a)-milesBetween(center,b)).slice(0,40);
  const labels=new Map<string,string>();
  // A bounded coordinate-to-street lookup avoids downloading every named
  // feature around forty courts. Keep existing discovery geometry label rules.
  let enriched=candidates;
  try {
    const query='[out:json][timeout:10];('+candidates.map(c=>{const point=c.lat.toFixed(5)+','+c.lon.toFixed(5);return 'way(around:250,'+point+')["highway"]["name"];nwr(around:500,'+point+')["leisure"~"^(park|recreation_ground)$"]["name"];nwr(around:500,'+point+')["amenity"~"^(school|college|university)$"]["name"];';}).join('')+');out geom;';
    const virginia=center.lat>=36.5&&center.lat<=39.5&&center.lon>=-83.7&&center.lon<=-75.2;
    const providers=[...(virginia?['https://overpass.maprva.org/api/interpreter']:[]),'https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
    const data=await queryOverpass(providers,query,12000);
    enriched=enrichNearbyCourtDetails(candidates,data.elements??[],'');
  } catch(error) { console.warn('[Play Together] Coordinate street lookup unavailable',error instanceof Error?error.message:'Unknown failure'); }
  for(const c of enriched)labels.set(c.id,gameCourtLabel(c));
  return elements.map(value=>{const e=value as {type:string;id:string|number;tags?:Record<string,string>};const label=labels.get('osm-'+e.type+'-'+e.id);return label?{...e,tags:{...e.tags,name:label}}:e;});
}
async function selectCourts(request:Request,db:AuthDatabase,env:GamesEnv,origin:string,lookup:typeof courtElements){
  const player=requireSession(await session(request,db,origin));
  const url=new URL(request.url),center=point(url.searchParams);
  if(!center)return fail('Search for a city or use your location first.');
  const country=url.searchParams.get('country');
  if(country&&!/^[a-z]{2}$/.test(country))return fail('Invalid country.');
  // Forward only known court-search parameters, not arbitrary client query flags.
  const upstream=new URL('/api/courts',origin);upstream.searchParams.set('lat',String(center.lat));upstream.searchParams.set('lon',String(center.lon));if(country)upstream.searchParams.set('country',country);
  // Fail before expensive map-provider work if court proof signing is unavailable.
  await signingKey(env,origin);
  const raw=await lookup(upstream,env);
  const elements:unknown[]=[];const ids=new Set<string>();
  for(const value of raw){
    const e=value as {type?:string;id?:string|number;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>};
    const tags=e?.tags??{},lat=e?.lat??e?.center?.lat,lon=e?.lon??e?.center?.lon;
    if(!e||!['node','way','relation'].includes(e.type??'')||!['string','number'].includes(typeof e.id)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat!)>90||Math.abs(lon!)>180)continue;
    if(['private','members','member','customers','customer','permit','no','fee'].includes(tags.access)||tags.fee==='yes'||tags.private==='yes'||(tags.membership&&!['no','none','open'].includes(tags.membership)))continue;
    const id=`osm-${e.type}-${e.id}`;if(ids.has(id)||id.length>200)continue;ids.add(id);
    elements.push(value);
  }
  const venues=groupCourtsByVenue(elements.map(element=>normalizeCourt(element)).filter(court=>court.access!=='restricted'))
    .sort((a,b)=>milesBetween(center,a)-milesBetween(center,b)).slice(0,40);
  const signed=await Promise.all(venues.map(async venue=>{
    const court:Court={id:venue.id,name:venue.name.slice(0,200),lat:venue.lat,lon:venue.lon,
      access:venue.access==='public'?'public':'unknown',courtCount:Math.max(1,Math.min(128,venue.courts??1))};
    return {...court,distanceMiles:Math.round(milesBetween(center,court)*10)/10,selectionToken:await courtSelectionToken(court,player.id,env,origin)};
  }));
  return json({courts:signed});
}
const projection=`g.organizer_id,g.visibility,g.group_id,(SELECT visibility FROM tennis_groups gv WHERE gv.id=g.group_id) AS group_visibility,g.id,g.title,g.court_id,g.court_name,g.court_lat,g.court_lon,g.court_access,g.starts_at,g.ends_at,g.time_zone,g.format,g.series_id,g.series_week,g.series_weeks,g.court_count,COALESCE(g.event_capacity,g.capacity) AS capacity,g.skill_preference,g.status,g.join_policy,g.notes,p.display_name AS organizer_name,EXISTS(SELECT 1 FROM game_participants op WHERE op.game_id=g.id AND op.player_id=g.organizer_id) AS organizer_playing,(SELECT COALESCE(SUM(1+gp.guest_count),0) FROM game_participants gp WHERE gp.game_id=g.id) AS player_count`;
function gameDto(row:GameRow,detail=false,includeOrganizerId=false){
  return {visibility:row.visibility,groupId:row.group_id,groupVisibility:row.group_visibility,id:row.id,title:row.title,court:{id:row.court_id,name:row.court_name,lat:row.court_lat,lon:row.court_lon,access:row.court_access},startsAt:new Date(row.starts_at).toISOString(),endsAt:new Date(row.ends_at).toISOString(),timeZone:row.time_zone,format:row.format,courtCount:row.court_count,seriesId:row.series_id,seriesWeek:row.series_week,seriesWeeks:row.series_weeks,capacity:row.capacity,skillPreference:row.skill_preference,status:row.status,joinPolicy:row.join_policy,organizer:{...(includeOrganizerId?{id:row.organizer_id}:{}),displayName:row.organizer_name},organizerPlaying:!!row.organizer_playing,playerCount:row.player_count,...(detail?{notes:row.notes}:{})};
}
function hostDecisionVisibilitySql(game:string,player:string){
 return `NOT EXISTS(SELECT 1 FROM game_join_requests decision WHERE decision.game_id=${game}.id AND decision.player_id=${player} AND (decision.status='removed' OR (decision.status='rejected' AND NOT EXISTS(SELECT 1 FROM player_game_invitations reinvite WHERE reinvite.game_id=${game}.id AND reinvite.recipient_id=${player} AND reinvite.sender_id=${game}.organizer_id AND reinvite.created_at>decision.updated_at))))`;
}
async function getGame(db:AuthDatabase,id:string,playerId:string|null=null){
  if(!UUID.test(id))throw new AuthError(404,'Game not found.');
  // Resolve current group visibility/membership on every request; never infer access from a shared URL.
  const row=await db.prepare(`SELECT ${projection} FROM games g JOIN players p ON p.id=g.organizer_id WHERE g.id=? AND g.visibility IN ('public','group','unlisted') AND p.status='active'`).bind(id).first<GameRow>();
  if(!row||(row.visibility==='unlisted'&&!(await canViewUnlisted(db,id,playerId)))||(row.visibility==='group'&&!(await groupGameAccess(db,row.group_id!,playerId)).canView))throw new AuthError(404,'Game not found.');
  // A fresh host invitation is the only path that restores access after a declined request.
  if(playerId&&await db.prepare(`SELECT 1 FROM game_join_requests d WHERE d.game_id=? AND d.player_id=? AND d.status='rejected' AND NOT EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=d.game_id AND i.recipient_id=d.player_id AND i.sender_id=? AND i.created_at>d.updated_at)`).bind(id,playerId,row.organizer_id).first())throw new AuthError(404,'Game not found.');
  return {...gameDto(row,true),isHost:row.organizer_id===playerId};
}
async function feed(request:Request,db:AuthDatabase,origin:string){
 const actor={id:(await session(request,db,origin))?.id??null};const url=new URL(request.url),filter=url.searchParams.get('filter')??'all',groupId=url.searchParams.get('groupId');if(!['all','mine','groups'].includes(filter))return fail('Invalid feed filter.');
 if(!actor.id&&filter!=='all')throw new AuthError(401,'Sign in to see your games and groups.');
 if(groupId&&!(await groupGameAccess(db,groupId,actor.id)).canView)throw new AuthError(404,'Group not found.');
 const after=cursor(url.searchParams.get('cursor'));
 // Feed results are upcoming-only; My Games retains started and completed games in its own history view.
 const rows=(await db.prepare(`WITH viewer(id) AS (SELECT ?) SELECT ${projection},t.name AS group_name,EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=g.id AND gp.player_id=?) AS joined,(SELECT status FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=?) AS request_status,g.organizer_id=? AS is_organizer,EXISTS(SELECT 1 FROM game_cancellations c WHERE c.game_id=g.id AND c.player_id=(SELECT id FROM viewer)) AS left_game,EXISTS(SELECT 1 FROM game_notifications n WHERE n.game_id=g.id AND n.actor_id=(SELECT id FROM viewer) AND n.kind='withdrawn') AS withdrew FROM games g JOIN players p ON p.id=g.organizer_id LEFT JOIN tennis_groups t ON t.id=g.group_id WHERE p.status='active' AND g.starts_at>? AND (g.visibility='public' OR (g.visibility='unlisted' AND ${unlistedAccessSql('g','(SELECT id FROM viewer)')}) OR (g.visibility='group' AND ${groupEventViewSql('g','?')})) AND (g.visibility='group' OR g.organizer_id=? OR EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=g.id AND gp.player_id=?) OR EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=? AND r.status='pending') OR EXISTS(SELECT 1 FROM game_cancellations c WHERE c.game_id=g.id AND c.player_id=(SELECT id FROM viewer)) OR EXISTS(SELECT 1 FROM game_notifications n WHERE n.game_id=g.id AND n.actor_id=(SELECT id FROM viewer) AND n.kind='withdrawn') OR EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=g.id AND i.recipient_id=(SELECT id FROM viewer))) AND ${hostDecisionVisibilitySql('g','(SELECT id FROM viewer)')} AND (?!='groups' OR (g.visibility='group' AND EXISTS(SELECT 1 FROM group_memberships fm WHERE fm.group_id=g.group_id AND fm.player_id=(SELECT id FROM viewer) AND fm.status='active'))) AND (?!='mine' OR g.organizer_id=? OR EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=g.id AND gp.player_id=?) OR EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=? AND r.status='pending') OR EXISTS(SELECT 1 FROM game_cancellations c WHERE c.game_id=g.id AND c.player_id=(SELECT id FROM viewer)) OR EXISTS(SELECT 1 FROM game_notifications n WHERE n.game_id=g.id AND n.actor_id=(SELECT id FROM viewer) AND n.kind='withdrawn') OR EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=g.id AND i.recipient_id=(SELECT id FROM viewer))) AND (? IS NULL OR g.group_id=?) AND (g.starts_at>? OR (g.starts_at=? AND g.id>?)) ORDER BY g.starts_at,g.id LIMIT 26`).bind(actor.id,actor.id,actor.id,actor.id,Date.now(),actor.id,actor.id,actor.id,actor.id,filter,filter,actor.id,actor.id,actor.id,groupId,groupId,after[0],after[0],after[1]).all<GameRow&{group_name:string|null;joined:number;request_status:string|null;is_organizer:number;left_game:number;withdrew:number}>()).results;
 const shown=rows.slice(0,25);return json({games:shown.map(r=>({...gameDto(r,false,Boolean(actor.id)),groupName:r.group_name,joined:!!r.joined,requestStatus:r.request_status,isOrganizer:!!r.is_organizer,left:!!r.left_game,withdrew:!!r.withdrew})),nextCursor:rows.length>25?btoa(JSON.stringify([shown[24].starts_at,shown[24].id])):null});
}
function cursor(value:string|null):[number,string]{
  if(!value)return [0,''];
  try{if(value.length>300)throw new Error();const x=JSON.parse(atob(value));if(!Array.isArray(x)||x.length!==2||!Number.isSafeInteger(x[0])||x[0]<0||!UUID.test(x[1]))throw new Error();return [x[0],x[1]];}
  catch{return fail('Invalid pagination cursor.');}
}
async function listGames(url:URL,db:AuthDatabase,actorId:string|null=null){
  const p=url.searchParams,center=point(p),radius=Number(p.get('radius')??25);
  if(!Number.isFinite(radius)||radius<1||radius>50)return fail('Choose a distance between 1 and 50 miles.');
  const from=p.get('from')?Date.parse(p.get('from')!):Date.now(),to=p.get('to')?Date.parse(p.get('to')!):Date.now()+181*86400_000;
  if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>366*86400_000)return fail('Choose a valid date range.');
  const format=p.get('format')??'any',skill=p.get('skill')??'any';
  if(!['any','singles','doubles'].includes(format)||!['any','beginner','intermediate','advanced'].includes(skill))return fail('Invalid game filter.');
  const clauses=["g.visibility='public'","g.status='scheduled'","p.status='active'",'g.starts_at>=?','g.starts_at<?'];const values:unknown[]=[Math.max(from,Date.now()),to];
  if(actorId){clauses.push('NOT EXISTS(SELECT 1 FROM player_blocks b WHERE (b.blocker_id=? AND b.blocked_id=g.organizer_id) OR (b.blocker_id=g.organizer_id AND b.blocked_id=?))');values.push(actorId,actorId);clauses.push(hostDecisionVisibilitySql('g','?'));values.push(actorId,actorId);}
  if(format!=='any'){clauses.push('g.format=?');values.push(format);}
  if(skill!=='any'){clauses.push("g.skill_preference IN ('any',?)");values.push(skill);}
  if(center){
    const dlat=radius/68,edgeLatitude=Math.min(90,Math.abs(center.lat)+dlat),dlon=edgeLatitude===90?180:Math.min(180,dlat/Math.max(.001,Math.cos(edgeLatitude*Math.PI/180)));
    clauses.push('g.court_lat BETWEEN ? AND ?');values.push(center.lat-dlat,center.lat+dlat);
    if(dlon<180){let west=center.lon-dlon,east=center.lon+dlon;if(west< -180){west+=360;clauses.push('(g.court_lon>=? OR g.court_lon<=?)');}else if(east>180){east-=360;clauses.push('(g.court_lon>=? OR g.court_lon<=?)');}else clauses.push('g.court_lon BETWEEN ? AND ?');values.push(west,east);}
  }
  let after=cursor(p.get('cursor'));const found:GameRow[]=[];let hasMore=false;let lastScanned=after;
  // Bounded batches permit exact distance filtering without silently dropping
  // games or returning offset cursors that can expose private rows/counts.
  for(let scan=0;scan<5;scan++){
    const rows=(await db.prepare(`SELECT ${projection} FROM games g JOIN players p ON p.id=g.organizer_id WHERE ${clauses.join(' AND ')} AND (g.starts_at>? OR (g.starts_at=? AND g.id>?)) ORDER BY g.starts_at,g.id LIMIT 100`).bind(...values,after[0],after[0],after[1]).all<GameRow>()).results;
    for(const row of rows){lastScanned=[row.starts_at,row.id];if(!center||milesBetween(center,{lat:row.court_lat,lon:row.court_lon})<=radius)found.push(row);if(found.length===26)break;}
    if(found.length===26){hasMore=true;break;}
    if(rows.length<100){hasMore=false;break;}
    after=lastScanned;hasMore=true;
  }
  const shown=found.slice(0,25);const last=found.length>25?[shown[24].starts_at,shown[24].id]:lastScanned;
  return json({games:shown.map(row=>({...gameDto(row),...(center?{distanceMiles:Math.round(milesBetween(center,{lat:row.court_lat,lon:row.court_lon})*10)/10}:{})})),nextCursor:hasMore?btoa(JSON.stringify(last)):null});
}
async function createGame(request:Request,db:AuthDatabase,env:GamesEnv,origin:string){
  checkOrigin(request,origin);const player=requireSession(await session(request,db,origin));checkCsrf(request,player);
  if(!player.display_name.trim())throw new AuthError(403,'Complete your player display name in Account before creating a game.');
  const body=await readJson(request,8192);
  if(Object.keys(body).some(k=>!['title','courtToken','manualCourt','startLocal','timeZone','durationMinutes','format','capacity','courtCount','repeatWeeks','skillPreference','notes','requestId','acknowledgeNoReservation','confirmAccess','joinPolicy','groupId','visibility'].includes(k)))return fail('Unexpected game field.');
  if(body.acknowledgeNoReservation!==true)return fail('Confirm that this game does not reserve a court.');
  const groupId=body.groupId??null;if(groupId!==null&&(typeof groupId!=='string'||!UUID.test(groupId)||!(await groupGameAccess(db,groupId,player.id)).canCreate))throw new AuthError(403,'Group event organizer access is required.');
  const visibility=groupId?'group':body.visibility??'public';if(!['public','unlisted','group'].includes(String(visibility))||(!groupId&&visibility==='group')||(groupId&&body.visibility&&body.visibility!=='group'))return fail('Choose public or unlisted games, or an approved group.');
  const joinPolicy=groupId?'instant':body.joinPolicy??'approval';if(!groupId&&joinPolicy!=='approval')return fail('Public games require organizer approval.');
  let court:Court;
  if(body.manualCourt!==undefined){
    if(body.courtToken!==undefined)return fail('Choose one court location.');
    const c=body.manualCourt as Record<string,unknown>;
    if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['name','address','lat','lon'].includes(k)))return fail('Invalid manual court.');
    const name=text(c.name,80,'court name',true),address=text(c.address,110,'court address',true);
    if(typeof c.lat!=='number'||typeof c.lon!=='number'||!Number.isFinite(c.lat)||!Number.isFinite(c.lon)||Math.abs(c.lat)>90||Math.abs(c.lon)>180)return fail('Find the court address on the map first.');
    court={id:'manual-'+await hashToken(JSON.stringify([name,address,c.lat,c.lon])),name:`${name} - ${address}`,lat:c.lat,lon:c.lon,access:'unknown'};
  }else court=await readCourtToken(body.courtToken,player.id,env,origin);
  if(court.access==='unknown'&&body.confirmAccess!==true)return fail('Confirm that you will check access at this court.');
  const title=text(body.title,80,'game title',true),notes=text(body.notes,1000,'notes');
  const {startsAt,timeZone}=gameStart(body.startLocal,body.timeZone);
  const duration=body.durationMinutes;
  if(typeof duration!=='number'||!Number.isInteger(duration)||duration<30||duration>240||duration%15!==0)return fail('Choose a duration from 30 to 240 minutes in 15-minute steps.');
  const courtCount=body.courtCount??1,perCourt=body.format==='singles'?2:4;
  if(!['singles','doubles'].includes(String(body.format))||!Number.isInteger(courtCount)||Number(courtCount)<1||Number(courtCount)>16||!Number.isInteger(body.capacity)||Number(body.capacity)<Number(courtCount)*perCourt||Number(body.capacity)>128)return fail('Choose 1-16 courts and a whole player capacity from the planned court places up to 128, including the organizer and guests.');
  if(!['any','beginner','intermediate','advanced'].includes(String(body.skillPreference)))return fail('Invalid skill preference.');
  if(typeof body.requestId!=='string'||!UUID.test(body.requestId))return fail('Invalid submission ID. Refresh and try again.');
  const repeatWeeks=body.repeatWeeks??1;
  if(!Number.isInteger(repeatWeeks)||Number(repeatWeeks)<1||Number(repeatWeeks)>12)return fail('Choose one game or 2-12 weekly occurrences.');
  const occurrences=Array.from({length:Number(repeatWeeks)},(_,i)=>{const d=new Date(body.startLocal+':00Z');d.setUTCDate(d.getUTCDate()+i*7);return gameStart(d.toISOString().slice(0,16),timeZone);});
  const requestHash=await hashToken(JSON.stringify({groupId,visibility,joinPolicy,title,notes,court,startsAt,timeZone,duration,format:body.format,capacity:body.capacity,...(courtCount!==1?{courtCount}:{}),...(repeatWeeks!==1?{repeatWeeks}:{}),skill:body.skillPreference}));
  const existing=await db.prepare('SELECT id,request_hash FROM games WHERE organizer_id=? AND request_id=?').bind(player.id,body.requestId).first<{id:string;request_hash:string}>();
  if(existing){if(existing.request_hash!==requestHash)throw new AuthError(409,'This submission ID was already used. Refresh before creating a different game.');return json({game:await getGame(db,existing.id,player.id)},200);}
  const id=crypto.randomUUID(),now=Date.now();
  try{
    await db.batch(occurrences.flatMap((occurrence,index)=>{const occurrenceId=index===0?id:crypto.randomUUID();return [
      db.prepare(`INSERT INTO games (id,organizer_id,visibility,group_id,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,skill_preference,notes,request_id,request_hash,created_at,updated_at,join_policy,court_count,event_capacity,series_id,series_week,series_weeks)
        SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_sessions s JOIN players p ON p.id=s.player_id WHERE p.id=? AND p.status='active' AND s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?) AND (?=0 AND (SELECT COUNT(*) FROM games WHERE organizer_id=? AND created_at>?)<10 OR ?>0 AND EXISTS(SELECT 1 FROM games WHERE id=? AND organizer_id=?)) AND (? IS NULL OR EXISTS(SELECT 1 FROM tennis_groups t JOIN group_memberships m ON m.group_id=t.id WHERE t.id=? AND t.status='active' AND m.player_id=? AND m.status='active' AND (t.owner_id=m.player_id OR COALESCE(m.assigned_role,m.role) IN ('coowner','organizer'))))`)
        .bind(occurrenceId,player.id,visibility,groupId,title,court.id,court.name,court.lat,court.lon,court.access,occurrence.startsAt,occurrence.startsAt+duration*60_000,timeZone,body.format,perCourt,body.skillPreference,notes,index===0?body.requestId:crypto.randomUUID(),requestHash,now,now,joinPolicy,courtCount,body.capacity,repeatWeeks===1?null:id,repeatWeeks===1?null:index+1,repeatWeeks===1?null:repeatWeeks,player.id,player.token_hash,now,index,player.id,now-60_000,index,id,player.id,groupId,groupId,player.id),
      db.prepare('INSERT INTO game_participants (game_id,player_id,joined_at) SELECT id,organizer_id,? FROM games WHERE id=? AND organizer_id=?').bind(now,occurrenceId,player.id),
    ];}));
  }catch(error){
    const duplicate=await db.prepare('SELECT id,request_hash FROM games WHERE organizer_id=? AND request_id=?').bind(player.id,body.requestId).first<{id:string;request_hash:string}>();
    if(duplicate?.request_hash===requestHash)return json({game:await getGame(db,duplicate.id,player.id)});
    throw error;
  }
  const inserted=await db.prepare('SELECT id FROM games WHERE id=?').bind(id).first();
  if(!inserted){
    const active=await session(request,db,origin);
    if(!active)throw new AuthError(401,'Your session expired. Sign in again.');
    throw new AuthError(429,'Too many game submissions. Please wait a minute before creating another game.');
  }
  return json({game:await getGame(db,id,player.id)},201);
}
export async function handleGames(request:Request,env:GamesEnv,lookup= courtElements):Promise<Response>{
  try{
    const {db,origin}=assertEnvironment(request,env),url=new URL(request.url);
    const path=url.pathname.replace(/^\/api\/games\/?/,'').replace(/\/$/,'');
    const series=await gameSeries(request,db,origin,path);if(series)return series;
    if(path==='feed'&&request.method==='GET')return await feed(request,db,origin);
    const shared=await gameSharing(request,db,origin,path);if(shared)return shared;
    const chat=await gameChat(request,db,origin,path);if(chat)return chat;
    const managed=await participation(request,env,db,origin,path);if(managed)return managed;
    if(!path&&request.method==='GET')return await listGames(url,db,(await session(request,db,origin))?.id??null);
    if(!path&&request.method==='POST')return await createGame(request,db,env,origin);
    if(path==='courts'&&request.method==='GET')return await selectCourts(request,db,env,origin,lookup);
    if(UUID.test(path)&&request.method==='GET')return json({game:await getGame(db,path,(await session(request,db,origin))?.id??null)});
    return json({error:'Not found.'},404);
  }catch(error){
    if(new URL(request.url).hostname==='feature-play-together.opencourts.pages.dev'){
      const path=new URL(request.url).pathname.replace(/^\/api\/games\/?/,'')||'list';
      console.error(`[Play Together] ${request.method} /api/games/${path} failed:`,error instanceof Error?`${error.name}: ${error.message}`:String(error));
    }
    return json({error:error instanceof AuthError?error.message:'Game service is unavailable. Please try again.'},error instanceof AuthError?error.status:503);
  }
}
