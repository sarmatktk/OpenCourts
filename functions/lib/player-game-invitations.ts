import {groupEventViewSql} from './group-game-access';
import {unlistedAccessSql} from './game-sharing';
import {AuthError,hashToken,type AuthDatabase} from './auth';

// Shared eligibility for the picker and atomic send; group games require current membership for both players.
const eligible=`FROM games g JOIN players host ON host.id=g.organizer_id
 JOIN players recipient ON recipient.id=?
 WHERE g.organizer_id=? AND (g.visibility IN ('public','unlisted') OR (g.visibility='group' AND ${groupEventViewSql('g','recipient.id')} AND ${groupEventViewSql('g','g.organizer_id')})) AND g.status='scheduled'
 AND g.starts_at>? AND host.status='active' AND recipient.status='active'
 AND recipient.discoverable=1 AND recipient.id!=g.organizer_id
 AND NOT EXISTS(SELECT 1 FROM player_blocks b WHERE
 (b.blocker_id=g.organizer_id AND b.blocked_id=recipient.id)
 OR (b.blocker_id=recipient.id AND b.blocked_id=g.organizer_id))
 AND NOT EXISTS(SELECT 1 FROM game_participants p WHERE p.game_id=g.id AND p.player_id=recipient.id)
 AND NOT EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=recipient.id AND r.status IN ('pending','approved','removed'))
 AND (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants p WHERE p.game_id=g.id)<COALESCE(g.event_capacity,g.capacity)`;

export async function invitableGames(db:AuthDatabase,senderId:string,recipientId:string){
 if(senderId===recipientId)return []; 
 return (await db.prepare(`SELECT g.id,g.title,g.starts_at AS startsAt,g.time_zone AS timeZone,
 EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=g.id AND i.recipient_id=recipient.id AND NOT EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=recipient.id AND r.status='rejected' AND i.created_at<=r.updated_at)) AS invited
 ${eligible} AND (g.visibility='public' OR (g.visibility='group' AND ${groupEventViewSql('g','recipient.id')} AND ${groupEventViewSql('g','g.organizer_id')})) AND ((SELECT COUNT(*) FROM player_game_invitations i WHERE i.game_id=g.id)<10 OR EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=g.id AND i.recipient_id=recipient.id)) ORDER BY g.starts_at,g.id LIMIT 50`).bind(recipientId,senderId,Date.now()).all()).results;
}

export async function invitePlayer(db:AuthDatabase,senderId:string,recipientId:string,gameId:string){
 if(senderId===recipientId)throw new AuthError(400,'You cannot invite yourself. You already host this game.');
 const now=Date.now();
 const game=await db.prepare(`SELECT g.id,g.visibility,g.starts_at AS startsAt ${eligible} AND g.id=?`).bind(recipientId,senderId,now,gameId).first<{id:string;visibility:string;startsAt:number}>();
 if(!game)throw new AuthError(404,'This invitation is unavailable. Choose an open game and an available player.');
 const existing=await db.prepare('SELECT id,created_at AS createdAt FROM player_game_invitations WHERE game_id=? AND recipient_id=?').bind(gameId,recipientId).first<{id:string;createdAt:number}>();
 const previous=await db.prepare("SELECT status,updated_at AS updatedAt FROM game_join_requests WHERE game_id=? AND player_id=? AND status='rejected'").bind(gameId,recipientId).first<{status:string;updatedAt:number}>();
 if(existing&&(!previous||previous.status!=='rejected'||existing.createdAt>previous.updatedAt))return;
 if(existing&&previous){
  const limits=await db.prepare(`SELECT (SELECT COUNT(*) FROM player_game_invitations WHERE sender_id=? AND created_at>?) AS sent,(SELECT COUNT(*) FROM player_game_invitations WHERE recipient_id=? AND created_at>?) AS received`).bind(senderId,now-3600000,recipientId,now-86400000).first<{sent:number;received:number}>();
  if((limits?.sent??0)>=20||(limits?.received??0)>=30)throw new AuthError(429,'Invitation rate limit reached. Try again later.');
  const createdAt=Math.max(now,previous.updatedAt+1),linkId=crypto.randomUUID();
  const statements=[db.prepare('UPDATE player_game_invitations SET created_at=?,read_at=NULL WHERE id=?').bind(createdAt,existing.id)];
  if(game.visibility==='unlisted'){
   statements.push(db.prepare('INSERT INTO game_invitation_links(id,game_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)').bind(linkId,gameId,await hashToken(crypto.randomUUID()+crypto.randomUUID()),Math.min(game.startsAt,now+7*86400000),now));
   statements.push(db.prepare('INSERT INTO game_invitation_access(link_id,player_id,created_at) VALUES (?,?,?)').bind(linkId,recipientId,now));
  }
  await db.batch(statements);
  return;
 }
 if(await db.prepare('SELECT 1 FROM player_game_invitations WHERE game_id=? GROUP BY game_id HAVING COUNT(*)>=10').bind(gameId).first())throw new AuthError(429,'This game has reached its limit of 10 invited players.');
 const invitationId=crypto.randomUUID();
 const insert=db.prepare(`INSERT INTO player_game_invitations(id,game_id,sender_id,recipient_id,created_at)
 SELECT ?,g.id,g.organizer_id,recipient.id,? ${eligible} AND g.id=?
 AND (SELECT COUNT(*) FROM player_game_invitations WHERE game_id=g.id)<10
 AND (SELECT COUNT(*) FROM player_game_invitations WHERE sender_id=g.organizer_id AND created_at>?)<20
 AND (SELECT COUNT(*) FROM player_game_invitations WHERE recipient_id=recipient.id AND created_at>?)<30
 ON CONFLICT(game_id,recipient_id) DO NOTHING`).bind(invitationId,now,recipientId,senderId,now,gameId,now-3600000,now-86400000);
 const statements=[insert];
 if(game.visibility==='unlisted'){
  statements.push(db.prepare(`INSERT INTO game_invitation_links(id,game_id,token_hash,expires_at,created_at) SELECT id,game_id,?,?,? FROM player_game_invitations WHERE id=?`).bind(await hashToken(crypto.randomUUID()+crypto.randomUUID()),Math.min(game.startsAt,now+7*86400000),now,invitationId));
  statements.push(db.prepare(`INSERT INTO game_invitation_access(link_id,player_id,created_at) SELECT id,recipient_id,? FROM player_game_invitations WHERE id=?`).bind(now,invitationId));
 }
 const [result]=await db.batch(statements) as {meta:{changes:number}}[];
 if(!result.meta.changes)throw new AuthError(429,'Invitation could not be sent. Games allow up to 10 invited players. Refresh availability or try again later.');
}

