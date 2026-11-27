import {AuthError,checkCsrf,checkOrigin,hashToken,json,productionCommunityEnabled,readJson,type AuthDatabase,type Session} from './auth';
import type {PushEnv} from './push';

export function nativePushRegistrationEnabled(env:PushEnv,origin:string){
 let url:URL;try{url=new URL(origin);}catch{return false;}
 const developmentOrigin=origin==='https://feature-play-together.opencourts.pages.dev'||
  (url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)&&url.origin===origin);
 const development=env.NATIVE_PUSH_DEVELOPMENT_ENABLED==='true'&&env.APNS_ENVIRONMENT==='sandbox'&&
  env.APNS_TOPIC==='us.opencourts.ios'&&origin===env.AUTH_ORIGIN&&developmentOrigin&&
  env.CF_PAGES_BRANCH!=='main'&&env.PLAY_TOGETHER_ENVIRONMENT!=='production';
 const production=origin==='https://opencourts.us'&&origin===env.AUTH_ORIGIN&&
  env.NATIVE_PUSH_PRODUCTION_ENABLED==='true'&&env.APNS_ENVIRONMENT==='production'&&
  env.APNS_TOPIC==='us.opencourts.ios'&&productionCommunityEnabled(env);
 return development||production;
}

export async function nativePushSchemaReady(db:AuthDatabase){
 return !!await db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='native_push_devices'").first();
}

// An operator assertion after hosted sender preflight, never a claim of device receipt.
// Pages needs no Apple private key. Keep this assertion and the tester list aligned
// with the separate sender deployment; unset/empty lists permit nobody.
export function nativePushTester(env:PushEnv,playerId:string){
 return !!playerId&&!!env.NATIVE_PUSH_ALLOWED_PLAYER_IDS?.split(',').map(id=>id.trim()).filter(Boolean).includes(playerId);
}
export function nativePushDeliveryAvailable(env:PushEnv,playerId:string){
 if(!nativePushRegistrationEnabled(env,env.AUTH_ORIGIN??''))return false;
 if(env.APNS_ENVIRONMENT==='production')return env.NATIVE_PUSH_PRODUCTION_READY==='true';
 return env.NATIVE_PUSH_SANDBOX_READY==='true'&&nativePushTester(env,playerId);
}

function nativePushUnavailableReason(env:PushEnv,origin:string,schemaReady:boolean):string|null{
 if(origin!==env.AUTH_ORIGIN)return 'origin_mismatch';
 if(origin==='https://opencourts.us'){
  if(env.CF_PAGES_BRANCH!=='main'||env.PLAY_TOGETHER_ENVIRONMENT!=='production'||
     env.PLAY_TOGETHER_ENABLED!=='true'||env.PLAY_TOGETHER_PRODUCTION_ENABLED!=='true')return 'production_environment_disabled';
  if(env.NATIVE_PUSH_PRODUCTION_ENABLED!=='true')return 'registration_disabled';
  if(env.APNS_ENVIRONMENT!=='production'||env.APNS_TOPIC!=='us.opencourts.ios')return 'apns_environment_mismatch';
 }else if(!nativePushRegistrationEnabled(env,origin))return 'registration_disabled';
 if(!schemaReady)return 'schema_unavailable';
 return null;
}
function nativePushDeliveryUnavailableReason(env:PushEnv,playerId:string,registrationReason:string|null):string|null{
 if(registrationReason)return 'registration_unavailable';
 if(env.APNS_ENVIRONMENT==='production')return env.NATIVE_PUSH_PRODUCTION_READY==='true'?null:'sender_not_ready';
 if(env.NATIVE_PUSH_SANDBOX_READY!=='true')return 'sender_not_ready';
 if(!nativePushTester(env,playerId))return 'tester_not_enabled';
 return null;
}

export function nativePushRecipientEnabled(env:PushEnv,playerId:string){
 return env.APNS_ENVIRONMENT==='production'
  ? nativePushDeliveryAvailable(env,playerId)
  : nativePushDeliveryAvailable(env,playerId)&&nativePushTester(env,playerId);
}

export async function cleanupNativePushDevices(db:AuthDatabase,now=Date.now()){
 if(!await nativePushSchemaReady(db))return;
 await db.prepare(`DELETE FROM notification_devices WHERE transport='apns' AND (revoked_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM auth_sessions s JOIN players p ON p.id=s.player_id WHERE s.id=notification_devices.session_id AND s.player_id=notification_devices.player_id AND s.client_type='ios' AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active'))`).bind(now).run();
}

// Do not assume APNs tokens have a fixed byte length. Bound and normalize hex input.
export function nativePushToken(value:unknown){
 return typeof value==='string'&&value.length>=2&&value.length<=1024&&value.length%2===0&&/^[a-fA-F0-9]+$/.test(value)?value.toLowerCase():null;
}

