import {productionCommunityEnabled,AuthError,assertEnvironment,checkCsrf,checkOrigin,hashToken,json,readJson,requireSession,session,type AuthEnv} from './auth';
import {handleNativePush} from './native-push';

export interface PushEnv extends AuthEnv {
 NATIVE_PUSH_DEVELOPMENT_ENABLED?:string; NATIVE_PUSH_PRODUCTION_ENABLED?:string;
 NATIVE_PUSH_PRODUCTION_READY?:string; APNS_ENVIRONMENT?:string; APNS_TOPIC?:string;
 NATIVE_PUSH_SANDBOX_READY?:string; NATIVE_PUSH_ALLOWED_PLAYER_IDS?:string;
 APNS_SENDER_ENABLED?:string; APNS_TEAM_ID?:string; APNS_KEY_ID?:string; APNS_PRIVATE_KEY?:string;
 PUSH_ENABLED?:string; PUSH_ENVIRONMENT?:string; PUSH_ALLOWED_PLAYER_IDS?:string;
 PUSH_VAPID_PUBLIC_KEY?:string; PUSH_VAPID_PRIVATE_KEY?:string; PUSH_VAPID_SUBJECT?:string;
}
export const pushEnvironmentEnabled=(env:PushEnv)=>env.PUSH_ENABLED==='true'&&(
 (env.PUSH_ENVIRONMENT==='production'&&productionCommunityEnabled(env))||
 (env.PUSH_ENVIRONMENT==='development'&&env.AUTH_ORIGIN==='https://feature-play-together.opencourts.pages.dev'&&env.PLAY_TOGETHER_ENVIRONMENT!=='production'&&env.CF_PAGES_BRANCH!=='main'));
