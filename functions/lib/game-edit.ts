import {AuthError,json,type AuthDatabase} from './auth';
import {notificationBatch} from './notification-action';

type GameEditRow={id:string;visibility:string;organizer_id:string;capacity:number;format:string;court_count:number;version:number};

// Group-game offers are honored first. Remaining group waitlist players use
// request-time FIFO. Standalone requests always require individual approval.
// Guests remain attached to their player and occupy their full count.
const planSql=`WITH current_game AS(SELECT g.*,? AS next_capacity,? AS clock FROM games g WHERE g.id=?),
 eligible AS(
  SELECT q.*,p.display_name AS displayName,
   ROW_NUMBER() OVER(PARTITION BY q.player_id ORDER BY q.priority,q.created_at,q.source) AS duplicate_rank,
   EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=q.game_id AND r.player_id=q.player_id AND r.status='pending') AS had_request
  FROM game_waiting_candidates q JOIN current_game g ON g.id=q.game_id JOIN players p ON p.id=q.player_id
  WHERE p.status='active' AND trim(p.display_name)!='' AND q.player_id!=g.organizer_id
   AND NOT EXISTS(SELECT 1 FROM game_participants cp WHERE cp.game_id=g.id AND cp.player_id=q.player_id)
   AND NOT EXISTS(SELECT 1 FROM player_blocks b WHERE (b.blocker_id=g.organizer_id AND b.blocked_id=q.player_id) OR (b.blocker_id=q.player_id AND b.blocked_id=g.organizer_id))
   AND NOT EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=q.player_id AND r.status IN ('removed','rejected'))
   AND (g.visibility!='group' OR (q.source='waitlist' AND (q.priority!=0 OR q.offer_expires_at>g.clock)))
   AND (g.visibility!='group' OR EXISTS(SELECT 1 FROM tennis_groups t WHERE t.id=g.group_id AND t.status='active' AND
     EXISTS(SELECT 1 FROM group_memberships gm WHERE gm.group_id=t.id AND gm.player_id=q.player_id AND gm.status='active')))
 ),ranked AS(SELECT *,ROW_NUMBER() OVER(ORDER BY created_at,player_id) AS position FROM eligible WHERE duplicate_rank=1)
 SELECT player_id AS playerId,displayName,position,priority,had_request,
  position<=MAX(0,(SELECT next_capacity-(SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=current_game.id) FROM current_game)) AS willConfirm
 FROM ranked ORDER BY position`;

const demotionSql=`WITH current_game AS(SELECT ? AS next_capacity,? AS game_id),
 reservations AS(SELECT COUNT(*) AS n FROM game_waitlist WHERE game_id=(SELECT game_id FROM current_game) AND status='offered' AND offer_expires_at>?),
 occupancy AS(SELECT COALESCE(SUM(1+guest_count),0) AS total FROM game_participants WHERE game_id=(SELECT game_id FROM current_game)),
 parties AS(SELECT gp.player_id,gp.joined_at,1+gp.guest_count AS party,p.display_name AS displayName FROM game_participants gp JOIN games g ON g.id=gp.game_id JOIN players p ON p.id=gp.player_id WHERE gp.game_id=(SELECT game_id FROM current_game) AND gp.player_id!=g.organizer_id),
 ranked AS(SELECT *,SUM(party) OVER(ORDER BY joined_at DESC,player_id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS displaced, (SELECT total FROM occupancy) AS total FROM parties)
 SELECT player_id AS playerId,displayName,joined_at AS joinedAt,party AS partySize FROM ranked
 WHERE displaced-party<MAX(0,total+COALESCE((SELECT n FROM reservations),0)-(SELECT next_capacity FROM current_game)) ORDER BY joined_at DESC,player_id DESC`;

