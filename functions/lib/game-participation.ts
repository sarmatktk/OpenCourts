import {scheduleNotifications} from './game-series';
import {refreshWaitlist,waitlistAction,waitlistState,waitlistNotifications,hostWaitlist} from './game-waitlist';
import {invitationNotifications} from './player-game-invitations';
import {myGames} from './my-games';
import {canViewUnlisted,unlistedAccessSql} from './game-sharing';
import {guestAction} from './game-guests';
import {groupGameAccess,groupEventViewSql} from './group-game-access';
import {AuthError,checkOrigin,checkCsrf,requireSession,session,json,readJson,type AuthDatabase,type AuthEnv} from './auth';
const error=(status:number,message:string):never=>{throw new AuthError(status,message);};
type Row={visibility:string;group_id:string|null;id:string;organizer_id:string;status:string;starts_at:number;join_policy:string;capacity:number;version:number};
export async function participation(request:Request,env:AuthEnv,db:AuthDatabase,origin:string,path:string):Promise<Response|null>{
 const inbox=path==='notifications'||path==='notifications/read';
 const mine=path==='mine';const match=path.match(/^([0-9a-f-]{36})\/(participation|join|leave|cancel|participants|requests|cancellations|approve|reject|remove|edit|guests|request-guests|cancel-guests|approve-guests|reject-guests|join-waitlist|leave-waitlist|accept-waitlist|waitlist)$/i);
 if(!mine&&!match&&!inbox)return null;
 const actor=requireSession(await session(request,db,origin));
 if(request.method!=='GET'){checkOrigin(request,origin);checkCsrf(request,actor);}
 if(inbox){
 if(path==='notifications'&&request.method==='GET'){
 const games=(await db.prepare(`SELECT n.id,n.game_id AS gameId,g.title AS gameTitle,p.display_name AS displayName,CASE WHEN n.kind='requested' AND g.organizer_id=n.recipient_id AND g.status='scheduled' AND g.starts_at>? AND r.status='pending' AND r.created_at=n.created_at AND p.status='active' THEN n.actor_id ELSE NULL END AS actionPlayerId,CASE WHEN n.kind='requested' THEN CASE WHEN r.created_at!=n.created_at THEN 'superseded' ELSE COALESCE(r.status,'withdrawn') END ELSE NULL END AS requestStatus,n.kind,n.reason,n.places_released AS placesReleased,n.created_at AS createdAt,n.read_at AS readAt FROM game_notifications n JOIN games g ON g.id=n.game_id JOIN players p ON p.id=n.actor_id LEFT JOIN game_join_requests r ON r.game_id=n.game_id AND r.player_id=n.actor_id WHERE n.recipient_id=? AND (g.visibility='public' OR (g.visibility='unlisted' AND ${unlistedAccessSql('g','n.recipient_id')}) OR (g.visibility='group' AND ${groupEventViewSql('g','n.recipient_id')})) ORDER BY n.created_at DESC,n.id LIMIT 100`).bind(Date.now(),actor.id).all<Record<string,unknown>>()).results;
 const groups=(await db.prepare(`SELECT 'group:'||n.id AS id,n.group_id AS groupId,g.name AS groupName,CASE WHEN n.kind='group_requested' THEN p.display_name ELSE 'Group administrator' END AS displayName,CASE WHEN n.kind='group_requested' AND r.status='pending' AND r.updated_at=n.created_at AND p.status='active' THEN n.actor_id ELSE NULL END AS actionPlayerId,CASE WHEN n.kind='group_requested' THEN CASE WHEN r.status='pending' AND r.updated_at!=n.created_at THEN 'superseded' ELSE COALESCE(r.status,'withdrawn') END ELSE NULL END AS requestStatus,n.kind,n.created_at AS createdAt,n.read_at AS readAt FROM group_notifications n JOIN tennis_groups g ON g.id=n.group_id JOIN players p ON p.id=n.actor_id LEFT JOIN group_memberships r ON r.group_id=n.group_id AND r.player_id=n.actor_id WHERE n.recipient_id=? AND (n.kind!='group_requested' OR (g.status='active' AND EXISTS(SELECT 1 FROM group_memberships m WHERE m.group_id=g.id AND m.player_id=? AND m.status='active' AND (COALESCE(m.assigned_role,m.role) IN ('admin','coowner') OR g.owner_id=m.player_id)))) ORDER BY n.created_at DESC,n.id LIMIT 100`).bind(actor.id,actor.id).all<Record<string,unknown>>()).results;
 const guests=(await db.prepare(`SELECT 'guest:'||n.id AS id,n.game_id AS gameId,g.title AS gameTitle,p.display_name AS displayName,n.kind,n.guest_count AS guestCount,n.created_at AS createdAt,n.read_at AS readAt FROM game_guest_notifications n JOIN games g ON g.id=n.game_id JOIN players p ON p.id=n.actor_id WHERE n.recipient_id=? AND (g.visibility='public' OR (g.visibility='unlisted' AND ${unlistedAccessSql('g','n.recipient_id')}) OR (g.visibility='group' AND ${groupEventViewSql('g','?')})) ORDER BY n.created_at DESC,n.id LIMIT 100`).bind(actor.id,actor.id).all<Record<string,unknown>>()).results;
 return json({notifications:[...games,...groups,...guests,...await invitationNotifications(db,actor.id),...await waitlistNotifications(db,actor.id),...await scheduleNotifications(db,actor.id)].sort((a,b)=>Number(b.createdAt)-Number(a.createdAt)||String(a.id).localeCompare(String(b.id))).slice(0,100)});
 }
 if(path==='notifications/read'&&request.method==='POST'){const body=await readJson(request);if(typeof body.id!=='string')return error(400,'Choose a notification.');if(body.id.startsWith('schedule:'))await db.prepare('UPDATE game_schedule_notifications SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(9),actor.id).run();else if(body.id.startsWith('wait:'))await db.prepare('UPDATE game_waitlist SET read_at=? WHERE game_id=? AND player_id=?').bind(Date.now(),body.id.slice(5),actor.id).run();else if(body.id.startsWith('invite:'))await db.prepare('UPDATE player_game_invitations SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(7),actor.id).run();else if(body.id.startsWith('guest:'))await db.prepare('UPDATE game_guest_notifications SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(6),actor.id).run();else if(body.id.startsWith('group:'))await db.prepare('UPDATE group_notifications SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(6),actor.id).run();else await db.prepare('UPDATE game_notifications SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id,actor.id).run();return json({ok:true});}
 return error(405,'Method not allowed.');
 }
 if(mine){if(request.method!=='GET')return error(405,'Method not allowed.');return myGames(request,db,actor.id);}
 const [,id,action]=match!;
 const game=await db.prepare("SELECT visibility,group_id,id,organizer_id,status,starts_at,join_policy,COALESCE(event_capacity,capacity) AS capacity,version FROM games WHERE id=? AND visibility IN ('public','group','unlisted')").bind(id).first<Row>();
 if(!game||(game.visibility==='unlisted'&&!(await canViewUnlisted(db,id,actor.id))))return error(404,'Game not found.');
 const access=game.visibility==='group'?await groupGameAccess(db,game.group_id!,actor.id,game.organizer_id):null;if(access&&!access.canView)return error(404,'Game not found.');
 const owner=actor.id===game.organizer_id||!!access?.canManage;
 if(request.method==='GET'){
 if(action==='participation'){
 if(access)await refreshWaitlist(db,id);
 const space=access?await db.prepare("SELECT COALESCE(event_capacity,capacity)-(SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=g.id)-(SELECT COUNT(*) FROM game_waitlist WHERE game_id=g.id AND status='offered' AND offer_expires_at>?) AS available FROM games g WHERE id=?").bind(Date.now(),id).first<{available:number}>():null;
 const joined=Boolean(await db.prepare('SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?').bind(id,actor.id).first());
 const r=await db.prepare('SELECT status FROM game_join_requests WHERE game_id=? AND player_id=?').bind(id,actor.id).first<{status:string}>();
 return json({isOrganizer:owner,joined,requestStatus:r?.status??null,joinPolicy:access&&!access.canJoin?'approval':game.join_policy,isGroupMember:!!access?.canJoin,version:game.version,availablePlaces:space?.available,waitlist:access?await waitlistState(db,id,actor.id):null});}
 if(action==='guests')return guestAction(request,action,{db,id,actorId:actor.id,organizerId:game.organizer_id,manage:owner,open:true,active:'0',auth:[]});
 if(!owner&&!(access?.canJoin&&['participants','waitlist','cancellations'].includes(action)))return error(403,'Only the organizer can view participant management.');
 if(action==='waitlist'){if(!access)return error(404,'Group waitlist unavailable.');return hostWaitlist(db,id);}
 if(action==='cancellations'){
 const players=(await db.prepare(`SELECT p.display_name AS displayName,${owner?'c.reason,':''}c.cancelled_at AS cancelledAt,'player' AS kind,0 AS guestCount FROM game_cancellations c JOIN players p ON p.id=c.player_id WHERE c.game_id=? AND NOT EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=c.game_id AND gp.player_id=c.player_id) ORDER BY c.cancelled_at DESC LIMIT 100`).bind(id).all<Record<string,unknown>>()).results;
 const guests=(await db.prepare(`SELECT p.display_name AS displayName,n.created_at AS cancelledAt,'guests' AS kind,n.guest_count AS guestCount FROM game_guest_notifications n JOIN players p ON p.id=n.actor_id WHERE n.game_id=? AND n.kind='guest_cancelled' AND NOT EXISTS(SELECT 1 FROM game_guest_requests r WHERE r.game_id=n.game_id AND r.player_id=n.actor_id AND r.status IN ('pending','approved')) AND NOT EXISTS(SELECT 1 FROM game_guest_notifications newer WHERE newer.game_id=n.game_id AND newer.actor_id=n.actor_id AND newer.kind='guest_cancelled' AND (newer.created_at>n.created_at OR (newer.created_at=n.created_at AND newer.id>n.id))) ORDER BY n.created_at DESC LIMIT 100`).bind(id).all<Record<string,unknown>>()).results;
 return json({players:[...players,...guests].sort((a,b)=>Number(b.cancelledAt)-Number(a.cancelledAt)).slice(0,100)});}
 if(action==='participants'||action==='requests'){
 const sql=action==='participants'?`SELECT p.id,p.display_name AS displayName,gp.guest_count AS guestCount FROM game_participants gp JOIN players p ON p.id=gp.player_id WHERE gp.game_id=? AND p.status='active' ORDER BY gp.joined_at,p.id`:`SELECT p.id,p.display_name AS displayName FROM game_join_requests r JOIN players p ON p.id=r.player_id WHERE r.game_id=? AND r.status='pending' AND p.status='active' ORDER BY r.created_at,p.id`;
 return json({players:(await db.prepare(sql).bind(id).all()).results});}
 return error(405,'Method not allowed.');}
 if(request.method!=='POST')return error(405,'Method not allowed.');
 const body=await readJson(request);const now=Date.now();
 let active=`EXISTS(SELECT 1 FROM auth_sessions s JOIN players p ON p.id=s.player_id WHERE s.token_hash=? AND s.player_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active')`;
 const auth:unknown[]=[actor.token_hash,actor.id,now];
 if(game.visibility==='unlisted'){active+=` AND EXISTS(SELECT 1 FROM games gx WHERE gx.id=? AND ${unlistedAccessSql('gx','?')})`;auth.push(id,actor.id,actor.id,actor.id);}
 if(access){const management=!['join','leave','request-guests','cancel-guests','join-waitlist','leave-waitlist','accept-waitlist'].includes(action);active+=management?` AND EXISTS(SELECT 1 FROM games gx JOIN tennis_groups tx ON tx.id=gx.group_id JOIN group_memberships mx ON mx.group_id=tx.id WHERE gx.id=? AND tx.status='active' AND mx.player_id=? AND mx.status='active' AND (tx.owner_id=mx.player_id OR COALESCE(mx.assigned_role,mx.role)='coowner' OR (gx.organizer_id=mx.player_id AND COALESCE(mx.assigned_role,mx.role)='organizer')))`:` AND EXISTS(SELECT 1 FROM games gx WHERE gx.id=? AND ${groupEventViewSql('gx','?')})`;auth.push(id,actor.id);}

 if(['join-waitlist','leave-waitlist','accept-waitlist'].includes(action)){if(!actor.display_name.trim())throw new AuthError(403,'Complete your display name first.');if(!access?.canJoin||actor.id===game.organizer_id)throw new AuthError(403,'Only approved group players can use this waitlist.');active+=' AND NOT EXISTS(SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))';auth.push(actor.id,game.organizer_id,game.organizer_id,actor.id);return waitlistAction(db,id,actor.id,action,active,auth);}
 if(access)await refreshWaitlist(db,id);
 const guest=await guestAction(request,action,{db,id,actorId:actor.id,organizerId:game.organizer_id,manage:owner,open:game.status==='scheduled'&&game.starts_at>now,active,auth},body);if(guest){if(access)await refreshWaitlist(db,id);return guest;}

 if(action==='join'){
 if(await db.prepare('SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)').bind(actor.id,game.organizer_id,game.organizer_id,actor.id).first())return error(403,'You cannot join this game.');
 active+=' AND NOT EXISTS(SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))';auth.push(actor.id,game.organizer_id,game.organizer_id,actor.id);
 if(actor.id===game.organizer_id)return error(409,'You already organize this game and have a confirmed place.');
 if(!actor.display_name.trim())return error(403,'Complete your display name in Account first.');
 if(game.status!=='scheduled'||game.starts_at<=now)return error(409,'This game is no longer open.');
 const previous=await db.prepare('SELECT status FROM game_join_requests WHERE game_id=? AND player_id=?').bind(id,actor.id).first<{status:string}>();
 if(previous&&['rejected','removed'].includes(previous.status))return error(403,'The organizer has declined participation in this game.');
 if(game.join_policy==='approval'||(access&&!access.canJoin)){
 await db.prepare(`INSERT INTO game_join_requests(game_id,player_id,status,created_at,updated_at) SELECT ?,?,'pending',?,? WHERE ${active} AND EXISTS(SELECT 1 FROM games WHERE id=? AND status='scheduled' AND starts_at>? AND (visibility IN ('public','unlisted') OR (visibility='group' AND EXISTS(SELECT 1 FROM tennis_groups pt WHERE pt.id=games.group_id AND pt.visibility='public' AND pt.status='active')))) AND NOT EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?) ON CONFLICT(game_id,player_id) DO NOTHING`).bind(id,actor.id,now,now,...auth,id,now,id,actor.id).run();
 }else{
 try{await db.prepare(`INSERT INTO game_participants(game_id,player_id,joined_at) SELECT ?,?,? WHERE ${active} AND EXISTS(SELECT 1 FROM games WHERE id=? AND status='scheduled' AND starts_at>? AND visibility IN ('public','group','unlisted') AND join_policy='instant' AND (visibility!='group' OR EXISTS(SELECT 1 FROM group_memberships jm WHERE jm.group_id=games.group_id AND jm.player_id=? AND jm.status='active'))) AND NOT EXISTS(SELECT 1 FROM game_join_requests WHERE game_id=? AND player_id=? AND status IN ('rejected','removed')) AND NOT EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?)`).bind(id,actor.id,now,...auth,id,now,actor.id,id,actor.id,id,actor.id).run();}catch(e){if(String(e).includes('capacity'))return error(409,'This game is full.');throw e;}
 }
 return json({ok:true});}
 if(action==='leave'){
 if(actor.id===game.organizer_id)return error(409,'Organizers must cancel their game instead of leaving.');
 const reason=body.reason??'';if(typeof reason!=='string'||reason.length>500||/[\u0000-\u001f\u007f]/.test(reason))return error(400,'Cancellation reason must be plain text up to 500 characters.');
 await db.batch([
 db.prepare(`INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at) SELECT ?,g.id,g.organizer_id,?,CASE WHEN EXISTS(SELECT 1 FROM game_participants WHERE game_id=g.id AND player_id=?) THEN 'cancelled' ELSE 'withdrawn' END,?,COALESCE((SELECT 1+guest_count FROM game_participants WHERE game_id=g.id AND player_id=?),0),? FROM games g WHERE g.id=? AND g.visibility IN ('public','group','unlisted') AND g.organizer_id!=? AND ${active} AND (EXISTS(SELECT 1 FROM game_participants WHERE game_id=g.id AND player_id=?) OR EXISTS(SELECT 1 FROM game_join_requests WHERE game_id=g.id AND player_id=? AND status='pending'))`).bind(crypto.randomUUID(),actor.id,actor.id,reason.trim(),actor.id,now,id,actor.id,...auth,actor.id,actor.id),
 db.prepare(`INSERT INTO game_cancellations(game_id,player_id,reason,cancelled_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?) AND ${active} ON CONFLICT(game_id,player_id) DO UPDATE SET reason=excluded.reason,cancelled_at=excluded.cancelled_at`).bind(id,actor.id,reason.trim(),now,id,actor.id,...auth),db.prepare(`DELETE FROM game_participants WHERE game_id=? AND player_id=? AND ${active}`).bind(id,actor.id,...auth),db.prepare(`DELETE FROM game_join_requests WHERE game_id=? AND player_id=? AND status IN ('pending','approved') AND ${active}`).bind(id,actor.id,...auth)]);if(access)await refreshWaitlist(db,id);return json({ok:true});}
 if(!owner)return error(403,'Only the organizer can manage this game.');
 if(action==='cancel'){
 await db.prepare(`UPDATE games SET status='cancelled',version=version+1,updated_at=? WHERE id=? AND ${active}`).bind(now,id,...auth).run();return json({ok:true});}
 if(game.status!=='scheduled'||game.starts_at<=now)return error(409,'This game is no longer open for changes.');
 if(action==='edit'){
 if(Object.keys(body).some(k=>!['title','notes','version'].includes(k)))return error(400,'Only title and notes can be edited in this phase.');
 if(typeof body.title!=='string'||!body.title.trim()||body.title.length>80||typeof body.notes!=='string'||body.notes.length>1000)return error(400,'Enter a title up to 80 characters and notes up to 1000 characters.');
 const result=await db.prepare(`UPDATE games SET title=?,notes=?,version=version+1,updated_at=? WHERE id=? AND version=? AND status='scheduled' AND starts_at>? AND ${active}`).bind(body.title.trim(),body.notes,now,id,body.version,now,...auth).run();if(!result.meta.changes)return error(409,'Game changed. Refresh before editing.');return json({ok:true});}
 if(!['approve','reject','remove'].includes(action))return error(405,'Method not allowed.');
 if(typeof body.playerId!=='string'||body.playerId===actor.id)return error(400,'Choose another player.');
 const target=body.playerId;
 const eligible=await db.prepare('SELECT 1 FROM game_join_requests WHERE game_id=? AND player_id=? UNION SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?').bind(id,target,id,target).first();if(!eligible)return error(404,'Participation not found.');
 if(action==='approve'){
 if(await db.prepare('SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)').bind(target,game.organizer_id,game.organizer_id,target).first())return error(403,'This player cannot join the game.');
 active+=' AND NOT EXISTS(SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))';auth.push(target,game.organizer_id,game.organizer_id,target);
 try{await db.batch([
 db.prepare(`INSERT INTO game_participants(game_id,player_id,joined_at) SELECT ?,?,? WHERE ${active} AND EXISTS(SELECT 1 FROM games WHERE id=? AND status='scheduled' AND starts_at>? AND visibility IN ('public','group','unlisted')) AND EXISTS(SELECT 1 FROM game_join_requests WHERE game_id=? AND player_id=? AND status='pending') AND EXISTS(SELECT 1 FROM players WHERE id=? AND status='active') AND NOT EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?)`).bind(id,target,now,...auth,id,now,id,target,target,id,target),
 db.prepare(`UPDATE game_join_requests SET status='approved',updated_at=? WHERE game_id=? AND player_id=? AND status='pending' AND EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?) AND ${active}`).bind(now,id,target,id,target,...auth)]);}catch(e){if(String(e).includes('capacity'))return error(409,'This game is full.');throw e;}
 }else{
 await db.batch([
 db.prepare(`INSERT INTO game_join_requests(game_id,player_id,status,created_at,updated_at) SELECT ?,?,?,?,? WHERE ${active} AND EXISTS(SELECT 1 FROM games WHERE id=? AND status='scheduled' AND starts_at>?) ON CONFLICT(game_id,player_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at`).bind(id,target,action==='remove'?'removed':'rejected',now,now,...auth,id,now),
 db.prepare(`DELETE FROM game_participants WHERE game_id=? AND player_id=? AND EXISTS(SELECT 1 FROM game_join_requests WHERE game_id=? AND player_id=? AND status IN ('rejected','removed')) AND ${active}`).bind(id,target,id,target,...auth)]);
 }
 if(access)await refreshWaitlist(db,id);
 return json({ok:true});
}
