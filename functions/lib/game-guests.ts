import {AuthError,json,type AuthDatabase} from './auth';
type Context={db:AuthDatabase;id:string;actorId:string;organizerId:string;manage:boolean;open:boolean;active:string;auth:unknown[]};
export async function guestAction(request:Request,action:string,c:Context,body:Record<string,unknown>={}):Promise<Response|null>{
 if(!['guests','request-guests','cancel-guests','approve-guests','reject-guests'].includes(action))return null;
 const {db,id,actorId,organizerId,manage}=c;const active=`(${c.active}) AND EXISTS(SELECT 1 FROM games WHERE id=? AND status='scheduled' AND starts_at>?)`;const auth=[...c.auth,id,Date.now()];
 if(action==='guests'&&request.method==='GET'){
 const own=await db.prepare('SELECT gp.guest_count AS confirmed,r.guest_count AS requested,r.status FROM game_participants gp LEFT JOIN game_guest_requests r ON r.game_id=gp.game_id AND r.player_id=gp.player_id WHERE gp.game_id=? AND gp.player_id=?').bind(id,actorId).first();
 const requests=manage?(await db.prepare("SELECT r.player_id AS playerId,p.display_name AS displayName,r.guest_count AS guestCount FROM game_guest_requests r JOIN players p ON p.id=r.player_id WHERE r.game_id=? AND r.status='pending' AND p.status='active' ORDER BY r.created_at,r.player_id").bind(id).all()).results:[];
 return json({own,requests,isHost:actorId===organizerId});
 }
 if(request.method!=='POST')throw new AuthError(405,'Method not allowed.');
 if(!c.open)throw new AuthError(409,'This game is no longer open.');
 const now=Date.now();
 const target=action==='approve-guests'||action==='reject-guests'?body.playerId:actorId;
 if(typeof target!=='string'||((action==='approve-guests'||action==='reject-guests')&&!manage))throw new AuthError(403,'Game management permission is required.');
 if(action==='request-guests'){
 if(actorId===organizerId)throw new AuthError(409,'Guest requests are for participating players.');
 const count=body.guestCount;if(!Number.isInteger(count)||Number(count)<1||Number(count)>3)throw new AuthError(400,'Choose between one and three guests.');
 const result=await db.prepare(`INSERT INTO game_guest_requests(game_id,player_id,guest_count,status,created_at,updated_at) SELECT ?,?,?,'pending',?,? WHERE ${active} AND EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=? AND guest_count=0) AND ?<(SELECT COALESCE(event_capacity,capacity) FROM games WHERE id=?) ON CONFLICT(game_id,player_id) DO UPDATE SET guest_count=excluded.guest_count,status='pending',created_at=excluded.created_at,updated_at=excluded.updated_at WHERE game_guest_requests.status IN ('cancelled','rejected')`).bind(id,actorId,count,now,now,...auth,id,actorId,count,id).run();
 if(!result.meta.changes)throw new AuthError(409,'Join the game first, or cancel your existing guest request before changing it.');
 }else if(action==='cancel-guests'){
 await db.batch([db.prepare(`UPDATE game_participants SET guest_count=0 WHERE game_id=? AND player_id=? AND ${active}`).bind(id,actorId,...auth),db.prepare(`UPDATE game_guest_requests SET status='cancelled',updated_at=? WHERE game_id=? AND player_id=? AND status IN ('pending','approved') AND ${active}`).bind(now,id,actorId,...auth)]);
 }else if(action==='approve-guests'){
 try{await db.batch([db.prepare(`UPDATE game_participants SET guest_count=(SELECT guest_count FROM game_guest_requests WHERE game_id=? AND player_id=? AND status='pending') WHERE game_id=? AND player_id=? AND ${active} AND EXISTS(SELECT 1 FROM game_guest_requests WHERE game_id=? AND player_id=? AND status='pending')`).bind(id,target,id,target,...auth,id,target),db.prepare(`UPDATE game_guest_requests SET status='approved',updated_at=? WHERE game_id=? AND player_id=? AND status='pending' AND ${active} AND EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=? AND gp.player_id=? AND gp.guest_count=game_guest_requests.guest_count)`).bind(now,id,target,...auth,id,target)]);}catch(e){if(String(e).includes('capacity'))throw new AuthError(409,'There are not enough places for this guest request.');throw e;}
 }else await db.prepare(`UPDATE game_guest_requests SET status='rejected',updated_at=? WHERE game_id=? AND player_id=? AND status='pending' AND ${active}`).bind(now,id,target,...auth).run();
 return json({ok:true});
}
