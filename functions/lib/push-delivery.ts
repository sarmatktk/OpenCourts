import {discussionPushTarget,announcementPushTarget} from './group-discussions';
import {chatSchemaReady} from './series-chat';
import {chatPushTarget} from './game-chat';
import {sendPushNotification,rawPayload,WebPushError} from '@mmmike/web-push/send';
import {type AuthDatabase} from './auth';
import {groupGameAccess} from './group-game-access';
import {canViewUnlisted} from './game-sharing';
import {refreshWaitlist} from './game-waitlist';
import {gameReminderLead} from './game-reminders';
import {pushEnvironmentEnabled,pushTester,validPushEndpoint,type PushEnv} from './push';

export type Delivery={discussionPostId?:string;id:string;event_id:string;device_id:string;attempts:number;recipient_id:string;category:string;kind:string;entity_type:string;entity_id:string;source:string;source_id:string;expires_at:number;endpoint:string;p256dh:string;auth:string;key_id:string;session_id:string;transport:string};
const sources=new Set(['game_notifications','group_notifications','game_guest_notifications','player_game_invitations','game_schedule_notifications']);
export async function eventStillVisible(db:AuthDatabase,d:Delivery,now:number){
 if(d.expires_at<=now)return false;
 if(d.source==='discussion_announcements'){const target=await announcementPushTarget(db,d.source_id,d.recipient_id,now);if(!target)return false;d.entity_id=target.groupId;d.discussionPostId=target.postId;return true;}
 if(d.source==='discussion_notifications'){const target=await discussionPushTarget(db,d.source_id,d.recipient_id,now);if(!target)return false;d.entity_id=target.groupId;d.discussionPostId=target.postId;return true;}
 if(d.source==='game_chat_messages'){const target=await chatPushTarget(db,d.source_id,d.recipient_id,now);if(!target)return false;d.entity_id=target;return true;}
 const reminderLead=d.source==='game_reminders'?gameReminderLead(d.kind):null;
 if(d.source==='game_reminders'&&(!reminderLead||d.entity_type!=='game'||d.category!=='games'))return false;
 if(d.source==='game_waitlist'){
  const w=await db.prepare("SELECT 1 FROM game_waitlist WHERE game_id=? AND player_id=? AND status='offered' AND offer_expires_at>? AND game_id||':'||player_id||':'||offered_at=?").bind(d.entity_id,d.recipient_id,now,d.source_id).first();if(!w)return false;
 }else if(d.source!=='game_reminders'){
  if(!sources.has(d.source))return false;
  const actorColumn=d.source==='player_game_invitations'?'sender_id':d.source==='game_schedule_notifications'?'NULL':'actor_id';
  const n=await db.prepare(`SELECT ${actorColumn} AS actor FROM ${d.source} WHERE id=? AND recipient_id=? AND read_at IS NULL`).bind(d.source_id,d.recipient_id).first<{actor:string|null}>();if(!n)return false;
  if(n.actor&&await db.prepare('SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)').bind(d.recipient_id,n.actor,n.actor,d.recipient_id).first())return false;
 }
 if(d.entity_type==='group'){
  // Membership outcomes can be notified without granting content access. Payload is generic.
  if(d.kind==='group_archived')return !!await db.prepare("SELECT 1 FROM tennis_groups WHERE id=? AND status='archived'").bind(d.entity_id).first();
  if(['group_active','group_rejected','group_removed'].includes(d.kind))return !!await db.prepare('SELECT 1 FROM group_memberships WHERE group_id=? AND player_id=? AND status=?').bind(d.entity_id,d.recipient_id,d.kind.slice(6)).first();
  return !!await db.prepare("SELECT 1 FROM tennis_groups t JOIN group_memberships m ON m.group_id=t.id WHERE t.id=? AND t.status='active' AND m.player_id=? AND m.status='active' AND (t.owner_id=m.player_id OR COALESCE(m.assigned_role,m.role) IN ('coowner','admin','organizer'))").bind(d.entity_id,d.recipient_id).first();
 }
 const game=await db.prepare('SELECT organizer_id,visibility,group_id,starts_at,status,created_at FROM games WHERE id=?').bind(d.entity_id).first<{organizer_id:string;visibility:string;group_id:string|null;starts_at:number;status:string;created_at:number}>();
 if(!game)return false;
 if(d.kind!=='game_cancelled'&&(game.status!=='scheduled'||game.starts_at<=now))return false;
 if(reminderLead){
  if(d.source_id!==`${d.entity_id}:${game.starts_at}:${d.kind}`||game.created_at>=game.starts_at-reminderLead||
     !await db.prepare('SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?').bind(d.entity_id,d.recipient_id).first())return false;
 }
 if(game.visibility==='group'&&!(await groupGameAccess(db,game.group_id!,d.recipient_id,game.organizer_id)).canView)return false;
 if(game.visibility==='unlisted'&&!await canViewUnlisted(db,d.entity_id,d.recipient_id))return false;
 return !await db.prepare('SELECT 1 FROM player_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)').bind(d.recipient_id,game.organizer_id,game.organizer_id,d.recipient_id).first();
}
async function deviceEligible(db:AuthDatabase,d:Delivery,now:number){
 return !!await db.prepare(`SELECT 1 FROM notification_devices d JOIN auth_sessions s ON s.id=d.session_id JOIN players p ON p.id=d.player_id JOIN notification_preferences n ON n.player_id=p.id WHERE d.id=? AND d.player_id=? AND d.revoked_at IS NULL AND s.player_id=p.id AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active' AND n.push_enabled=1 AND CASE ? WHEN 'groups' THEN n.groups ELSE n.games END=1`).bind(d.device_id,d.recipient_id,now,d.category).first();
}
export type PushSender=typeof sendPushNotification;
export async function drainPush(db:AuthDatabase,env:PushEnv,send:PushSender=sendPushNotification){
 // Every eligible account may opt in. Production requires its own explicit rollout settings.
 if(!pushEnvironmentEnabled(env)||!env.PUSH_VAPID_PUBLIC_KEY||!env.PUSH_VAPID_PRIVATE_KEY||!env.PUSH_VAPID_SUBJECT)return {processed:0};
 // During the additive chat migration, preserve queued deliveries without claiming them.
 if(!await chatSchemaReady(db))return {processed:0};
 const now=Date.now();
 // Advance eligible waitlists even when nobody has the website open.
 const cursor=await db.prepare("SELECT value FROM notification_worker_state WHERE name='waitlist_cursor'").first<{value:string}>();
 let waiting=(await db.prepare("SELECT DISTINCT w.game_id FROM game_waitlist w JOIN games g ON g.id=w.game_id WHERE w.status IN ('waiting','offered') AND g.status='scheduled' AND g.starts_at>? AND w.game_id>? ORDER BY w.game_id LIMIT 5").bind(now,cursor?.value??'').all<{game_id:string}>()).results;
 if(!waiting.length&&cursor?.value)waiting=(await db.prepare("SELECT DISTINCT w.game_id FROM game_waitlist w JOIN games g ON g.id=w.game_id WHERE w.status IN ('waiting','offered') AND g.status='scheduled' AND g.starts_at>? ORDER BY w.game_id LIMIT 5").bind(now).all<{game_id:string}>()).results;
 for(const w of waiting)await refreshWaitlist(db,w.game_id);
 await db.prepare("INSERT INTO notification_worker_state VALUES('waitlist_cursor',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(waiting.at(-1)?.game_id??'').run();
 // Expired events cascade to their per-device delivery records; source inbox history is untouched.
 await db.prepare('DELETE FROM notification_events WHERE expires_at<=?').bind(now).run();
 await db.prepare(`DELETE FROM notification_devices WHERE revoked_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM auth_sessions s WHERE s.id=notification_devices.session_id AND s.revoked_at IS NULL AND s.expires_at>?)`).bind(now).run();
 const rows=(await db.prepare(`SELECT q.*,e.recipient_id,e.category,e.kind,e.entity_type,e.entity_id,e.source,e.source_id,e.expires_at,d.endpoint,d.p256dh,d.auth,d.key_id,d.session_id,d.transport FROM notification_deliveries q JOIN notification_events e ON e.id=q.event_id JOIN notification_devices d ON d.id=q.device_id WHERE q.channel='webpush' AND ((q.status='pending' AND q.next_attempt_at<=?) OR (q.status='sending' AND q.lease_until<=?)) AND q.attempts<5 ORDER BY q.next_attempt_at,q.id LIMIT 10`).bind(now,now).all<Delivery>()).results;
 for(const d of rows){
  const lease=crypto.randomUUID(),time=Date.now();
  const claim=await db.prepare(`UPDATE notification_deliveries SET status='sending',attempts=attempts+1,lease_token=?,lease_until=? WHERE id=? AND ((status='pending' AND next_attempt_at<=?) OR (status='sending' AND lease_until<=?)) AND attempts<5`).bind(lease,time+120000,d.id,time,time).run();if(!claim.meta.changes)continue;
  const finish=async(status:string,error:string|null=null,next=time)=>db.prepare('UPDATE notification_deliveries SET status=?,last_error=?,next_attempt_at=?,sent_at=?,lease_until=NULL,lease_token=NULL WHERE id=? AND lease_token=?').bind(status,error,next,status==='sent'?Date.now():null,d.id,lease).run();
  if(!pushTester(env,d.recipient_id)||d.transport!=='webpush'||d.key_id!==env.PUSH_VAPID_PUBLIC_KEY||!validPushEndpoint(d.endpoint)||!await deviceEligible(db,d,time)||!await eventStillVisible(db,d,time)){await finish('skipped');continue;}
  try{
   const ok=await send({endpoint:d.endpoint,keys:{p256dh:d.p256dh,auth:d.auth}},
    rawPayload(JSON.stringify({version:1,kind:d.kind,tag:'oc-'+d.event_id,target:{type:d.entity_type,id:d.entity_id,...(d.discussionPostId?{postId:d.discussionPostId}:{})}})),
    {publicKey:env.PUSH_VAPID_PUBLIC_KEY,privateKey:env.PUSH_VAPID_PRIVATE_KEY,subject:env.PUSH_VAPID_SUBJECT},
    {ttl:Math.max(0,Math.min(3600,Math.floor((d.expires_at-time)/1000))),timeoutMs:5000});
   if(!ok){await db.prepare('DELETE FROM notification_devices WHERE id=?').bind(d.device_id).run();continue;}
   await finish('sent');
  }catch(e){
   // Never log provider errors: they can contain device endpoints and encrypted subscription material.
   const code=e instanceof WebPushError?e.statusCode:0;
   const retry=(!code||code===429||code>=500)&&d.attempts+1<5;
   const retryAfter=e instanceof WebPushError?e.retryAfterMs??0:0;
   await finish(retry?'pending':'failed',code?'provider_'+code:'delivery_error',time+Math.min(3600000,Math.max(60000*2**d.attempts,retryAfter)));
  }
 }
 return {processed:rows.length};
}
