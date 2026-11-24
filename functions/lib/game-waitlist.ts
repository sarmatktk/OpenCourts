import {AuthError,json,type AuthDatabase} from './auth';
const eligible=`EXISTS(SELECT 1 FROM games g JOIN tennis_groups t ON t.id=g.group_id JOIN group_memberships m ON m.group_id=t.id JOIN players p ON p.id=m.player_id WHERE g.id=game_waitlist.game_id AND g.visibility='group' AND g.status='scheduled' AND g.starts_at>? AND t.status='active' AND m.player_id=game_waitlist.player_id AND m.status='active' AND p.status='active' AND NOT EXISTS(SELECT 1 FROM player_blocks b WHERE (b.blocker_id=g.organizer_id AND b.blocked_id=p.id) OR (b.blocker_id=p.id AND b.blocked_id=g.organizer_id)) AND NOT EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=p.id AND r.status IN ('rejected','removed')))`;
export async function refreshWaitlist(db:AuthDatabase,id:string){
 const now=Date.now();
 await db.prepare(`DELETE FROM game_waitlist WHERE game_id=? AND (NOT ${eligible} OR EXISTS(SELECT 1 FROM game_participants p WHERE p.game_id=game_waitlist.game_id AND p.player_id=game_waitlist.player_id))`).bind(id,now).run();
 await db.prepare("UPDATE game_waitlist SET status='expired' WHERE game_id=? AND status='offered' AND offer_expires_at<=?").bind(id,now).run();
 // Every promotion rechecks capacity atomically; concurrent requests cannot reserve the same place.
 for(let n=0;n<128;n++){
 const r=await db.prepare(`UPDATE game_waitlist SET status='offered',offered_at=?,offer_expires_at=MIN(?+7200000,(SELECT starts_at FROM games WHERE id=?)),read_at=NULL WHERE game_id=? AND player_id=(SELECT player_id FROM game_waitlist WHERE game_id=? AND status='waiting' ORDER BY created_at,player_id LIMIT 1) AND status='waiting' AND ${eligible} AND (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=?)+(SELECT COUNT(*) FROM game_waitlist WHERE game_id=? AND status='offered' AND offer_expires_at>?)<(SELECT COALESCE(event_capacity,capacity) FROM games WHERE id=?)`).bind(now,now,id,id,id,now,id,id,now,id).run();if(!r.meta.changes)break;
 }
}
export async function waitlistState(db:AuthDatabase,id:string,actor:string){
 await refreshWaitlist(db,id);
 return db.prepare(`SELECT w.status,w.offer_expires_at AS expiresAt,CASE WHEN w.status='waiting' THEN (SELECT COUNT(*) FROM game_waitlist q WHERE q.game_id=w.game_id AND q.status='waiting' AND (q.created_at<w.created_at OR (q.created_at=w.created_at AND q.player_id<=w.player_id))) ELSE NULL END AS position FROM game_waitlist w WHERE game_id=? AND player_id=?`).bind(id,actor).first();
}
export async function waitlistAction(db:AuthDatabase,id:string,actor:string,action:string,active:string,auth:unknown[]){
 const now=Date.now();await refreshWaitlist(db,id);
 if(action==='leave-waitlist'){await db.prepare(`DELETE FROM game_waitlist WHERE game_id=? AND player_id=? AND ${active}`).bind(id,actor,...auth).run();await refreshWaitlist(db,id);return json({ok:true});}
 if(action==='accept-waitlist'){
 const result=await db.batch([db.prepare(`INSERT INTO game_participants(game_id,player_id,joined_at) SELECT ?,?,? WHERE ${active} AND EXISTS(SELECT 1 FROM game_waitlist WHERE game_id=? AND player_id=? AND status='offered' AND offer_expires_at>?) AND NOT EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?)`).bind(id,actor,now,...auth,id,actor,now,id,actor),db.prepare('DELETE FROM game_waitlist WHERE game_id=? AND player_id=? AND EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?)').bind(id,actor,id,actor)]) as {meta:{changes:number}}[];
 if(!result[0].meta.changes)throw new AuthError(409,'This offer expired or is no longer available.');return json({ok:true});
 }
 await db.prepare(`INSERT INTO game_waitlist(game_id,player_id,status,created_at) SELECT ?,?,'waiting',? WHERE ${active} AND EXISTS(SELECT 1 FROM games WHERE id=? AND visibility='group' AND status='scheduled' AND starts_at>? AND organizer_id!=?) AND NOT EXISTS(SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?) AND NOT EXISTS(SELECT 1 FROM game_join_requests WHERE game_id=? AND player_id=? AND status IN ('rejected','removed')) ON CONFLICT(game_id,player_id) DO UPDATE SET status='waiting',created_at=excluded.created_at,offer_expires_at=NULL WHERE game_waitlist.status='expired'`).bind(id,actor,now,...auth,id,now,actor,id,actor,id,actor).run();
 await refreshWaitlist(db,id);return json({ok:true});
}
export async function waitlistNotifications(db:AuthDatabase,actor:string){
 const ids=(await db.prepare("SELECT DISTINCT w.game_id FROM game_waitlist w JOIN games g ON g.id=w.game_id JOIN group_memberships m ON m.group_id=g.group_id WHERE m.player_id=? AND m.status='active' LIMIT 100").bind(actor).all<{game_id:string}>()).results;
 for(const g of ids)await refreshWaitlist(db,g.game_id);
 return (await db.prepare(`SELECT 'wait:'||w.game_id AS id,g.id AS gameId,g.title AS gameTitle,'A place is available' AS displayName,'waitlist_offer' AS kind,w.offered_at AS createdAt,w.read_at AS readAt,w.offer_expires_at AS offerExpiresAt FROM game_waitlist w JOIN games g ON g.id=w.game_id WHERE w.player_id=? AND w.status='offered' AND w.offer_expires_at>? AND ${eligible.replaceAll('game_waitlist.','w.')}`).bind(actor,Date.now(),Date.now()).all<Record<string,unknown>>()).results;
}

