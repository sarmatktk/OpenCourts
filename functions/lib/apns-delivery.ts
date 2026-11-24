import type {AuthDatabase} from './auth';
import type {PushEnv} from './push';
import {apnsSenderEnabled,defaultAPNsClient,type APNsClient} from './apns-provider';
import {eventStillVisible,type Delivery} from './push-delivery';
import {cleanupNativePushDevices,nativePushRecipientEnabled,nativePushSchemaReady} from './native-push';
import {chatSchemaReady} from './series-chat';
import {refreshWaitlist} from './game-waitlist';

type NativeDelivery=Delivery&{native_environment:string;native_topic:string};
async function eligible(db:AuthDatabase,d:NativeDelivery,now:number,environment:string,topic:string){
 return !!await db.prepare(`SELECT 1 FROM notification_devices d JOIN native_push_devices n ON n.device_id=d.id JOIN auth_sessions s ON s.id=d.session_id JOIN players p ON p.id=d.player_id JOIN notification_preferences prefs ON prefs.player_id=p.id WHERE d.id=? AND d.player_id=? AND d.session_id=? AND d.endpoint=? AND d.transport='apns' AND d.revoked_at IS NULL AND n.environment=? AND n.topic=? AND s.player_id=p.id AND s.client_type='ios' AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active' AND prefs.push_enabled=1 AND CASE ? WHEN 'groups' THEN prefs.groups ELSE prefs.games END=1`).bind(d.device_id,d.recipient_id,d.session_id,d.endpoint,environment,topic,now,d.category).first();
}

