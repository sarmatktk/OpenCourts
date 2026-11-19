import {AuthError,checkOrigin,checkCsrf,requireSession,session,json,readJson,hashToken,type AuthDatabase} from './auth';
import {unlistedAccessSql} from './game-sharing';
import {groupGameAccess,groupEventViewSql} from './group-game-access';
import {gameStart} from './game-time';
type Row={id:string;series_id:string|null;series_week:number|null;title:string;organizer_id:string;visibility:string;group_id:string|null;starts_at:number;ends_at:number;time_zone:string;status:string;version:number;series_exception:number;capacity:number;event_capacity:number|null};
function wall(epoch:number,zone:string){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(epoch).map(v=>[v.type,v.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
async function manages(db:AuthDatabase,g:Row,actor:string){return g.visibility==='group'?(await groupGameAccess(db,g.group_id!,actor,g.organizer_id)).canManage:g.organizer_id===actor;}
export async function gameSeries(request:Request,db:AuthDatabase,origin:string,path:string){
 const match=path.match(/^([0-9a-f-]{36})\/series(?:\/(preview|apply))?$/i);if(!match)return null;const actor=requireSession(await session(request,db,origin)),id=match[1],action=match[2];
 const anchor=await db.prepare('SELECT * FROM games WHERE id=?').bind(id).first<Row>();if(!anchor||!await manages(db,anchor,actor.id))throw new AuthError(404,'Game management unavailable.');
 const rows=anchor.series_id?(await db.prepare('SELECT * FROM games WHERE series_id=? ORDER BY series_week,id').bind(anchor.series_id).all<Row>()).results:[anchor];
 if(request.method==='GET'&&!action){const games=[];for(const g of rows)if(await manages(db,g,actor.id))games.push({playerCount:(await db.prepare('SELECT COALESCE(SUM(1+guest_count),0) AS n FROM game_participants WHERE game_id=?').bind(g.id).first<{n:number}>())?.n??0,capacity:g.event_capacity??g.capacity,id:g.id,title:g.title,startsAt:new Date(g.starts_at).toISOString(),endsAt:new Date(g.ends_at).toISOString(),startLocal:wall(g.starts_at,g.time_zone),timeZone:g.time_zone,status:g.status,version:g.version,exception:!!g.series_exception,week:g.series_week,editable:g.status==='scheduled'&&g.starts_at>Date.now()});return json({games,seriesId:anchor.series_id});}
 if(request.method!=='POST'||!action)throw new AuthError(405,'Method not allowed.');checkOrigin(request,origin);checkCsrf(request,actor);const b=await readJson(request,8192),now=Date.now();
 if(!['single','future'].includes(String(b.scope))||!['reschedule','cancel'].includes(String(b.operation))||typeof b.preserveExceptions!=='boolean')throw new AuthError(400,'Choose an action and affected games.');
 const previous=action==='apply'&&typeof b.requestId==='string'?await db.prepare('SELECT request_hash,actor_id FROM game_series_changes WHERE id=?').bind(b.requestId).first<{request_hash:string;actor_id:string}>():null;if(previous){if(previous.actor_id!==actor.id||previous.request_hash!==b.planHash)throw new AuthError(409,'This confirmation was already used. Reload the series.');return json({ok:true});}
 if(anchor.status!=='scheduled'||anchor.starts_at<=now)throw new AuthError(409,'Choose an upcoming scheduled game.');
 const affected:Record<string,unknown>[]=[],skipped:Record<string,unknown>[]=[];let dayShift=0,newTime='';
 if(b.operation==='reschedule'){const next=gameStart(b.startLocal,anchor.time_zone);const oldLocal=wall(anchor.starts_at,anchor.time_zone);dayShift=(Date.parse(String(b.startLocal).slice(0,10)+'T00:00:00Z')-Date.parse(oldLocal.slice(0,10)+'T00:00:00Z'))/86400000;newTime=String(b.startLocal).slice(11);if(next.startsAt===anchor.starts_at)throw new AuthError(400,'Choose a different date or time.');}
 for(const g of rows){const included=b.scope==='single'?g.id===id:(anchor.series_week!==null&&g.series_week!==null?g.series_week>=anchor.series_week:g.starts_at>=anchor.starts_at);if(!included)continue;
 const reason=g.status!=='scheduled'?'Already cancelled':g.starts_at<=now?'Past or started':g.id!==id&&g.series_exception&&b.preserveExceptions?'Individual exception preserved':!await manages(db,g,actor.id)?'No management permission':null;
 if(reason){skipped.push({id:g.id,startsAt:new Date(g.starts_at).toISOString(),timeZone:g.time_zone,reason});continue;}
 let start=g.starts_at;if(b.operation==='reschedule'){const local=wall(g.starts_at,g.time_zone),d=new Date(local.slice(0,10)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+dayShift);start=gameStart(d.toISOString().slice(0,10)+'T'+newTime,g.time_zone).startsAt;}
 affected.push({id:g.id,title:g.title,oldStart:g.starts_at,newStart:start,newEnd:start+g.ends_at-g.starts_at,timeZone:g.time_zone,version:g.version,exception:b.scope==='single'?1:0,status:b.operation==='cancel'?'cancelled':'scheduled'});
 }
 if(!affected.length)throw new AuthError(409,'No upcoming games can be changed.');
 const planHash=await hashToken(JSON.stringify({actor:actor.id,id,operation:b.operation,scope:b.scope,affected,skipped}));
 if(action==='preview')return json({affected,skipped,planHash});
 if(b.planHash!==planHash||typeof b.requestId!=='string'||!/^[0-9a-f-]{36}$/i.test(b.requestId))throw new AuthError(409,'The schedule changed. Preview the dates again before confirming.');

 try{await db.batch([db.prepare('INSERT INTO game_series_changes VALUES (?,?,?,?,?)').bind(b.requestId,actor.id,actor.token_hash,planHash,now),...affected.map(g=>db.prepare('INSERT INTO game_series_change_targets VALUES (?,?,?,?,?,?,?)').bind(b.requestId,g.id,g.version,g.newStart,g.newEnd,g.status,g.exception))]);}catch{throw new AuthError(409,'The series or permissions changed. Preview again; no partial changes were saved.');}
 return json({ok:true,changed:affected.length});
}

export async function scheduleNotifications(db:AuthDatabase,actor:string){
 return (await db.prepare(`SELECT 'schedule:'||n.id AS id,g.id AS gameId,g.title AS gameTitle,'The schedule' AS displayName,'schedule_changed' AS kind,n.old_start AS oldStart,n.new_start AS newStart,g.time_zone AS timeZone,n.created_at AS createdAt,n.read_at AS readAt FROM game_schedule_notifications n JOIN games g ON g.id=n.game_id JOIN players p ON p.id=g.organizer_id WHERE n.recipient_id=? AND p.status='active' AND (g.visibility='public' OR (g.visibility='group' AND ${groupEventViewSql('g','n.recipient_id')}) OR (g.visibility='unlisted' AND ${unlistedAccessSql('g','n.recipient_id')})) ORDER BY n.created_at DESC,n.id LIMIT 100`).bind(actor).all<Record<string,unknown>>()).results;
}