export async function invitationNotifications(db:AuthDatabase,recipientId:string){
 const rows=(await db.prepare(`SELECT 'invite:'||i.id AS id,g.id AS gameId,g.title AS gameTitle,
 host.display_name AS displayName,'game_invited' AS kind,i.created_at AS createdAt,i.read_at AS readAt,
 CASE WHEN g.status='cancelled' THEN 'cancelled'
 WHEN g.ends_at<=? THEN CASE WHEN EXISTS(SELECT 1 FROM game_participants p WHERE p.game_id=g.id AND p.player_id=i.recipient_id) THEN 'completed' ELSE 'expired' END
 WHEN g.starts_at<=? AND NOT EXISTS(SELECT 1 FROM game_participants p WHERE p.game_id=g.id AND p.player_id=i.recipient_id) THEN 'expired'
 WHEN EXISTS(SELECT 1 FROM game_participants p WHERE p.game_id=g.id AND p.player_id=i.recipient_id) THEN 'joined'
 WHEN EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=i.recipient_id AND r.status='pending') THEN 'requested'
 WHEN EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=i.recipient_id AND (r.status IN ('approved','removed') OR (r.status='rejected' AND i.created_at<=r.updated_at)))
 OR (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants p WHERE p.game_id=g.id)>=COALESCE(g.event_capacity,g.capacity) THEN 'closed'
 ELSE 'available' END AS invitationStatus
 FROM player_game_invitations i JOIN games g ON g.id=i.game_id JOIN players host ON host.id=i.sender_id
 WHERE i.recipient_id=? AND (g.visibility='public' OR (g.visibility='group' AND ${groupEventViewSql('g','i.recipient_id')}) OR (g.visibility='unlisted' AND ${unlistedAccessSql('g','i.recipient_id')})) AND g.organizer_id=i.sender_id AND host.status='active'
 AND NOT EXISTS(SELECT 1 FROM player_blocks b WHERE (b.blocker_id=i.sender_id AND b.blocked_id=i.recipient_id)
 OR (b.blocker_id=i.recipient_id AND b.blocked_id=i.sender_id))
 ORDER BY i.created_at DESC,i.id LIMIT 100`).bind(Date.now(),Date.now(),recipientId).all<Record<string,unknown>>()).results;
 return rows.map((n):Record<string,unknown>=>({...n,archived:['expired','completed','cancelled'].includes(String(n.invitationStatus))}));
}

export async function gameInvitees(db:AuthDatabase,senderId:string,gameId:string,q:string,terms:string[]=[q]){
 const game=await db.prepare(`SELECT g.id FROM games g JOIN players host ON host.id=g.organizer_id
 WHERE g.id=? AND g.organizer_id=? AND host.status='active'
 AND (g.visibility IN ('public','unlisted') OR (g.visibility='group' AND ${groupEventViewSql('g','g.organizer_id')}))
 AND g.status='scheduled' AND g.starts_at>?`).bind(gameId,senderId,Date.now()).first();
 if(!game)throw new AuthError(404,'Game invitations unavailable.');
 const count=await db.prepare('SELECT COUNT(*) AS count FROM player_game_invitations WHERE game_id=?').bind(gameId).first<{count:number}>();
 const scope=eligible.replace('recipient.id=?','recipient.id=p.id');
 const players=(await db.prepare(`SELECT p.id,p.display_name AS displayName,p.general_location AS generalLocation,
 EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=? AND i.recipient_id=p.id AND NOT EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=? AND r.player_id=p.id AND r.status='rejected' AND i.created_at<=r.updated_at)) AS invited
 FROM players p WHERE (instr(lower(p.display_name),lower(?))>0 OR ${terms.map(()=>"instr(lower(p.general_location),lower(?))>0").join(' OR ')})
 AND EXISTS(SELECT 1 ${scope} AND g.id=?) ORDER BY p.display_name,p.id LIMIT 25`).bind(gameId,gameId,q,...terms,senderId,Date.now(),gameId).all()).results;
 return {players,invitationCount:count?.count??0};
}