export async function drainAPNs(db:AuthDatabase,env:PushEnv,injected?:APNsClient){
 if(!apnsSenderEnabled(env)||!await nativePushSchemaReady(db)||!await chatSchemaReady(db))return {processed:0};
 const client=injected??defaultAPNsClient(env);
 // Invalid signing material must not claim work or consume delivery attempts.
 try{await client.prepare();}catch{return {processed:0,configurationError:true};}
 const now=Date.now();await cleanupNativePushDevices(db,now);
 // Native-only deployments also advance offers, without requiring browser credentials.
 const cursor=await db.prepare("SELECT value FROM notification_worker_state WHERE name='apns_waitlist_cursor'").first<{value:string}>();
 let waiting=(await db.prepare("SELECT DISTINCT w.game_id FROM game_waitlist w JOIN games g ON g.id=w.game_id WHERE w.status IN ('waiting','offered') AND g.status='scheduled' AND g.starts_at>? AND w.game_id>? ORDER BY w.game_id LIMIT 5").bind(now,cursor?.value??'').all<{game_id:string}>()).results;
 if(!waiting.length&&cursor?.value)waiting=(await db.prepare("SELECT DISTINCT w.game_id FROM game_waitlist w JOIN games g ON g.id=w.game_id WHERE w.status IN ('waiting','offered') AND g.status='scheduled' AND g.starts_at>? ORDER BY w.game_id LIMIT 5").bind(now).all<{game_id:string}>()).results;
 for(const entry of waiting)await refreshWaitlist(db,entry.game_id);
 await db.prepare("INSERT INTO notification_worker_state VALUES('apns_waitlist_cursor',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(waiting.at(-1)?.game_id??'').run();
 await db.prepare('DELETE FROM notification_events WHERE expires_at<=?').bind(now).run();
 await db.prepare("UPDATE notification_deliveries SET status='failed',last_error='attempt_limit',lease_token=NULL,lease_until=NULL WHERE channel='apns' AND attempts>=5 AND (status='pending' OR (status='sending' AND lease_until<=?))").bind(now).run();
 const rows=(await db.prepare(`SELECT q.*,e.recipient_id,e.category,e.kind,e.entity_type,e.entity_id,e.source,e.source_id,e.expires_at,d.endpoint,d.p256dh,d.auth,d.key_id,d.session_id,d.transport,n.environment AS native_environment,n.topic AS native_topic FROM notification_deliveries q JOIN notification_events e ON e.id=q.event_id JOIN notification_devices d ON d.id=q.device_id JOIN native_push_devices n ON n.device_id=d.id WHERE q.channel='apns' AND ((q.status='pending' AND q.next_attempt_at<=?) OR (q.status='sending' AND q.lease_until<=?)) AND q.attempts<5 ORDER BY q.next_attempt_at,q.id LIMIT 10`).bind(now,now).all<NativeDelivery>()).results;
 let processed=0;
 for(const d of rows){
  const lease=crypto.randomUUID(),start=Date.now();
  const claim=await db.prepare(`UPDATE notification_deliveries SET status='sending',attempts=attempts+1,lease_token=?,lease_until=? WHERE id=? AND channel='apns' AND ((status='pending' AND next_attempt_at<=?) OR (status='sending' AND lease_until<=?)) AND attempts<5`).bind(lease,start+120000,d.id,start,start).run();if(!claim.meta.changes)continue;processed++;
  const finish=async(status:string,error:string|null=null,next=start)=>db.prepare('UPDATE notification_deliveries SET status=?,last_error=?,next_attempt_at=?,sent_at=?,lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?').bind(status,error,next,status==='sent'?Date.now():null,d.id,lease).run();
  const authorize=async()=>{
   const time=Date.now();
   return apnsSenderEnabled(env)&&nativePushRecipientEnabled(env,d.recipient_id)&&d.native_environment===env.APNS_ENVIRONMENT&&d.native_topic===env.APNS_TOPIC&&
    !!await db.prepare("SELECT 1 FROM notification_deliveries WHERE id=? AND lease_token=? AND status='sending' AND lease_until>?").bind(d.id,lease,time).first()&&
    await eligible(db,d,time,env.APNS_ENVIRONMENT??'',env.APNS_TOPIC??'')&&await eventStillVisible(db,d,time);
  };
  try{
   if(!await authorize()){await finish('skipped');continue;}
   const target={type:d.entity_type,id:d.entity_id,...(d.discussionPostId?{postId:d.discussionPostId}:{})};
   const authorizeTarget=async()=>await authorize()&&target.id===d.entity_id&&target.postId===d.discussionPostId;
   // A recurring-chat retarget during final checks must not send the older route.
   const outcome=await client.send({deviceToken:d.endpoint,registrationID:d.device_id,deliveryID:d.id,eventID:d.event_id,kind:d.kind,expiresAt:d.expires_at,target},authorizeTarget);
   const code=/^(provider_\d{3}|delivery_error|expired_or_invalid|invalid_payload|authorization_changed)$/.test(outcome.code??'')?outcome.code!:'delivery_error';
   if(outcome.status==='accepted')await finish('sent');
   else if(outcome.status==='invalid_token'){
    // Ignore old provider invalidations after a fresh app token registration or lost lease.
    const threshold=Math.min(start,outcome.invalidatedAt??start);
    const removed=await db.prepare(`DELETE FROM notification_devices WHERE id=? AND transport='apns' AND endpoint=? AND session_id=? AND updated_at<=? AND EXISTS(SELECT 1 FROM notification_deliveries WHERE id=? AND lease_token=? AND status='sending' AND lease_until>?)`).bind(d.device_id,d.endpoint,d.session_id,threshold,d.id,lease,Date.now()).run();
    if(!removed.meta.changes)await finish('failed',code);
   }else if(outcome.status==='skipped')await finish('skipped',code);
   else if(outcome.status==='retry'){
    const delay=Math.min(3600000,Math.max(60000*2**d.attempts,outcome.retryAfterMs??0)),next=Date.now()+delay;
    await finish(d.attempts+1<5&&next<d.expires_at?'pending':'failed',code,next);
   }else await finish('failed',code);
   if(outcome.stopBatch)break;
  }catch{
   const next=Date.now()+Math.min(3600000,60000*2**d.attempts);
   await finish(d.attempts+1<5&&next<d.expires_at?'pending':'failed','delivery_error',next);
  }
 }
 return {processed};
}