export async function myWaitlistedGames(db:AuthDatabase,actor:string){
 const ids=(await db.prepare("SELECT w.game_id FROM game_waitlist w JOIN games g ON g.id=w.game_id JOIN group_memberships m ON m.group_id=g.group_id WHERE w.player_id=? AND m.player_id=? AND m.status='active' AND g.status='scheduled' AND g.starts_at>? ORDER BY g.starts_at LIMIT 100").bind(actor,actor,Date.now()).all<{game_id:string}>()).results;
 for(const g of ids)await refreshWaitlist(db,g.game_id);
 const rows=(await db.prepare(`SELECT g.id,g.title,g.starts_at,g.ends_at,g.time_zone,g.court_name,g.status,0 AS joined,0 AS isOrganizer,'waitlisted' AS section,w.status AS waitlistStatus,w.offer_expires_at AS offerExpiresAt,CASE WHEN w.status='waiting' THEN (SELECT COUNT(*) FROM game_waitlist q WHERE q.game_id=w.game_id AND q.status='waiting' AND (q.created_at<w.created_at OR (q.created_at=w.created_at AND q.player_id<=w.player_id))) ELSE NULL END AS position FROM game_waitlist w JOIN games g ON g.id=w.game_id WHERE w.player_id=? AND w.status IN ('waiting','offered') AND (w.status='waiting' OR w.offer_expires_at>?) AND ${eligible.replaceAll('game_waitlist.','w.')} ORDER BY g.starts_at,g.id LIMIT 100`).bind(actor,Date.now(),Date.now()).all()).results;
 return json({games:rows,nextCursor:null});
}
export async function hostWaitlist(db:AuthDatabase,id:string){
 await refreshWaitlist(db,id);
 return json({players:(await db.prepare("SELECT w.player_id AS id,p.display_name AS displayName,w.status,w.created_at AS requestedAt,w.offer_expires_at AS expiresAt FROM game_waitlist w JOIN players p ON p.id=w.player_id WHERE w.game_id=? AND w.status IN ('waiting','offered') ORDER BY CASE w.status WHEN 'offered' THEN 0 ELSE 1 END,w.created_at,w.player_id LIMIT 200").bind(id).all()).results});
}
