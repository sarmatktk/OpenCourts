import {notificationBatch,notificationRun} from './notification-action';
import {AuthError,json,type AuthDatabase} from './auth';
type Context={db:AuthDatabase;id:string;actorId:string;organizerId:string;manage:boolean;open:boolean;active:string;auth:unknown[]};
export async function guestAction(request:Request,action:string,c:Context,body:Record<string,unknown>={}):Promise<Response|null>{
 if(!['guests','request-guests','cancel-guests','approve-guests','reject-guests'].includes(action))return null;
 const {db,id,actorId,organizerId,manage}=c;const active=`(${c.active}) AND EXISTS(SELECT 1 FROM games WHERE id=? AND status='scheduled' AND starts_at>?)`;const auth=[...c.auth,id,Date.now()];
 const directSql=`EXISTS(SELECT 1 FROM games dg WHERE dg.id=? AND ((dg.visibility!='group' AND dg.organizer_id=?) OR (dg.visibility='group' AND EXISTS(SELECT 1 FROM tennis_groups dt JOIN group_memberships dm ON dm.group_id=dt.id WHERE dt.id=dg.group_id AND dt.status='active' AND dm.player_id=? AND dm.status='active' AND (dt.owner_id=dm.player_id OR COALESCE(dm.assigned_role,dm.role) IN ('coowner','organizer'))))))`;
 const directAuth=[id,actorId,actorId];
 const canAddGuestsDirectly=!!await db.prepare('SELECT 1 WHERE '+directSql).bind(...directAuth).first();
 if(action==='guests'&&request.method==='GET'){
 const own=await db.prepare('SELECT gp.guest_count AS confirmed,r.guest_count AS requested,r.status FROM game_participants gp LEFT JOIN game_guest_requests r ON r.game_id=gp.game_id AND r.player_id=gp.player_id WHERE gp.game_id=? AND gp.player_id=?').bind(id,actorId).first();
 const requests=manage?(await db.prepare("SELECT r.player_id AS playerId,p.display_name AS displayName,r.guest_count AS guestCount FROM game_guest_requests r JOIN players p ON p.id=r.player_id WHERE r.game_id=? AND r.status='pending' AND p.status='active' ORDER BY r.created_at,r.player_id").bind(id).all()).results:[];
 return json({own,requests,isHost:actorId===organizerId,canAddGuestsDirectly});
 }
 if(request.method!=='POST')throw new AuthError(405,'Method not allowed.');
 if(!c.open)throw new AuthError(409,'This game is no longer open.');
 const now=Date.now();
 const target=action==='approve-guests'||action==='reject-guests'?body.playerId:actorId;
 if(typeof target!=='string'||((action==='approve-guests'||action==='reject-guests')&&!manage))throw new AuthError(403,'Game management permission is required.');
 if(action==='request-guests'){
 const count=body.guestCount;if(!Number.isInteger(count)||Number(count)<1||Number(count)>3)throw new AuthError(400,'Choose between one and three guests.');
 if(canAddGuestsDirectly){
 try{
 const results=await notificationBatch(db,actorId,[
 db.prepare(`UPDATE game_participants SET guest_count=? WHERE game_id=? AND player_id=? AND guest_count=0 AND ${active} AND ${directSql} AND NOT EXISTS(SELECT 1 FROM game_guest_requests WHERE game_id=? AND player_id=? AND status IN ('pending','approved'))`).bind(count,id,actorId,...auth,...directAuth,id,actorId),
 db.prepare(`INSERT INTO game_guest_requests(game_id,player_id,guest_count,status,created_at,updated_at) SELECT ?,?,?,'approved',?,? WHERE ${active} AND ${directSql} AND EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=? AND guest_count=?) ON CONFLICT(game_id,player_id) DO UPDATE SET guest_count=excluded.guest_count,status='approved',created_at=excluded.created_at,updated_at=excluded.updated_at WHERE game_guest_requests.status IN ('cancelled','rejected')`).bind(id,actorId,count,now,now,...auth,...directAuth,id,actorId,count)
 ]) as {meta:{changes:number}}[];
 if(!results[0]?.meta.changes)throw new AuthError(409,'Confirm your own place first, or cancel your existing guest places before adding guests. Your group role may also have changed.');
 }catch(e){if(/capacity|reserved/i.test(String(e)))throw new AuthError(409,'There are not enough available places for these guests.');throw e;}
 return json({ok:true,approved:true});
 }
 const result=await notificationRun(db,actorId,db.prepare(`INSERT INTO game_guest_requests(game_id,player_id,guest_count,status,created_at,updated_at) SELECT ?,?,?,'pending',?,? WHERE ${active} AND EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=? AND guest_count=0) AND ?<(SELECT COALESCE(event_capacity,capacity) FROM games WHERE id=?) ON CONFLICT(game_id,player_id) DO UPDATE SET guest_count=excluded.guest_count,status='pending',created_at=excluded.created_at,updated_at=excluded.updated_at WHERE game_guest_requests.status IN ('cancelled','rejected')`).bind(id,actorId,count,now,now,...auth,id,actorId,count,id));
 if(!result.meta.changes)throw new AuthError(409,'Join the game first, or cancel your existing guest request before changing it.');
 }else if(action==='cancel-guests'){
 await notificationBatch(db,actorId,[db.prepare(`UPDATE game_participants SET guest_count=0 WHERE game_id=? AND player_id=? AND ${active}`).bind(id,actorId,...auth),db.prepare(`UPDATE game_guest_requests SET status='cancelled',updated_at=? WHERE game_id=? AND player_id=? AND status IN ('pending','approved') AND ${active}`).bind(now,id,actorId,...auth)]);
 }else if(action==='approve-guests'){
 try{await notificationBatch(db,actorId,[db.prepare(`UPDATE game_participants SET guest_count=(SELECT guest_count FROM game_guest_requests WHERE game_id=? AND player_id=? AND status='pending') WHERE game_id=? AND player_id=? AND ${active} AND EXISTS(SELECT 1 FROM game_guest_requests WHERE game_id=? AND player_id=? AND status='pending')`).bind(id,target,id,target,...auth,id,target),db.prepare(`UPDATE game_guest_requests SET status='approved',updated_at=? WHERE game_id=? AND player_id=? AND status='pending' AND ${active} AND EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=? AND gp.player_id=? AND gp.guest_count=game_guest_requests.guest_count)`).bind(now,id,target,...auth,id,target)]);}catch(e){if(String(e).includes('capacity'))throw new AuthError(409,'There are not enough places for this guest request.');throw e;}
 }else await notificationRun(db,actorId,db.prepare(`UPDATE game_guest_requests SET status='rejected',updated_at=? WHERE game_id=? AND player_id=? AND status='pending' AND ${active}`).bind(now,id,target,...auth));
 return json({ok:true});
}
