import type {AuthDatabase} from './auth';

export const CHAT_DAYS = 30 * 86400000;

export async function chatSchemaReady(db:AuthDatabase){return !!await db.prepare("SELECT 1 FROM sqlite_master WHERE type='view' AND name='game_chat_context'").first();}

// Group roles are evaluated live; no attendance record or promotion copy is needed.
export function seriesChatStaffSql(g:string,p:string){return `(${g}.organizer_id=${p} OR EXISTS(
 SELECT 1 FROM tennis_groups st JOIN group_memberships staff ON staff.group_id=st.id
 WHERE st.id=${g}.group_id AND st.status='active' AND staff.player_id=${p} AND staff.status='active'
 AND (st.owner_id=${p} OR COALESCE(staff.assigned_role,staff.role) IN ('coowner','organizer'))
))`;}
// Every caller uses source-owned aliases. Reading or muting never renews activity.
export function seriesChatAccessSql(g:string,p:string,now:string){return `(
 ${g}.series_id IS NOT NULL AND ${g}.route_game_id IS NOT NULL
 AND EXISTS(SELECT 1 FROM tennis_groups t JOIN group_memberships gm ON gm.group_id=t.id
   WHERE t.id=${g}.group_id AND t.status='active' AND gm.player_id=${p} AND gm.status='active')
 AND NOT EXISTS(SELECT 1 FROM player_blocks b WHERE (b.blocker_id=${p} AND b.blocked_id=${g}.organizer_id) OR (b.blocker_id=${g}.organizer_id AND b.blocked_id=${p}))
 AND (${seriesChatStaffSql(g,p)} OR EXISTS(SELECT 1 FROM series_chat_members sm WHERE sm.series_id=${g}.series_id AND sm.player_id=${p} AND sm.active=1 AND (
   sm.joined_at>${now}-2592000000 OR sm.last_message_at>${now}-2592000000
   OR EXISTS(SELECT 1 FROM games sg JOIN game_participants cp ON cp.game_id=sg.id
     WHERE sg.series_id=${g}.series_id AND sg.group_id=${g}.group_id AND sg.visibility='group'
     AND sg.status='scheduled' AND cp.player_id=${p} AND sg.ends_at>${now}-2592000000)
   OR EXISTS(SELECT 1 FROM games sg JOIN game_chat_capacity_access caa ON caa.game_id=sg.id
     WHERE sg.series_id=${g}.series_id AND sg.group_id=${g}.group_id AND sg.visibility='group'
     AND caa.player_id=${p})
 )))
 )`;}

export async function maintainSeriesChat(db:AuthDatabase,now:number,seriesId:string|null=null){
 // Revocation is also enforced by the access predicate, even before this job runs.
 await db.batch([
  db.prepare(`UPDATE game_chat_rooms SET expires_at=(SELECT CASE WHEN EXISTS(SELECT 1 FROM tennis_groups t WHERE t.id=g.group_id AND t.status='active') THEN MAX(g.chat_expiry,?+2592000000) ELSE g.chat_expiry END FROM game_chat_context g WHERE g.id=game_chat_rooms.game_id)
   WHERE game_id LIKE 'series:%' AND (? IS NULL OR game_id='series:'||?) AND EXISTS(SELECT 1 FROM game_chat_context g WHERE g.id=game_chat_rooms.game_id AND g.route_game_id IS NOT NULL)`).bind(now,seriesId,seriesId),
  db.prepare(`UPDATE series_chat_members SET active=0,left_at=?,left_reason=CASE WHEN EXISTS(SELECT 1 FROM series_chat_threads t JOIN tennis_groups tg ON tg.id=t.group_id JOIN group_memberships gm ON gm.group_id=t.group_id WHERE t.id=series_chat_members.series_id AND tg.status='active' AND gm.player_id=series_chat_members.player_id AND gm.status='active') THEN 'inactive' ELSE 'group' END
   WHERE active=1 AND (? IS NULL OR series_id=?) AND (
    NOT EXISTS(SELECT 1 FROM series_chat_threads t JOIN tennis_groups tg ON tg.id=t.group_id JOIN group_memberships gm ON gm.group_id=t.group_id WHERE t.id=series_chat_members.series_id AND tg.status='active' AND gm.player_id=series_chat_members.player_id AND gm.status='active')
    OR (joined_at<=?-2592000000 AND last_message_at<=?-2592000000
     AND NOT EXISTS(SELECT 1 FROM game_chat_context g WHERE g.series_id=series_chat_members.series_id AND ${seriesChatStaffSql('g','series_chat_members.player_id')})
     AND NOT EXISTS(SELECT 1 FROM games sg JOIN game_participants cp ON cp.game_id=sg.id WHERE sg.series_id=series_chat_members.series_id AND cp.player_id=series_chat_members.player_id AND sg.status='scheduled' AND sg.ends_at>?-2592000000)
     AND NOT EXISTS(SELECT 1 FROM games sg JOIN game_chat_capacity_access caa ON caa.game_id=sg.id WHERE sg.series_id=series_chat_members.series_id AND caa.player_id=series_chat_members.player_id))
   )`).bind(now,seriesId,seriesId,now,now,now),
  db.prepare(`DELETE FROM game_chat_messages WHERE created_at<=? AND game_id LIKE 'series:%' AND (? IS NULL OR game_id='series:'||?)
   AND game_id IN(SELECT game_id FROM game_chat_rooms WHERE legal_hold=0)`).bind(now-CHAT_DAYS,seriesId,seriesId)
 ]);
}