const liveSession=`EXISTS(SELECT 1 FROM auth_sessions s JOIN players p ON p.id=s.player_id WHERE s.id=? AND s.player_id=? AND s.client_type='ios' AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active')`;

export async function handleNativePush(request:Request,env:PushEnv,path:string,db:AuthDatabase,origin:string,actor:Session){
 if(!request.headers.get('Authorization')?.startsWith('Bearer '))throw new AuthError(401,'Native sign-in is required.');
 const schemaReady=await nativePushSchemaReady(db),unavailableReason=nativePushUnavailableReason(env,origin,schemaReady);
 const available=unavailableReason===null,deliveryUnavailableReason=nativePushDeliveryUnavailableReason(env,actor.id,unavailableReason);
 if(path==='settings'&&request.method==='GET'){
  console.info('[Native push] settings capability',{available,deliveryAvailable:deliveryUnavailableReason===null,unavailableReason,deliveryUnavailableReason});
  if(!available)return json({available:false,deliveryAvailable:false,unavailableReason,deliveryUnavailableReason});
  const preferences=await db.prepare('SELECT push_enabled AS enabled,games,groups FROM notification_preferences WHERE player_id=?').bind(actor.id).first();
  const devices=(await db.prepare(`SELECT d.id,d.transport,d.session_id AS sessionId,d.created_at AS createdAt,d.updated_at AS updatedAt FROM notification_devices d JOIN native_push_devices n ON n.device_id=d.id JOIN auth_sessions s ON s.id=d.session_id WHERE d.player_id=? AND d.revoked_at IS NULL AND s.revoked_at IS NULL AND s.expires_at>? ORDER BY d.updated_at DESC,d.id LIMIT 10`).bind(actor.id,Date.now()).all<{id:string;transport:string;sessionId:string;createdAt:number;updatedAt:number}>()).results.map(({sessionId,...d})=>({...d,currentSession:sessionId===actor.session_id}));
  // Registration infrastructure is distinct from sender readiness and delivery acceptance.
  return json({available:true,deliveryAvailable:deliveryUnavailableReason===null,unavailableReason:null,deliveryUnavailableReason,environment:env.APNS_ENVIRONMENT,playerId:actor.id,preferences:preferences??{enabled:0,games:1,groups:1},devices});
 }
 if(!available)throw new AuthError(404,'Native push registration is not available.');
 checkOrigin(request,origin);checkCsrf(request,actor);
 const body=await readJson(request),now=Date.now();
 if(path==='installation'&&request.method==='POST'){
  if(typeof body.installationId!=='string'||!/^[a-f0-9]{64}$/.test(body.installationId))throw new AuthError(400,'Choose an installation.');
  const hash=await hashToken(`apns:${env.APNS_ENVIRONMENT}:${env.APNS_TOPIC}:${body.installationId}`);
  const registration=await db.prepare(`SELECT d.id,d.player_id,d.session_id FROM native_push_devices n JOIN notification_devices d ON d.id=n.device_id JOIN auth_sessions s ON s.id=d.session_id JOIN players p ON p.id=d.player_id WHERE n.installation_hash=? AND d.revoked_at IS NULL AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active'`).bind(hash,now).first<{id:string;player_id:string;session_id:string}>();
  // Installation-secret possession permits a version review, without exposing another actor's identity.
  return json({registrationId:registration?.id??null,currentSession:registration?.player_id===actor.id&&registration.session_id===actor.session_id});
 }
 if(path==='preferences'&&request.method==='PATCH'){
  if(!['enabled','games','groups'].every(key=>typeof body[key]==='boolean'))throw new AuthError(400,'Choose notification preferences.');
  const result=await db.prepare(`INSERT INTO notification_preferences(player_id,push_enabled,games,groups,updated_at) SELECT ?,?,?,?,? WHERE ${liveSession} ON CONFLICT(player_id) DO UPDATE SET push_enabled=excluded.push_enabled,games=excluded.games,groups=excluded.groups,updated_at=excluded.updated_at`).bind(actor.id,Number(body.enabled),Number(body.games),Number(body.groups),now,actor.session_id,actor.id,now).run();
  if(!result.meta.changes)throw new AuthError(401,'Please sign in again.');
  return json({ok:true});
 }
 if(path==='devices'&&request.method==='DELETE'){
  if(typeof body.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))throw new AuthError(400,'Choose a registration.');
  await db.prepare("DELETE FROM notification_devices WHERE id=? AND player_id=? AND transport='apns'").bind(body.id,actor.id).run();
  return json({ok:true});
 }
 if(path!=='devices'||request.method!=='POST')return json({error:'Not found.'},404);
 const token=nativePushToken(body.deviceToken);
 if(!token||typeof body.installationId!=='string'||!/^[a-f0-9]{64}$/.test(body.installationId)||typeof body.consent!=='boolean'||body.environment!==env.APNS_ENVIRONMENT||body.topic!==env.APNS_TOPIC)throw new AuthError(400,'A current device token, installation identity and registration choice are required.');
 const expected=body.expectedRegistrationId??null;
 if(expected!==null&&(typeof expected!=='string'||!/^[0-9a-f-]{36}$/i.test(expected)))throw new AuthError(400,'Choose the reviewed registration.');
 await cleanupNativePushDevices(db,now);
 const installationHash=await hashToken(`apns:${env.APNS_ENVIRONMENT}:${env.APNS_TOPIC}:${body.installationId}`);
 const endpointHash=await hashToken(`apns:${env.APNS_ENVIRONMENT}:${env.APNS_TOPIC}:${token}`);
 const previous=await db.prepare('SELECT d.id,d.player_id,d.session_id,d.endpoint_hash FROM notification_devices d JOIN native_push_devices n ON n.device_id=d.id WHERE n.installation_hash=?').bind(installationHash).first<{id:string;player_id:string;session_id:string;endpoint_hash:string}>();
 const reuse=previous?.player_id===actor.id&&previous.session_id===actor.session_id&&previous.endpoint_hash===endpointHash;
 // A delayed older account/token request must not take back a newer registration.
 // Same-session/same-token retries recover an ambiguous accepted response safely.
 if(previous?expected!==previous.id&&!reuse:expected!==null)throw new AuthError(409,'Registration changed. Review the current registration before trying again.');
 // Launch-time token refresh must never silently undo the player's account-wide opt-out.
 if(!body.consent&&(!previous||previous.player_id!==actor.id||previous.session_id!==actor.session_id))throw new AuthError(403,'Enable notifications for this sign-in before refreshing its registration.');
 const tokenOwner=await db.prepare('SELECT d.id,n.installation_hash FROM notification_devices d LEFT JOIN native_push_devices n ON n.device_id=d.id WHERE d.endpoint_hash=?').bind(endpointHash).first<{id:string;installation_hash:string|null}>();
 if(tokenOwner&&tokenOwner.installation_hash!==installationHash)throw new AuthError(409,'This token belongs to a different installation. Remove its previous registration before trying again.');
 const id=reuse?previous!.id:crypto.randomUUID();
 const count=await db.prepare('SELECT COUNT(*) AS n FROM notification_devices WHERE player_id=? AND revoked_at IS NULL AND id!=?').bind(actor.id,previous?.id??'').first<{n:number}>();
 if(Number(count?.n)>=10)throw new AuthError(409,'Remove an old device before adding another.');
 const ops=[];
 if(previous&&!reuse)ops.push(db.prepare(`DELETE FROM notification_devices WHERE id=? AND transport='apns' AND ${liveSession}`).bind(previous.id,actor.session_id,actor.id,now));
 // Conditional insert repeats session/account/cap checks inside the atomic batch.
 ops.push(db.prepare(`INSERT INTO notification_devices(id,player_id,session_id,transport,endpoint_hash,endpoint,p256dh,auth,key_id,created_at,updated_at,revoked_at)
 SELECT ?,?,?,'apns',?,?,'','','apns:'||?, ?,?,NULL WHERE ${liveSession}
 AND (SELECT COUNT(*) FROM notification_devices WHERE player_id=? AND revoked_at IS NULL AND id!=?)<10
 ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at,revoked_at=NULL`).bind(id,actor.id,actor.session_id,endpointHash,token,env.APNS_ENVIRONMENT,now,now,actor.session_id,actor.id,now,actor.id,id));
 ops.push(db.prepare(`INSERT INTO native_push_devices(device_id,installation_hash,environment,topic) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM notification_devices WHERE id=? AND player_id=? AND session_id=?) ON CONFLICT(device_id) DO NOTHING`).bind(id,installationHash,env.APNS_ENVIRONMENT,env.APNS_TOPIC,id,actor.id,actor.session_id));
 // Explicit opt-in enables global push without resetting the player's category choices.
 if(body.consent)ops.push(db.prepare(`INSERT INTO notification_preferences(player_id,push_enabled,games,groups,updated_at) SELECT ?,1,1,1,? WHERE EXISTS(SELECT 1 FROM notification_devices WHERE id=? AND player_id=? AND session_id=?) ON CONFLICT(player_id) DO UPDATE SET push_enabled=1,updated_at=excluded.updated_at`).bind(actor.id,now,id,actor.id,actor.session_id));
 await db.batch(ops);
 const registered=await db.prepare(`SELECT 1 FROM notification_devices WHERE id=? AND player_id=? AND session_id=? AND ${liveSession}`).bind(id,actor.id,actor.session_id,actor.session_id,actor.id,Date.now()).first();
 if(!registered)throw new AuthError(409,'Registration changed. Refresh your session and registrations before trying again.');
 return json({ok:true,id,deliveryAvailable:nativePushDeliveryAvailable(env,actor.id)});
}
