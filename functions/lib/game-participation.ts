import {announcementsReady} from './group-discussions';
import {editGame} from './game-edit';
import {gameChat} from './game-chat';
import {notificationBatch,notificationRun} from './notification-action';
import {refreshWaitlist,waitlistAction,waitlistState,hostWaitlist} from './game-waitlist';
import {myGames} from './my-games';
import {canViewUnlisted,unlistedAccessSql} from './game-sharing';
import {guestAction} from './game-guests';
import {groupGameAccess,groupEventViewSql} from './group-game-access';
import {notificationInbox} from './notification-inbox';
import {AuthError,checkOrigin,checkCsrf,hashToken,requireSession,session,json,readJson,type AuthDatabase,type AuthEnv} from './auth';
const error=(status:number,message:string):never=>{throw new AuthError(status,message);};
type Row={visibility:string;group_id:string|null;id:string;organizer_id:string;status:string;starts_at:number;join_policy:string;capacity:number;format:string;court_count:number;version:number};
export async function participation(request:Request,env:AuthEnv,db:AuthDatabase,origin:string,path:string):Promise<Response|null>{
 const inbox=path==='notifications'||path==='notifications/read';
 const mine=path==='mine';const match=path.match(/^([0-9a-f-]{36})\/(participation|join|leave|cancel|participants|requests|cancellations|approve|reject|remove|edit|edit-preview|guests|request-guests|cancel-guests|approve-guests|reject-guests|join-waitlist|leave-waitlist|accept-waitlist|waitlist)$/i);
 if(!mine&&!match&&!inbox)return null;
 const actor=requireSession(await session(request,db,origin,env));
 if(request.method!=='GET'){checkOrigin(request,origin);checkCsrf(request,actor);}
 if(inbox){
 if(path==='notifications'&&request.method==='GET'){
 return json({notifications:await notificationInbox(db,actor.id)});
 }
 if(path==='notifications/read'&&request.method==='POST'){const body=await readJson(request);if(typeof body.id!=='string')return error(400,'Choose a notification.');if(body.id.startsWith('announcement:')){if(await announcementsReady(db))await db.prepare('UPDATE group_discussion_announcements SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(13),actor.id).run();}else if(body.id.startsWith('discussion:')){await db.prepare('UPDATE group_discussion_notifications SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(11),actor.id).run();}else if(body.id.startsWith('chat:')){const gameId=body.id.slice(5);const routed=new Request(origin+'/api/games/'+gameId+'/chat/read',{method:'POST',headers:request.headers,body:JSON.stringify({throughSeq:Number.MAX_SAFE_INTEGER})});const r=await gameChat(routed,env,db,origin,gameId+'/chat/read');return r??error(404,'Chat unavailable.');}else if(body.id.startsWith('reminder:'))await db.prepare('UPDATE game_reminder_notifications SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(9),actor.id).run();else if(body.id.startsWith('schedule:'))await db.prepare('UPDATE game_schedule_notifications SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(9),actor.id).run();else if(body.id.startsWith('wait:'))await db.prepare('UPDATE game_waitlist SET read_at=? WHERE game_id=? AND player_id=?').bind(Date.now(),body.id.slice(5),actor.id).run();else if(body.id.startsWith('invite:'))await db.prepare('UPDATE player_game_invitations SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(7),actor.id).run();else if(body.id.startsWith('guest:'))await db.prepare('UPDATE game_guest_notifications SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(6),actor.id).run();else if(body.id.startsWith('group:'))await db.prepare('UPDATE group_notifications SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id.slice(6),actor.id).run();else await db.prepare('UPDATE game_notifications SET read_at=? WHERE id=? AND recipient_id=?').bind(Date.now(),body.id,actor.id).run();return json({ok:true});}
 return error(405,'Method not allowed.');
 }
 if(mine){if(request.method!=='GET')return error(405,'Method not allowed.');return myGames(request,db,actor.id);}
 const [,id,action]=match!;
 const game=await db.prepare("SELECT visibility,group_id,id,organizer_id,status,starts_at,join_policy,COALESCE(event_capacity,capacity) AS capacity,format,court_count,version FROM games WHERE id=? AND visibility IN ('public','group','unlisted')").bind(id).first<Row>();
 if(!game||(game.visibility==='unlisted'&&!(await canViewUnlisted(db,id,actor.id))))return error(404,'Game not found.');
 const access=game.visibility==='group'?await groupGameAccess(db,game.group_id!,actor.id,game.organizer_id):null;if(access&&!access.canView)return error(404,'Game not found.');
 const owner=actor.id===game.organizer_id||!!access?.canManage;
 if(request.method==='GET'){
 if(action==='participation'){
 if(access)await refreshWaitlist(db,id);
 const space=await db.prepare("SELECT COALESCE(event_capacity,capacity)-(SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=g.id)-(SELECT COUNT(*) FROM game_waitlist WHERE game_id=g.id AND g.visibility='group' AND status='offered' AND offer_expires_at>?) AS available FROM games g WHERE id=?").bind(Date.now(),id).first<{available:number}>();
 const joined=Boolean(await db.prepare('SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?').bind(id,actor.id).first());
 const canManageGuests=game.visibility==='group'?Boolean(access?.canView&&await db.prepare("SELECT 1 FROM tennis_groups t JOIN group_memberships m ON m.group_id=t.id WHERE t.id=? AND t.status='active' AND m.player_id=? AND m.status='active' AND (t.owner_id=m.player_id OR COALESCE(m.assigned_role,m.role) IN ('coowner','organizer'))").bind(game.group_id,actor.id).first()):owner;
 const r=await db.prepare('SELECT status,updated_at AS updatedAt FROM game_join_requests WHERE game_id=? AND player_id=?').bind(id,actor.id).first<{status:string;updatedAt:number}>();
 const canRequestAgain=r?.status==='rejected'&&Boolean(await db.prepare('SELECT 1 FROM player_game_invitations WHERE game_id=? AND recipient_id=? AND sender_id=? AND created_at>?').bind(id,actor.id,game.organizer_id,r.updatedAt).first());
 return json({isOrganizer:owner,isGameOrganizer:actor.id===game.organizer_id,canManageGuests,canRequestAgain,joined,requestStatus:r?.status??null,joinPolicy:actor.id===game.organizer_id?'instant':game.join_policy,isGroupMember:!!access?.canJoin,version:game.version,availablePlaces:space?.available,waitlist:access?await waitlistState(db,id,actor.id):null});}
 if(action==='guests')return guestAction(request,action,{db,id,actorId:actor.id,organizerId:game.organizer_id,manage:game.visibility==='group'?false:owner,open:true,active:'0',auth:[]});
 if(!owner&&!(access?.canJoin&&['participants','waitlist','cancellations'].includes(action)))return error(403,'Only the organizer can view participant management.');
 if(action==='waitlist'){if(!access)return error(404,'Group waitlist unavailable.');return hostWaitlist(db,id);}
 if(action==='cancellations'){
 const players=(await db.prepare(`SELECT p.display_name AS displayName,${owner?'c.reason,':''}c.cancelled_at AS cancelledAt,'player' AS kind,0 AS guestCount FROM game_cancellations c JOIN players p ON p.id=c.player_id WHERE c.game_id=? AND NOT EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=c.game_id AND gp.player_id=c.player_id) ORDER BY c.cancelled_at DESC LIMIT 100`).bind(id).all<Record<string,unknown>>()).results;
 const guests=(await db.prepare(`SELECT p.display_name AS displayName,n.created_at AS cancelledAt,'guests' AS kind,n.guest_count AS guestCount FROM game_guest_notifications n JOIN players p ON p.id=n.actor_id WHERE n.game_id=? AND n.kind='guest_cancelled' AND NOT EXISTS(SELECT 1 FROM game_guest_requests r WHERE r.game_id=n.game_id AND r.player_id=n.actor_id AND r.status IN ('pending','approved')) AND NOT EXISTS(SELECT 1 FROM game_guest_notifications newer WHERE newer.game_id=n.game_id AND newer.actor_id=n.actor_id AND newer.kind='guest_cancelled' AND (newer.created_at>n.created_at OR (newer.created_at=n.created_at AND newer.id>n.id))) ORDER BY n.created_at DESC LIMIT 100`).bind(id).all<Record<string,unknown>>()).results;
 return json({players:[...players,...guests].sort((a,b)=>Number(b.cancelledAt)-Number(a.cancelledAt)).slice(0,100)});}
 if(action==='participants'||action==='requests'){
 const sql=action==='participants'?`SELECT p.id,p.display_name AS displayName,gp.guest_count AS guestCount FROM game_participants gp JOIN players p ON p.id=gp.player_id WHERE gp.game_id=? AND p.status='active' ORDER BY gp.joined_at,p.id`:`SELECT p.id,p.display_name AS displayName,r.created_at AS requestedAt FROM game_join_requests r JOIN players p ON p.id=r.player_id WHERE r.game_id=? AND r.status='pending' AND p.status='active' ORDER BY r.created_at,p.id`;
 return json({players:(await db.prepare(sql).bind(id).all()).results});}
 return error(405,'Method not allowed.');}
 if(request.method!=='POST')return error(405,'Method not allowed.');
 const body=await readJson(request);const now=Date.now();
 let active=`EXISTS(SELECT 1 FROM auth_sessions s JOIN players p ON p.id=s.player_id WHERE s.token_hash=? AND s.player_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active')`;
 const auth:unknown[]=[actor.token_hash,actor.id,now];
 if(game.visibility==='unlisted'){active+=` AND EXISTS(SELECT 1 FROM games gx WHERE gx.id=? AND ${unlistedAccessSql('gx','?')})`;auth.push(id,actor.id,actor.id,actor.id);}
 if(access){const guestDecision=['approve-guests','reject-guests'].includes(action);const management=!['join','leave','request-guests','cancel-guests','join-waitlist','leave-waitlist','accept-waitlist'].includes(action);active+=management?` AND EXISTS(SELECT 1 FROM games gx JOIN tennis_groups tx ON tx.id=gx.group_id JOIN group_memberships mx ON mx.group_id=tx.id WHERE gx.id=? AND tx.status='active' AND mx.player_id=? AND mx.status='active' AND (tx.owner_id=mx.player_id OR COALESCE(mx.assigned_role,mx.role)='coowner' OR ${guestDecision?"COALESCE(mx.assigned_role,mx.role)='organizer'":"(gx.organizer_id=mx.player_id AND COALESCE(mx.assigned_role,mx.role)='organizer')"} OR gx.organizer_id=mx.player_id))`:` AND EXISTS(SELECT 1 FROM games gx WHERE gx.id=? AND ${groupEventViewSql('gx','?')})`;auth.push(id,actor.id);}

 if(['join-waitlist','leave-waitlist','accept-waitlist'].includes(action)){if(!actor.display_name.trim())throw new AuthError(403,'Complete your display name first.');if(!access?.canJoin||actor.id===game.organizer_id)throw new AuthError(403,'Only approved group players can use this waitlist.');active+=' AND NOT EXISTS(SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))';auth.push(actor.id,game.organizer_id,game.organizer_id,actor.id);return waitlistAction(db,id,actor.id,action,active,auth);}
 if(access)await refreshWaitlist(db,id);
 const guest=await guestAction(request,action,{db,id,actorId:actor.id,organizerId:game.organizer_id,manage:game.visibility==='group'?false:owner,open:game.status==='scheduled'&&game.starts_at>now,active,auth},body);if(guest){if(access)await refreshWaitlist(db,id);return guest;}

 if(action==='join'){
 if(await db.prepare('SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)').bind(actor.id,game.organizer_id,game.organizer_id,actor.id).first())return error(403,'You cannot join this game.');
 active+=' AND NOT EXISTS(SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))';auth.push(actor.id,game.organizer_id,game.organizer_id,actor.id);
 if(actor.id===game.organizer_id){
 if(game.status!=='scheduled'||game.starts_at<=now)return error(409,'This game is no longer open.');
 if(await db.prepare('SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?').bind(id,actor.id).first())return error(409,'Your playing place is already confirmed.');
 // Organizing does not reserve a place. Rejoining uses the same capacity and
 // waitlist-reservation triggers as every other participant, with no self-request.
 try{const result=await db.prepare(`INSERT INTO game_participants(game_id,player_id,joined_at) SELECT ?,?,? WHERE ${active} AND EXISTS(SELECT 1 FROM games WHERE id=? AND organizer_id=? AND status='scheduled' AND starts_at>?) AND NOT EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?)`).bind(id,actor.id,now,...auth,id,actor.id,now,id,actor.id).run();if(!result.meta.changes)return error(409,'Your attendance changed. Refresh and try again.');}catch(e){if(String(e).includes('capacity'))return error(409,'No playing place is available. The game may be full or places reserved for the waitlist.');throw e;}
 return json({ok:true});}
 if(!actor.display_name.trim()){
  if(new URL(request.url).origin==='https://opencourts.us')console.warn('[Production participation] join profile incomplete',{client:request.headers.get('Authorization')?.startsWith('Bearer ')?'native':'web',playerTag:(await hashToken(actor.id)).slice(0,12)});
  return error(403,'Complete your display name in Account first.');
 }
 if(game.status!=='scheduled'||game.starts_at<=now)return error(409,'This game is no longer open.');
 const previous=await db.prepare('SELECT status,updated_at AS updatedAt FROM game_join_requests WHERE game_id=? AND player_id=?').bind(id,actor.id).first<{status:string;updatedAt:number}>();
 if(previous?.status==='removed')return error(403,'The organizer removed you from this game.');
 if(previous?.status==='rejected'){
  const reinvited=await db.prepare('SELECT 1 FROM player_game_invitations WHERE game_id=? AND recipient_id=? AND sender_id=? AND created_at>?').bind(id,actor.id,game.organizer_id,previous.updatedAt).first();
  if(!reinvited)return error(403,'The organizer declined your request. You can request again if they invite you back.');
 }
 if(game.join_policy==='approval'){
 await db.prepare(`INSERT INTO game_join_requests(game_id,player_id,status,created_at,updated_at) SELECT ?,?,'pending',?,? WHERE ${active} AND EXISTS(SELECT 1 FROM games WHERE id=? AND status='scheduled' AND starts_at>? AND visibility IN ('public','unlisted')) AND NOT EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?) AND NOT EXISTS(SELECT 1 FROM game_join_requests old WHERE old.game_id=? AND old.player_id=? AND old.status='rejected' AND NOT EXISTS(SELECT 1 FROM player_game_invitations reinvite WHERE reinvite.game_id=old.game_id AND reinvite.recipient_id=old.player_id AND reinvite.sender_id=? AND reinvite.created_at>old.updated_at)) ON CONFLICT(game_id,player_id) DO UPDATE SET status='pending',created_at=excluded.created_at,updated_at=excluded.updated_at`).bind(id,actor.id,now,now,...auth,id,now,id,actor.id,id,actor.id,game.organizer_id).run();
 }else{
 try{await db.prepare(`INSERT INTO game_participants(game_id,player_id,joined_at) SELECT ?,?,? WHERE ${active} AND EXISTS(SELECT 1 FROM games WHERE id=? AND status='scheduled' AND starts_at>? AND visibility IN ('public','group','unlisted') AND join_policy='instant' AND (visibility!='group' OR EXISTS(SELECT 1 FROM group_memberships jm WHERE jm.group_id=games.group_id AND jm.player_id=? AND jm.status='active'))) AND NOT EXISTS(SELECT 1 FROM game_join_requests old WHERE old.game_id=? AND old.player_id=? AND (old.status='removed' OR (old.status='rejected' AND NOT EXISTS(SELECT 1 FROM player_game_invitations reinvite WHERE reinvite.game_id=old.game_id AND reinvite.recipient_id=old.player_id AND reinvite.sender_id=? AND reinvite.created_at>old.updated_at)))) AND NOT EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?)`).bind(id,actor.id,now,...auth,id,now,actor.id,id,actor.id,game.organizer_id,id,actor.id).run();}catch(e){if(String(e).includes('capacity'))return error(409,'This game is full.');throw e;}
 }
 return json({ok:true});}
 if(action==='leave'){
 if(actor.id===game.organizer_id){
 if(game.status!=='scheduled'||game.starts_at<=now)return error(409,'Attendance can only change before this game starts.');
 active+=" AND EXISTS(SELECT 1 FROM games WHERE id=? AND organizer_id=? AND status='scheduled' AND starts_at>?)";auth.push(id,actor.id,now);
 }
 const reason=body.reason??'';if(typeof reason!=='string'||reason.length>500||/[\u0000-\u001f\u007f]/.test(reason))return error(400,'Cancellation reason must be plain text up to 500 characters.');
 await notificationBatch(db,actor.id,[
 db.prepare(`INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at) SELECT ?,g.id,g.organizer_id,?,CASE WHEN EXISTS(SELECT 1 FROM game_participants WHERE game_id=g.id AND player_id=?) THEN 'cancelled' ELSE 'withdrawn' END,?,COALESCE((SELECT 1+guest_count FROM game_participants WHERE game_id=g.id AND player_id=?),0),? FROM games g WHERE g.id=? AND g.visibility IN ('public','group','unlisted') AND g.organizer_id!=? AND ${active} AND (EXISTS(SELECT 1 FROM game_participants WHERE game_id=g.id AND player_id=?) OR EXISTS(SELECT 1 FROM game_join_requests WHERE game_id=g.id AND player_id=? AND status='pending'))`).bind(crypto.randomUUID(),actor.id,actor.id,reason.trim(),actor.id,now,id,actor.id,...auth,actor.id,actor.id),
 db.prepare(`INSERT INTO game_cancellations(game_id,player_id,reason,cancelled_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?) AND ${active} ON CONFLICT(game_id,player_id) DO UPDATE SET reason=excluded.reason,cancelled_at=excluded.cancelled_at`).bind(id,actor.id,reason.trim(),now,id,actor.id,...auth),db.prepare(`DELETE FROM game_participants WHERE game_id=? AND player_id=? AND ${active}`).bind(id,actor.id,...auth),db.prepare(`DELETE FROM game_chat_capacity_access WHERE game_id=? AND player_id=? AND ${active}`).bind(id,actor.id,...auth),db.prepare(`DELETE FROM game_join_requests WHERE game_id=? AND player_id=? AND status IN ('pending','approved') AND ${active}`).bind(id,actor.id,...auth)]);if(access)await refreshWaitlist(db,id);return json({ok:true});}
 if(!owner)return error(403,'Only the organizer can manage this game.');
 if(action==='cancel'){
 await notificationRun(db,actor.id,db.prepare(`UPDATE games SET status='cancelled',version=version+1,updated_at=? WHERE id=? AND ${active}`).bind(now,id,...auth));return json({ok:true});}
 if(game.status!=='scheduled'||game.starts_at<=now)return error(409,'This game is no longer open for changes.');
 if(action==='edit'||action==='edit-preview')return editGame(db,game,actor.id,body,active,auth,action==='edit-preview');
 if(!['approve','reject','remove'].includes(action))return error(405,'Method not allowed.');
 if(typeof body.playerId!=='string'||body.playerId===actor.id)return error(400,'Choose another player.');
 const target=body.playerId;
 const eligible=await db.prepare('SELECT 1 FROM game_join_requests WHERE game_id=? AND player_id=? UNION SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?').bind(id,target,id,target).first();if(!eligible)return error(404,'Participation not found.');
 if(action==='approve'){
 if(await db.prepare('SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)').bind(target,game.organizer_id,game.organizer_id,target).first())return error(403,'This player cannot join the game.');
 const currentRequest=await db.prepare('SELECT status FROM game_join_requests WHERE game_id=? AND player_id=?').bind(id,target).first<{status:string}>();
 const alreadyJoined=!!await db.prepare('SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?').bind(id,target).first();
 if(currentRequest?.status==='approved'&&alreadyJoined)return json({ok:true,approved:true});
 if(currentRequest?.status!=='pending')return error(409,'This join request is no longer pending. Refresh the game and review its current status.');
 active+=' AND NOT EXISTS(SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))';auth.push(target,game.organizer_id,game.organizer_id,target);
 try{const results=await notificationBatch(db,actor.id,[
 db.prepare(`INSERT INTO game_participants(game_id,player_id,joined_at) SELECT ?,?,? WHERE ${active} AND EXISTS(SELECT 1 FROM games WHERE id=? AND status='scheduled' AND starts_at>? AND visibility IN ('public','group','unlisted')) AND EXISTS(SELECT 1 FROM game_join_requests WHERE game_id=? AND player_id=? AND status='pending') AND EXISTS(SELECT 1 FROM players WHERE id=? AND status='active') AND NOT EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?)`).bind(id,target,now,...auth,id,now,id,target,target,id,target),
 db.prepare(`UPDATE game_join_requests SET status='approved',updated_at=? WHERE game_id=? AND player_id=? AND status='pending' AND EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?) AND ${active}`).bind(now,id,target,id,target,...auth)]) as {meta:{changes:number}}[];if(!results[1]?.meta.changes)return error(409,'The request could not be approved because the game or request changed. Refresh and try again.');}catch(e){if(String(e).includes('capacity'))return error(409,'This game is full.');throw e;}
 }else{
 await notificationBatch(db,actor.id,[
 db.prepare(`INSERT INTO game_join_requests(game_id,player_id,status,created_at,updated_at) SELECT ?,?,?,?,? WHERE ${active} AND EXISTS(SELECT 1 FROM games WHERE id=? AND status='scheduled' AND starts_at>?) ON CONFLICT(game_id,player_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at`).bind(id,target,action==='remove'?'removed':'rejected',now,now,...auth,id,now),
 db.prepare(`DELETE FROM game_chat_capacity_access WHERE game_id=? AND player_id=? AND ${active}`).bind(id,target,...auth),
 db.prepare(`DELETE FROM game_participants WHERE game_id=? AND player_id=? AND EXISTS(SELECT 1 FROM game_join_requests WHERE game_id=? AND player_id=? AND status IN ('rejected','removed')) AND ${active}`).bind(id,target,id,target,...auth)]);
 }
 if(access)await refreshWaitlist(db,id);
 return json({ok:true});
}