// All accounts may opt in. The legacy tester-list setting no longer restricts access.
export const pushTester=(env:PushEnv,_id:string)=>pushEnvironmentEnabled(env);
export function validPushEndpoint(endpoint:string){
 try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&endpoint.length<=2048&&(
 u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.notify.windows.com'));
 }catch{return false;}
}
function keyBytes(value:unknown,length:number){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))return false;
 try{return atob(value.replace(/-/g,'+').replace(/_/g,'/')).length===length;}catch{return false;}
}
export async function handlePush(request:Request,env:PushEnv):Promise<Response>{
 try{
 const {db,origin}=assertEnvironment(request,env),actor=requireSession(await session(request,db,origin));
 const path=new URL(request.url).pathname.replace(/^\/api\/push\/?/,'').replace(/\/$/,'');
 if(path.startsWith('native/'))return await handleNativePush(request,env,path.slice(7),db,origin,actor);
 const enabled=pushTester(env,actor.id)&&keyBytes(env.PUSH_VAPID_PUBLIC_KEY,65);
 if(path==='settings'&&request.method==='GET'){
  if(!enabled)return json({available:false});
  const pref=await db.prepare('SELECT push_enabled AS enabled,games,groups FROM notification_preferences WHERE player_id=?').bind(actor.id).first();
  const devices=(await db.prepare('SELECT id,transport,endpoint_hash AS endpointHash,session_id AS sessionId,created_at AS createdAt,updated_at AS updatedAt FROM notification_devices WHERE player_id=? AND revoked_at IS NULL ORDER BY updated_at DESC LIMIT 10').bind(actor.id).all<{id:string;transport:string;endpointHash:string;sessionId:string;createdAt:number;updatedAt:number}>()).results.map(({sessionId,...d})=>({...d,currentSession:sessionId===actor.session_id}));
  return json({available:true,publicKey:env.PUSH_VAPID_PUBLIC_KEY,preferences:pref??{enabled:0,games:1,groups:1},devices});
 }
 if(!enabled)throw new AuthError(404,'Push notifications are not enabled for this account yet.');
 checkOrigin(request,origin);checkCsrf(request,actor);
 const body=await readJson(request),now=Date.now();
 if(path==='preferences'&&request.method==='PATCH'){
  if(!['enabled','games','groups'].every(k=>typeof body[k]==='boolean'))throw new AuthError(400,'Choose notification preferences.');
  await db.prepare('INSERT INTO notification_preferences VALUES(?,?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET push_enabled=excluded.push_enabled,games=excluded.games,groups=excluded.groups,updated_at=excluded.updated_at').bind(actor.id,Number(body.enabled),Number(body.games),Number(body.groups),now).run();
  return json({ok:true});
 }
 if(path==='devices'&&request.method==='POST'){
  const sub=body.subscription as {endpoint?:unknown;keys?:{p256dh?:unknown;auth?:unknown}}|undefined;
  if(!sub||typeof sub.endpoint!=='string'||!validPushEndpoint(sub.endpoint)||!keyBytes(sub.keys?.p256dh,65)||!keyBytes(sub.keys?.auth,16))throw new AuthError(400,'Invalid browser notification subscription.');
  // Validate the curve point as well as its length before storing it.
  try{await crypto.subtle.importKey('raw',Uint8Array.from(atob((sub.keys!.p256dh as string).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),{name:'ECDH',namedCurve:'P-256'},false,[]);}catch{throw new AuthError(400,'Invalid browser encryption key.');}
  const endpointHash=await hashToken(sub.endpoint),existing=await db.prepare('SELECT id,player_id,session_id,revoked_at,auth,p256dh FROM notification_devices WHERE endpoint_hash=?').bind(endpointHash).first<{id:string;player_id:string;session_id:string;revoked_at:number|null;auth:string;p256dh:string}>();
  if(existing&&existing.player_id!==actor.id&&(existing.auth!==sub.keys!.auth||existing.p256dh!==sub.keys!.p256dh))throw new AuthError(409,'This browser subscription cannot be reassigned. Reset notification permission and try again.');
  // Rebinding a shared browser destroys its previous queued deliveries atomically.
  const count=await db.prepare('SELECT COUNT(*) AS n FROM notification_devices WHERE player_id=? AND revoked_at IS NULL').bind(actor.id).first<{n:number}>();
  if((!existing||existing.player_id!==actor.id||existing.revoked_at!==null)&&Number(count?.n)>=10)throw new AuthError(409,'Remove an old device before adding another.');
  const same=existing?.player_id===actor.id&&existing.session_id===actor.session_id,id=same?existing!.id:crypto.randomUUID();
  const ops=[];
  if(existing&&!same)ops.push(db.prepare('DELETE FROM notification_devices WHERE id=?').bind(existing.id));
  ops.push(db.prepare(`INSERT INTO notification_devices VALUES(?,?,?,'webpush',?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET session_id=excluded.session_id,p256dh=excluded.p256dh,auth=excluded.auth,key_id=excluded.key_id,updated_at=excluded.updated_at,revoked_at=NULL`).bind(id,actor.id,actor.session_id,endpointHash,sub.endpoint,sub.keys!.p256dh,sub.keys!.auth,env.PUSH_VAPID_PUBLIC_KEY,now,now));
  ops.push(db.prepare('INSERT INTO notification_preferences VALUES(?,1,1,1,?) ON CONFLICT(player_id) DO UPDATE SET push_enabled=1,updated_at=excluded.updated_at').bind(actor.id,now));
  await db.batch(ops);return json({ok:true,id});
 }
 if(path==='devices'&&request.method==='DELETE'){
  if(typeof body.id!=='string')throw new AuthError(400,'Choose a device.');
  await db.prepare('DELETE FROM notification_devices WHERE id=? AND player_id=?').bind(body.id,actor.id).run();return json({ok:true});
 }
 return json({error:'Not found.'},404);
 }catch(e){return json({error:e instanceof AuthError?e.message:'Notification settings are temporarily unavailable.'},e instanceof AuthError?e.status:503);}
}
