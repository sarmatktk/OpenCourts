import type {AuthDatabase} from './auth';

const MINUTE = 60_000;
const reminderKinds = [
 {kind:'game_reminder_24h', lead:24*60*MINUTE},
 {kind:'game_reminder_3h', lead:3*60*MINUTE},
] as const;

/**
 * Queue generic push events for confirmed players as a game approaches its start.
 * The minute worker has a bounded catch-up window; old reminders are never sent late.
 * A changed start time gets a new source ID, while delivery rechecks the captured start.
 */
export async function enqueueGameReminders(db:AuthDatabase,now=Date.now()){
 let queued=0;
 for(const reminder of reminderKinds){
  const result=await db.prepare(`INSERT OR IGNORE INTO notification_events
   (id,source,source_id,recipient_id,category,kind,entity_type,entity_id,created_at,expires_at)
   SELECT lower(hex(randomblob(16))),'game_reminders',g.id||':'||CAST(g.starts_at AS TEXT)||':'||?,gp.player_id,
    'games',?,'game',g.id,?,g.starts_at
   FROM games g JOIN game_participants gp ON gp.game_id=g.id JOIN players p ON p.id=gp.player_id
   WHERE g.status='scheduled' AND p.status='active' AND g.starts_at>?
    AND g.starts_at<=(?+?) AND g.starts_at>(?+?-?) AND g.created_at<(g.starts_at-?)
    AND NOT EXISTS(SELECT 1 FROM notification_events e WHERE e.source='game_reminders'
     AND e.source_id=g.id||':'||CAST(g.starts_at AS TEXT)||':'||? AND e.recipient_id=gp.player_id)
   ORDER BY g.starts_at,g.id,gp.player_id LIMIT 500`).bind(
    reminder.kind,reminder.kind,now,now,now,reminder.lead,now,reminder.lead,30*MINUTE,reminder.lead,
    reminder.kind,
   ).run();
  queued+=result.meta.changes;
  await db.prepare(`INSERT OR IGNORE INTO game_reminder_notifications
   (id,game_id,recipient_id,starts_at,kind,created_at)
   SELECT lower(hex(randomblob(16))),g.id,gp.player_id,g.starts_at,?,?
   FROM games g JOIN game_participants gp ON gp.game_id=g.id JOIN players p ON p.id=gp.player_id
   WHERE g.status='scheduled' AND p.status='active' AND g.starts_at>?
    AND g.starts_at<=(?+?) AND g.starts_at>(?+?-?) AND g.created_at<(g.starts_at-?)
   ORDER BY g.starts_at,g.id,gp.player_id LIMIT 500`).bind(
    reminder.kind,now,now,now,reminder.lead,now,reminder.lead,30*MINUTE,reminder.lead,
   ).run();
 }
 return queued;
}

export function gameReminderLead(kind:string){
 return reminderKinds.find(reminder=>reminder.kind===kind)?.lead??null;
}