export async function editGame(db:AuthDatabase,game:GameEditRow,actor:string,body:Record<string,unknown>,active:string,auth:unknown[],preview=false){
 const allowed=['title','notes','version','format','courtCount','capacity','fillWaiting'];
 if(Object.keys(body).some(k=>!allowed.includes(k)))throw new AuthError(400,'Choose game settings from the available fields.');
 const format=body.format??game.format,courts=body.courtCount??game.court_count,capacity=body.capacity??game.capacity;
 if(!['singles','doubles'].includes(String(format))||!Number.isInteger(courts)||Number(courts)<1||Number(courts)>16||!Number.isInteger(capacity)||Number(capacity)<Number(courts)*(format==='singles'?2:4)||Number(capacity)>128)throw new AuthError(400,'Choose 1-16 courts and a total capacity from the planned court places up to 128.');
 if(!Number.isInteger(body.version)||body.version!==game.version)throw new AuthError(409,'Game changed. Refresh before editing.');
 if(body.fillWaiting!==undefined&&typeof body.fillWaiting!=='boolean')throw new AuthError(400,'Choose whether to confirm waiting players.');
 const now=Date.now();
 const totals=await db.prepare(`SELECT (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=?) AS confirmed,(SELECT COUNT(*) FROM game_waitlist WHERE game_id=? AND status='offered' AND offer_expires_at>?) AS reserved`).bind(game.id,game.id,now).first<{confirmed:number;reserved:number}>();
 let demoted:{playerId:string;displayName:string;joinedAt:number;partySize:number}[]=[];
 try{if(Number(capacity)<game.capacity)demoted=(await db.prepare(demotionSql).bind(capacity,game.id,now).all()).results as typeof demoted;}catch(e){console.error('demotion preview failed',e);throw e;}
 const hostRow=await db.prepare('SELECT COALESCE(1+guest_count,1) AS n FROM game_participants WHERE game_id=? AND player_id=?').bind(game.id,game.organizer_id).first<{n:number}>();
 const hostPlaces=Number(hostRow?.n??1);
 if(Number(capacity)<hostPlaces+(totals?.reserved??0))throw new AuthError(409,'Capacity must cover the host, the host’s guests and reserved group offers.');
 if(preview){const candidates=game.visibility==='group'&&Number(capacity)>game.capacity?(await db.prepare(planSql).bind(capacity,now,game.id).all()).results:[];return json({confirmedPlaces:totals?.confirmed??0,reservedPlaces:totals?.reserved??0,capacity,candidates,demoted});}
 if(typeof body.title!=='string'||!body.title.trim()||body.title.length>80||typeof body.notes!=='string'||body.notes.length>1000)throw new AuthError(400,'Enter a title up to 80 characters and notes up to 1000 characters.');
 // Group waitlist members take newly added places automatically in FIFO order.
 // Standalone approval is per-player and host-controlled, so ignore fillWaiting
 // for public/unlisted games, including requests from older or modified clients.
 const job=crypto.randomUUID(),fill=game.visibility==='group'&&(Number(capacity)>game.capacity||demoted.length>0);
 const hasJob='EXISTS(SELECT 1 FROM game_edit_jobs WHERE id=?)';
 try{
  const results=await notificationBatch(db,actor,[
   db.prepare(`INSERT INTO game_edit_jobs(id,game_id,actor_id,created_at,old_capacity,new_capacity,fill_waiting) SELECT ?,g.id,?,?,COALESCE(g.event_capacity,g.capacity),?,? FROM games g WHERE g.id=? AND g.version=? AND g.status='scheduled' AND g.starts_at>? AND g.visibility=? AND (g.organizer_id=? OR ?=1) AND ${active} AND (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=g.id)=? AND (SELECT COUNT(*) FROM game_waitlist WHERE game_id=g.id AND status='offered' AND offer_expires_at>?)=?`).bind(job,actor,now,capacity,fill?1:0,game.id,body.version,now,game.visibility,actor,game.visibility==='group'?1:0,...auth,totals?.confirmed??0,now,totals?.reserved??0),
   db.prepare(`INSERT INTO game_capacity_fill(job_id,player_id,position,had_request) SELECT ?,playerId,-ROW_NUMBER() OVER(ORDER BY joinedAt DESC,playerId DESC),0 FROM (${demotionSql}) WHERE EXISTS(SELECT 1 FROM game_edit_jobs WHERE id=?)`).bind(job,capacity,game.id,now,job),
   db.prepare(`INSERT INTO game_waitlist(game_id,player_id,status,created_at) SELECT ?,f.player_id,'waiting',? FROM game_capacity_fill f JOIN games g ON g.id=? WHERE f.job_id=? AND f.position<0 AND g.visibility='group' ON CONFLICT(game_id,player_id) DO UPDATE SET status='waiting',created_at=excluded.created_at,offered_at=NULL,offer_expires_at=NULL,read_at=NULL`).bind(game.id,now,game.id,job),
   db.prepare(`DELETE FROM game_join_requests WHERE game_id=? AND player_id IN(SELECT f.player_id FROM game_capacity_fill f JOIN games g ON g.id=? WHERE f.job_id=? AND f.position<0 AND g.visibility!='group') AND status!='pending'`).bind(game.id,game.id,job),
   db.prepare(`INSERT INTO game_join_requests(game_id,player_id,status,created_at,updated_at) SELECT ?,f.player_id,'pending',?,? FROM game_capacity_fill f JOIN game_participants gp ON gp.game_id=? AND gp.player_id=f.player_id JOIN games g ON g.id=gp.game_id WHERE f.job_id=? AND f.position<0 AND g.visibility!='group' ON CONFLICT(game_id,player_id) DO UPDATE SET status='pending',created_at=excluded.created_at,updated_at=excluded.updated_at`).bind(game.id,now,now,game.id,job),
   db.prepare(`DELETE FROM game_participants WHERE game_id=? AND player_id IN(SELECT player_id FROM game_capacity_fill WHERE job_id=? AND position<0)`).bind(game.id,job),
   db.prepare(`INSERT INTO game_chat_capacity_access(game_id,player_id,granted_at) SELECT ?,player_id,? FROM game_capacity_fill WHERE job_id=? AND position<0 ON CONFLICT(game_id,player_id) DO UPDATE SET granted_at=excluded.granted_at`).bind(game.id,now,job),
   // Validate the live occupancy after demotions. This only uses columns from
   // the base capacity-edit migration, so capacity reduction stays atomic even
   // when optional notification migrations have not been applied yet.
   db.prepare(`UPDATE games SET title=?,notes=?,format=?,capacity=?,court_count=?,event_capacity=?,version=version+1,updated_at=? WHERE id=? AND ${hasJob} AND ? >= (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=games.id)+(SELECT COUNT(*) FROM game_waitlist WHERE game_id=games.id AND status='offered' AND offer_expires_at>?)`).bind(body.title.trim(),body.notes,format,format==='singles'?2:4,courts,capacity,now,game.id,job,capacity,now),
   // Preview may still have the older notification CHECK constraint. Keep the
   // capacity edit working there, and emit the new notice once migration 0039
   // has installed support for the waitlisted kind.
   db.prepare(`INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at) SELECT lower(hex(randomblob(16))),?,f.player_id,?,'waitlisted','',0,? FROM game_capacity_fill f WHERE f.job_id=? AND f.position<0 AND EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='game_notifications' AND sql LIKE '%waitlisted%')`).bind(game.id,actor,now,job),
   db.prepare(`INSERT INTO game_capacity_fill(job_id,player_id,position,had_request) SELECT ?,playerId,position,had_request FROM (${planSql}) WHERE willConfirm=1 AND EXISTS(SELECT 1 FROM game_edit_jobs j JOIN games g ON g.id=j.game_id WHERE j.id=? AND j.fill_waiting=1 AND g.version=? AND g.event_capacity=j.new_capacity)`).bind(job,capacity,now,game.id,job,Number(body.version)+1),
   db.prepare(`DELETE FROM game_waitlist WHERE game_id=? AND player_id IN(SELECT player_id FROM game_capacity_fill WHERE job_id=? AND position>0)`).bind(game.id,job),
   db.prepare(`INSERT INTO game_participants(game_id,player_id,joined_at) SELECT ?,f.player_id,? FROM game_capacity_fill f WHERE f.job_id=? AND f.position>0 ORDER BY f.position`).bind(game.id,now,job),
   db.prepare(`UPDATE game_join_requests SET status='approved',updated_at=? WHERE game_id=? AND status='pending' AND player_id IN(SELECT player_id FROM game_capacity_fill WHERE job_id=? AND position>0) AND EXISTS(SELECT 1 FROM game_participants cp WHERE cp.game_id=game_join_requests.game_id AND cp.player_id=game_join_requests.player_id)`).bind(now,game.id,job),
   db.prepare(`INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at) SELECT lower(hex(randomblob(16))),?,f.player_id,?,'confirmed','',0,? FROM game_capacity_fill f WHERE f.job_id=? AND f.position>0 AND f.had_request=0 AND f.player_id!=? AND EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='game_notifications' AND sql LIKE '%confirmed%')`).bind(game.id,actor,now,job,actor),
   db.prepare('DELETE FROM game_edit_jobs WHERE id=?').bind(job)
  ]) as {meta:{changes:number}}[];
  if(!results[0]?.meta.changes||!results[7]?.meta.changes)throw new AuthError(409,'Game or permissions changed. Refresh before saving.');
 }catch(e){if(e instanceof AuthError)throw e;if(/capacity|reserved|group membership/i.test(String(e)))throw new AuthError(409,'Places or eligibility changed. Refresh and try again; no partial changes were saved.');throw e;}
 return json({ok:true});
}
