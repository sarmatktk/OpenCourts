import {cleanupMedia} from '../functions/lib/media-cleanup';
import worker from '../functions/push-worker';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {generateVapidKeys} from '@mmmike/web-push/vapid';
import {WebPushError} from '@mmmike/web-push/send';
import {pushEnvironmentEnabled,pushTester,handlePush,validPushEndpoint,type PushEnv} from '../functions/lib/push';
import {cleanupNativePushDevices,nativePushRegistrationEnabled,nativePushToken} from '../functions/lib/native-push';
import {drainPush,eventStillVisible} from '../functions/lib/push-delivery';
import {enqueueGameReminders} from '../functions/lib/game-reminders';
import {drainAPNs} from '../functions/lib/apns-delivery';
import type {APNsClient,APNsOutcome} from '../functions/lib/apns-provider';
import {hashToken,type AuthDatabase,type AuthStatement} from '../functions/lib/auth';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite');
class DB implements AuthDatabase{
 sqlite=new DatabaseSync(':memory:');
 constructor(actorMigration=true){this.sqlite.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('functions/db/migrations').filter(f=>f.endsWith('.sql')&&(actorMigration||!['0025_notification_action_actor.sql','0039_game_capacity_notifications.sql'].includes(f))).sort())this.sqlite.exec(readFileSync('functions/db/migrations/'+f,'utf8'));}
 prepare(sql:string):AuthStatement{let args:unknown[]=[];const s:AuthStatement={bind(...v){args=v;return s;},first:async<T>()=>(this.sqlite.prepare(sql).get(...args)??null) as T|null,all:async<T>()=>({results:this.sqlite.prepare(sql).all(...args) as T[]}),run:async()=>({meta:{changes:Number(this.sqlite.prepare(sql).run(...args).changes)}})};return s;}
 async batch(ops:AuthStatement[]){this.sqlite.exec('BEGIN');try{const r=[];for(const o of ops)r.push(await o.run());this.sqlite.exec('COMMIT');return r;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const origin='https://feature-play-together.opencourts.pages.dev',token='notification-test-session-at-least-32-characters';
let db:DB,env:PushEnv,subscription:any;
const encoded=(a:ArrayBuffer)=>Buffer.from(a).toString('base64url');
beforeEach(async()=>{db=new DB();const now=Date.now(),vapid=await generateVapidKeys();env={COURTS_DB:db,AUTH_ORIGIN:origin,PLAY_TOGETHER_ENABLED:'true',PUSH_ENABLED:'true',PUSH_ENVIRONMENT:'development',PUSH_ALLOWED_PLAYER_IDS:'sam',PUSH_VAPID_PUBLIC_KEY:vapid.publicKey,PUSH_VAPID_PRIVATE_KEY:vapid.privateKey,PUSH_VAPID_SUBJECT:'mailto:tester@example.com'};
 db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run('sam','SECRET NAME',now,now);
 db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run('host','Host',now,now);
 db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run('s','sam',await hashToken(token),'csrf',now,now+86400000);
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test-token',keys:{p256dh:encoded(await crypto.subtle.exportKey('raw',pair.publicKey)),auth:encoded(crypto.getRandomValues(new Uint8Array(16)).buffer)}};
});
afterEach(()=>{db.sqlite.close();vi.restoreAllMocks();vi.unstubAllGlobals();});
const req=(path:string,method='GET',body?:unknown,headers:Record<string,string>={})=>handlePush(new Request(origin+'/api/push/'+path,{method,headers:{Origin:origin,Cookie:'__Host-oc_session='+token,'X-CSRF-Token':'csrf','Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
async function register(){const r=await req('devices','POST',{subscription});expect(r.status,await r.clone().text()).toBe(200);return (await r.json()).id;}
const nativeRegistration={deviceToken:'ab'.repeat(32),installationId:'cd'.repeat(32),consent:true,environment:'sandbox',topic:'us.opencourts.ios'};
function enableNative(){Object.assign(env,{NATIVE_PUSH_DEVELOPMENT_ENABLED:'true',APNS_ENVIRONMENT:'sandbox',APNS_TOPIC:'us.opencourts.ios'});db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios' WHERE id='s'").run();}
const nativePush=(path:string,method='GET',body?:unknown,headers:Record<string,string>={})=>req('native/'+path,method,body,{Cookie:'',Authorization:'Bearer '+token,...headers});
function enableNativeSender(){enableNative();Object.assign(env,{NATIVE_PUSH_SANDBOX_READY:'true',NATIVE_PUSH_ALLOWED_PLAYER_IDS:'sam',APNS_SENDER_ENABLED:'true',APNS_TEAM_ID:'TESTTEAM01',APNS_KEY_ID:'TESTKEY001',APNS_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\nsynthetic-injected-client-only\n-----END PRIVATE KEY-----'});}
function nativeClient(outcome:APNsOutcome={status:'accepted'}):APNsClient{return {prepare:vi.fn().mockResolvedValue(undefined),send:vi.fn(async(_job,authorize)=>await authorize()?outcome:{status:'skipped'})};}
it('exposes sandbox readiness only after an explicit assertion to exact listed accounts',async()=>{
 enableNative();
 for(const patch of [{},{NATIVE_PUSH_SANDBOX_READY:'true'},{NATIVE_PUSH_SANDBOX_READY:'true',NATIVE_PUSH_ALLOWED_PLAYER_IDS:'sam-other'},{NATIVE_PUSH_SANDBOX_READY:'false',NATIVE_PUSH_ALLOWED_PLAYER_IDS:'sam'}]){
  delete env.NATIVE_PUSH_SANDBOX_READY;delete env.NATIVE_PUSH_ALLOWED_PLAYER_IDS;Object.assign(env,patch);
  expect((await(await nativePush('settings')).json()).deliveryAvailable).toBe(false);
 }
 Object.assign(env,{NATIVE_PUSH_SANDBOX_READY:'true',NATIVE_PUSH_ALLOWED_PLAYER_IDS:'other, sam ,third'});
 expect((await(await nativePush('settings')).json()).deliveryAvailable).toBe(true);
 expect((await(await nativePush('devices','POST',nativeRegistration)).json()).deliveryAvailable).toBe(true);
 env.CF_PAGES_BRANCH='main';
 expect((await nativePush('settings')).status).toBe(404);
});
it.each(['','someone-else'])('does not send native work outside the sandbox tester list: %s',async(list)=>{
 enableNativeSender();env.NATIVE_PUSH_ALLOWED_PLAYER_IDS=list;
 await nativePush('devices','POST',nativeRegistration);event();const client=nativeClient();
 await drainAPNs(db,env,client);expect(client.send).not.toHaveBeenCalled();
});
it('rechecks the sandbox tester list immediately before provider egress',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();let egress=0;
 const client:APNsClient={prepare:async()=>{},send:async(_job,authorize)=>{env.NATIVE_PUSH_ALLOWED_PLAYER_IDS='';if(await authorize())egress++;return {status:'skipped'};}};
 await drainAPNs(db,env,client);expect(egress).toBe(0);
});
it('leaves native queues untouched unless enabled and signing preflight succeeds',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();const client=nativeClient();env.APNS_SENDER_ENABLED='false';
 expect(await drainAPNs(db,env,client)).toEqual({processed:0});expect(client.send).not.toHaveBeenCalled();
 env.APNS_SENDER_ENABLED='true';client.prepare=vi.fn().mockRejectedValue(new Error('SECRET SIGNING MATERIAL'));
 expect(await drainAPNs(db,env,client)).toEqual({processed:0,configurationError:true});expect(db.sqlite.prepare('SELECT status,attempts FROM notification_deliveries').get()).toMatchObject({status:'pending',attempts:0});
});
it('sends native-only work once without browser keys and records provider acceptance',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();delete env.PUSH_VAPID_PRIVATE_KEY;const client=nativeClient();
 expect((await drainAPNs(db,env,client)).processed).toBe(1);expect(client.send).toHaveBeenCalledOnce();
 expect(db.sqlite.prepare('SELECT channel,status,attempts FROM notification_deliveries').get()).toMatchObject({channel:'apns',status:'sent',attempts:1});
 await drainAPNs(db,env,client);expect(client.send).toHaveBeenCalledOnce();
});
it.each([
 "UPDATE game_notifications SET read_at=1",
 "INSERT INTO player_blocks VALUES ('sam','host',1)",
 "UPDATE group_memberships SET status='removed' WHERE player_id='sam'",
 "UPDATE tennis_groups SET status='archived'",
 "UPDATE notification_preferences SET push_enabled=0",
 "UPDATE auth_sessions SET expires_at=1",
 "UPDATE auth_sessions SET revoked_at=1",
])('suppresses native queued game delivery after current authorization changes: %s',async(change)=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);gameNote('group');db.sqlite.exec(change);db.sqlite.exec('UPDATE group_notifications SET read_at=1');
 const client=nativeClient();await drainAPNs(db,env,client);expect(client.send).not.toHaveBeenCalled();
});
it('revalidates access at the provider boundary after preparation',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();let egress=0;
 const client:APNsClient={prepare:async()=>{},send:async(_job,authorize)=>{db.sqlite.exec("UPDATE group_memberships SET status='removed' WHERE player_id='sam'");if(await authorize()){egress++;return {status:'accepted'};}return {status:'skipped'};}};
 await drainAPNs(db,env,client);expect(egress).toBe(0);expect(db.sqlite.prepare("SELECT q.status FROM notification_deliveries q JOIN notification_events e ON e.id=q.event_id WHERE e.kind='group_active'").get().status).toBe('skipped');
});
it('claims native leases once across overlapping workers',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();const client=nativeClient();
 await Promise.all([drainAPNs(db,env,client),drainAPNs(db,env,client)]);expect(client.send).toHaveBeenCalledOnce();
});
it('bounds native retries and finishes exhausted abandoned leases',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();const client=nativeClient({status:'retry',code:'provider_503',retryAfterMs:900000});const now=Date.now();
 await drainAPNs(db,env,client);expect(db.sqlite.prepare('SELECT status,attempts,next_attempt_at FROM notification_deliveries').get()).toMatchObject({status:'pending',attempts:1});
 expect(db.sqlite.prepare('SELECT next_attempt_at FROM notification_deliveries').get().next_attempt_at).toBeGreaterThanOrEqual(now+900000);
 await drainAPNs(db,env,client);expect(client.send).toHaveBeenCalledOnce();
 db.sqlite.exec("UPDATE notification_deliveries SET attempts=4,next_attempt_at=1");await drainAPNs(db,env,client);expect(db.sqlite.prepare('SELECT status,attempts FROM notification_deliveries').get()).toMatchObject({status:'failed',attempts:5});
 db.sqlite.exec("UPDATE notification_deliveries SET status='sending',lease_until=1");await drainAPNs(db,env,client);expect(db.sqlite.prepare('SELECT status,last_error FROM notification_deliveries').get()).toMatchObject({status:'failed',last_error:'attempt_limit'});
});
it('cascades invalid native tokens but protects newer registrations from old invalidation responses',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();await drainAPNs(db,env,nativeClient({status:'invalid_token',code:'provider_410'}));
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_devices').get().n).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(0);
 await nativePush('devices','POST',nativeRegistration);event('next');
 const client:APNsClient={prepare:async()=>{},send:async()=>{db.sqlite.prepare('UPDATE notification_devices SET updated_at=?').run(Date.now()+10000);return {status:'invalid_token',code:'provider_410',invalidatedAt:Date.now()-1000};}};
 await drainAPNs(db,env,client);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_devices').get().n).toBe(1);expect(db.sqlite.prepare('SELECT status FROM notification_deliveries').get().status).toBe('failed');
});
it('stops the native batch on provider authentication errors without removing devices or consuming remaining jobs',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();event('second');const client=nativeClient({status:'failed',code:'provider_403',stopBatch:true});
 expect((await drainAPNs(db,env,client)).processed).toBe(1);expect(client.send).toHaveBeenCalledOnce();expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_devices').get().n).toBe(1);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM notification_deliveries WHERE status='pending' AND attempts=0").get().n).toBe(1);
});
it('sanitizes thrown native provider errors and ignores mismatched environment/topic metadata',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();const client=nativeClient();client.send=vi.fn().mockRejectedValue(new Error('SECRET TOKEN PRIVATE KEY'));
 await drainAPNs(db,env,client);expect(db.sqlite.prepare('SELECT last_error FROM notification_deliveries').get().last_error).toBe('delivery_error');
 db.sqlite.exec("UPDATE native_push_devices SET topic='other.app';UPDATE notification_deliveries SET next_attempt_at=1");client.send=vi.fn();await drainAPNs(db,env,client);expect(client.send).not.toHaveBeenCalled();
});
it('does not let an old native lease invalidate a device or overwrite a newer worker outcome',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();
 const client:APNsClient={prepare:async()=>{},send:async()=>{db.sqlite.prepare("UPDATE notification_deliveries SET lease_token='newer-worker',lease_until=?").run(Date.now()+120000);return {status:'invalid_token',code:'provider_410'};}};
 await drainAPNs(db,env,client);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_devices').get().n).toBe(1);
 expect(db.sqlite.prepare('SELECT status,lease_token FROM notification_deliveries').get()).toMatchObject({status:'sending',lease_token:'newer-worker'});
});
it('applies native Groups preferences without suppressing eligible Games activity',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();gameNote();db.sqlite.exec('UPDATE notification_preferences SET groups=0,games=1');const client=nativeClient();
 await drainAPNs(db,env,client);expect(client.send).toHaveBeenCalledOnce();expect(vi.mocked(client.send).mock.calls[0][0].kind).toBe('approved');
});
it('prunes expired native event work without attempting delivery',async()=>{
 enableNativeSender();await nativePush('devices','POST',nativeRegistration);event();db.sqlite.exec('UPDATE notification_events SET expires_at=1');const client=nativeClient();
 await drainAPNs(db,env,client);expect(client.send).not.toHaveBeenCalled();expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(0);
});
it('keeps native registration disabled by default, scoped to sandbox and schema-ready development only',async()=>{
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect(await(await nativePush('settings')).json()).toEqual({available:false,deliveryAvailable:false});
 expect((await nativePush('devices','POST',nativeRegistration)).status).toBe(404);
 enableNative();expect(nativePushRegistrationEnabled(env,origin)).toBe(true);
 for(const patch of [{APNS_ENVIRONMENT:'production'},{APNS_TOPIC:'other.app'},{CF_PAGES_BRANCH:'main'},{PLAY_TOGETHER_ENVIRONMENT:'production'}])expect(nativePushRegistrationEnabled({...env,...patch},origin)).toBe(false);
 expect(nativePushRegistrationEnabled({...env,AUTH_ORIGIN:'https://opencourts.us'},'https://opencourts.us')).toBe(false);
 expect(nativePushRegistrationEnabled({...env,AUTH_ORIGIN:'http://localhost.evil.test'},'http://localhost.evil.test')).toBe(false);
 expect(nativePushRegistrationEnabled({...env,AUTH_ORIGIN:'http://127.0.0.1:8788'},'http://127.0.0.1:8788')).toBe(true);
 db.sqlite.exec('DROP TABLE native_push_devices');
 expect(await(await nativePush('settings')).json()).toEqual({available:false,deliveryAvailable:false});
 expect((await nativePush('devices','POST',nativeRegistration)).status).toBe(404);
});
it('requires native auth, CSRF, Origin, explicit consent and bounded non-fixed-length hex tokens',async()=>{
 enableNative();
 expect((await nativePush('devices','POST',nativeRegistration,{'X-CSRF-Token':'bad'})).status).toBe(403);
 expect((await nativePush('devices','POST',nativeRegistration,{Origin:'https://evil.test'})).status).toBe(403);
 expect((await nativePush('settings','GET',undefined,{Authorization:''})).status).toBe(401);
 for(const patch of [{consent:'true'},{installationId:'bad'},{deviceToken:'xyz'},{deviceToken:'abc'},{deviceToken:'ab'.repeat(513)},{environment:'production'},{topic:'other.app'}])expect((await nativePush('devices','POST',{...nativeRegistration,...patch})).status).toBe(400);
 expect((await nativePush('devices','POST',{...nativeRegistration,consent:false})).status).toBe(403);
 expect(nativePushToken('AB'.repeat(48))).toBe('ab'.repeat(48));expect(nativePushToken('01')).toBe('01');
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM native_push_devices').get().n).toBe(0);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_preferences').get().n).toBe(0);
});
it('registers APNs idempotently, preserves category choices, rotates tokens and exposes no token or installation secret',async()=>{
 enableNative();db.sqlite.prepare('INSERT INTO notification_preferences VALUES (?,0,0,1,?)').run('sam',Date.now());
 const first=await nativePush('devices','POST',nativeRegistration);expect(first.status).toBe(200);const {id}=await first.json();
 expect(await(await nativePush('devices','POST',{...nativeRegistration,deviceToken:nativeRegistration.deviceToken.toUpperCase()})).json()).toMatchObject({ok:true,id,deliveryAvailable:false});
 expect(db.sqlite.prepare("SELECT push_enabled,games,groups FROM notification_preferences WHERE player_id='sam'").get()).toMatchObject({push_enabled:1,games:0,groups:1});
 event();expect(db.sqlite.prepare('SELECT channel,status,attempts FROM notification_deliveries').get()).toMatchObject({channel:'apns',status:'pending',attempts:0});
 const send=vi.fn();await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();
 expect((await(await nativePush('devices','POST',nativeRegistration)).json()).id).toBe(id);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(1);
 const rotated=await(await nativePush('devices','POST',{...nativeRegistration,deviceToken:'ef'.repeat(48),expectedRegistrationId:id})).json();expect(rotated.id).not.toBe(id);
 expect((await(await nativePush('devices','POST',{...nativeRegistration,deviceToken:'ef'.repeat(48),expectedRegistrationId:id})).json()).id).toBe(rotated.id);
 expect((await nativePush('devices','POST',{...nativeRegistration,expectedRegistrationId:id})).status).toBe(409);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(0);
 const settings=await(await nativePush('settings')).json();expect(settings).toMatchObject({available:true,deliveryAvailable:false,environment:'sandbox',playerId:'sam'});expect(settings.devices).toHaveLength(1);
 for(const secret of [nativeRegistration.deviceToken,nativeRegistration.installationId,'endpointHash','installation_hash'])expect(JSON.stringify(settings)).not.toContain(secret);
 expect(db.sqlite.prepare('SELECT installation_hash FROM native_push_devices').get().installation_hash).not.toBe(nativeRegistration.installationId);
 expect((await nativePush('devices','DELETE',{id:rotated.id})).status).toBe(200);expect((await(await nativePush('settings')).json()).devices).toEqual([]);
});
it('rebinds an installation across native sessions/accounts without retaining old deliveries and rejects other-installation token claims',async()=>{
 enableNative();const first=await(await nativePush('devices','POST',nativeRegistration)).json();event();
 expect((await nativePush('devices','POST',{...nativeRegistration,installationId:'ee'.repeat(32)})).status).toBe(409);
 const other='host-native-push-registration-at-least-32-chars',now=Date.now();
 db.sqlite.prepare("INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at,client_type) VALUES ('host-ios','host',?,'other-csrf',?,?,'ios')").run(await hashToken(other),now,now+86400000);
 const otherHeaders={Authorization:'Bearer '+other,'X-CSRF-Token':'other-csrf'};
 const second=await(await nativePush('devices','POST',{...nativeRegistration,expectedRegistrationId:first.id},otherHeaders)).json();expect(second.id).not.toBe(first.id);
 expect((await nativePush('devices','POST',{...nativeRegistration,expectedRegistrationId:first.id})).status).toBe(409);
 expect(db.sqlite.prepare('SELECT player_id,session_id FROM notification_devices').get()).toMatchObject({player_id:'host',session_id:'host-ios'});
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(0);
 expect((await nativePush('devices','DELETE',{id:second.id})).status).toBe(200);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_devices').get().n).toBe(1);
 expect((await(await nativePush('settings')).json()).devices).toEqual([]);
});
it('immediately cascades native registrations and deliveries on logout, suspension and account deletion',async()=>{
 enableNative();await nativePush('devices','POST',nativeRegistration);event();
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=? WHERE id='s'").run(Date.now());
 for(const table of ['native_push_devices','notification_devices','notification_deliveries'])expect(db.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n).toBe(0);
 expect((await nativePush('settings')).status).toBe(401);
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=NULL WHERE id='s'").run();await nativePush('devices','POST',nativeRegistration);
 db.sqlite.prepare("UPDATE players SET status='disabled',updated_at=? WHERE id='sam'").run(Date.now());
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM native_push_devices').get().n).toBe(0);
 db.sqlite.prepare("UPDATE players SET status='active' WHERE id='sam'").run();db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=NULL WHERE id='s'").run();await nativePush('devices','POST',nativeRegistration);
 db.sqlite.prepare("DELETE FROM players WHERE id='sam'").run();
 for(const table of ['native_push_devices','notification_devices','notification_deliveries'])expect(db.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n).toBe(0);
});
it('does not register or opt in when the native session is revoked between authorization and the write batch',async()=>{
 enableNative();const batch=db.batch.bind(db);db.batch=async ops=>{db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=1 WHERE id='s'").run();return batch(ops);};
 expect((await nativePush('devices','POST',nativeRegistration)).status).toBe(409);
 for(const table of ['native_push_devices','notification_devices','notification_preferences'])expect(db.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n).toBe(0);
});
it('enforces the shared ten-registration cap without inserting a partial native device',async()=>{
 enableNative();const now=Date.now();for(let i=0;i<10;i++)db.sqlite.prepare("INSERT INTO notification_devices VALUES(?, 'sam','s','webpush',?,?,'','','',?,?,NULL)").run('web-'+i,'hash-'+i,'endpoint-'+i,now,now);
 expect((await nativePush('devices','POST',nativeRegistration)).status).toBe(409);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM native_push_devices').get().n).toBe(0);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_devices').get().n).toBe(10);
});
it('cleans expired native registrations and queued work independently of VAPID readiness',async()=>{
 enableNative();await nativePush('devices','POST',nativeRegistration);event();
 db.sqlite.prepare("UPDATE auth_sessions SET expires_at=1 WHERE id='s'").run();
 delete env.PUSH_VAPID_PRIVATE_KEY;
 await cleanupNativePushDevices(db);
 for(const table of ['native_push_devices','notification_devices','notification_deliveries'])expect(db.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n).toBe(0);
});
it('refreshes only an already authorized installation without re-enabling account-wide push',async()=>{
 enableNative();const first=await(await nativePush('devices','POST',nativeRegistration)).json();
 db.sqlite.prepare("UPDATE notification_preferences SET push_enabled=0,games=0,groups=1 WHERE player_id='sam'").run();
 expect((await nativePush('devices','POST',{...nativeRegistration,consent:false,deviceToken:'ef'.repeat(48),expectedRegistrationId:first.id})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT push_enabled,games,groups FROM notification_preferences WHERE player_id='sam'").get()).toMatchObject({push_enabled:0,games:0,groups:1});
 event();expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(0);
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=1 WHERE id='s'").run();
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=NULL WHERE id='s'").run();
 expect((await nativePush('devices','POST',{...nativeRegistration,consent:false})).status).toBe(403);
});
it('shares native preference semantics without depending on browser VAPID configuration',async()=>{
 enableNative();delete env.PUSH_VAPID_PUBLIC_KEY;delete env.PUSH_VAPID_PRIVATE_KEY;
 expect((await(await req('settings','GET',undefined,{Cookie:'',Authorization:'Bearer '+token})).json()).available).toBe(false);
 expect((await nativePush('preferences','PATCH',{enabled:true,games:false,groups:true})).status).toBe(200);
 expect((await(await nativePush('settings')).json()).preferences).toEqual({enabled:1,games:0,groups:1});
 expect((await nativePush('preferences','PATCH',{enabled:false,games:true})).status).toBe(400);
 expect((await nativePush('preferences','PATCH',{enabled:false,games:true,groups:false},{'X-CSRF-Token':'bad'})).status).toBe(403);
 expect((await nativePush('preferences','PATCH',{enabled:false,games:true,groups:false})).status).toBe(200);
 expect((await(await nativePush('settings')).json()).preferences).toEqual({enabled:0,games:1,groups:0});
});
it('reviews only a possessed installation version without exposing token or account identity',async()=>{
 enableNative();expect(await(await nativePush('installation','POST',{installationId:nativeRegistration.installationId})).json()).toEqual({registrationId:null,currentSession:false});
 const {id}=await(await nativePush('devices','POST',nativeRegistration)).json();
 expect(await(await nativePush('installation','POST',{installationId:nativeRegistration.installationId})).json()).toEqual({registrationId:id,currentSession:true});
 expect(await(await nativePush('installation','POST',{installationId:'ef'.repeat(32)})).json()).toEqual({registrationId:null,currentSession:false});
 expect((await nativePush('installation','POST',{installationId:nativeRegistration.installationId},{'X-CSRF-Token':'bad'})).status).toBe(403);
 const other='host-installation-review-session-at-least-32-chars',now=Date.now();db.sqlite.prepare("INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at,client_type) VALUES ('review-host','host',?,'other-csrf',?,?,'ios')").run(await hashToken(other),now,now+86400000);
 expect(await(await nativePush('installation','POST',{installationId:nativeRegistration.installationId},{Authorization:'Bearer '+other,'X-CSRF-Token':'other-csrf'})).json()).toEqual({registrationId:id,currentSession:false});
});
it('supports native bearer preference review, explicit saves and owned-device removal with session and CSRF guards',async()=>{
 const id=await register();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios' WHERE id='s'").run();
 const native=(path:string,method='GET',body?:unknown,headers:Record<string,string>={})=>req(path,method,body,{Cookie:'',Authorization:'Bearer '+token,...headers});
 const settings=await(await native('settings')).json();
 expect(settings).toMatchObject({available:true,preferences:{enabled:1,games:1,groups:1}});
 expect(settings.devices[0]).toMatchObject({id,transport:'webpush',currentSession:true});
 expect(JSON.stringify(settings)).not.toContain(subscription.endpoint);
 expect((await native('preferences','PATCH',{enabled:false,games:true,groups:false},{'X-CSRF-Token':'wrong'})).status).toBe(403);
 expect((await native('preferences','PATCH',{enabled:false,games:true})).status).toBe(400);
 expect((await native('preferences','PATCH',{enabled:false,games:true,groups:false},{Origin:'https://evil.test'})).status).toBe(403);
 expect((await native('preferences','PATCH',{enabled:false,games:true,groups:false})).status).toBe(200);
 expect((await(await native('settings')).json()).preferences).toEqual({enabled:0,games:1,groups:0});
 expect((await native('devices','DELETE',{id})).status).toBe(200);
 expect((await(await native('settings')).json()).devices).toEqual([]);
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=1 WHERE id='s'").run();
 expect((await native('settings')).status).toBe(401);
 expect((await native('preferences','PATCH',{enabled:true,games:true,groups:true})).status).toBe(401);
});
it('isolates native settings and unregister from other accounts and fails closed when push is unavailable',async()=>{
 const id=await register(),other='other-native-push-session-at-least-32-characters',now=Date.now();
 db.sqlite.prepare("INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at,client_type) VALUES ('native-host','host',?,'host-csrf',?,?,'ios')").run(await hashToken(other),now,now+86400000);
 const native=(path:string,method='GET',body?:unknown)=>req(path,method,body,{Cookie:'',Authorization:'Bearer '+other,'X-CSRF-Token':'host-csrf'});
 expect((await(await native('settings')).json()).devices).toEqual([]);
 expect((await native('devices','DELETE',{id})).status).toBe(200);
 expect(db.sqlite.prepare('SELECT player_id FROM notification_devices WHERE id=?').get(id).player_id).toBe('sam');
 expect((await native('preferences','PATCH',{enabled:false,games:false,groups:true})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT push_enabled,games,groups FROM notification_preferences WHERE player_id='sam'").get()).toMatchObject({push_enabled:1,games:1,groups:1});
 expect((await req('settings','GET',undefined,{Cookie:'',Authorization:'Bearer '+token})).status).toBe(401);
 expect((await req('settings','GET',undefined,{Cookie:'__Host-oc_session='+other})).status).toBe(401);
 env.PUSH_ENABLED='false';
 expect(await(await native('settings')).json()).toEqual({available:false});
 expect((await native('preferences','PATCH',{enabled:true,games:true,groups:true})).status).toBe(404);
});
function event(id='note'){const now=Date.now();db.sqlite.prepare("INSERT INTO tennis_groups(id,owner_id,name,public_description,description,general_location,skill_preference,visibility,status,created_at,updated_at,request_id) VALUES ('group','host','Secret group','','','Fairfax','any','private','active',?,?,'r') ON CONFLICT DO NOTHING").run(now,now);db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,status,created_at,updated_at) VALUES ('group','sam','active',?,?) ON CONFLICT DO NOTHING").run(now,now);db.sqlite.prepare("INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at) VALUES (?,'group','sam','host','group_active',?)").run(id,now);}
it('requires authentication, Origin and CSRF',async()=>{expect((await req('settings','GET',undefined,{Cookie:''})).status).toBe(401);expect((await req('devices','POST',{subscription},{Origin:'https://evil.test'})).status).toBe(403);expect((await req('devices','POST',{subscription},{'X-CSRF-Token':'bad'})).status).toBe(403);});
it('fails closed when disabled or using the wrong environment, while allowing all accounts',async()=>{env.PUSH_ENABLED='false';expect((await(await req('settings')).json()).available).toBe(false);env.PUSH_ENABLED='true';env.PUSH_ALLOWED_PLAYER_IDS='someoneelse';expect((await(await req('settings')).json()).available).toBe(true);env.PUSH_ALLOWED_PLAYER_IDS='';expect((await(await req('settings')).json()).available).toBe(true);env.CF_PAGES_BRANCH='main';expect((await req('settings')).status).toBe(404);});
it('rejects untrusted endpoint hosts, userinfo and malformed keys',async()=>{for(const endpoint of ['http://fcm.googleapis.com/x','https://localhost/x','https://fcm.googleapis.com.evil.test/x','https://user@fcm.googleapis.com/x','https://fcm.googleapis.com:444/x']){expect(validPushEndpoint(endpoint)).toBe(false);expect((await req('devices','POST',{subscription:{...subscription,endpoint}})).status).toBe(400);}expect((await req('devices','POST',{subscription:{...subscription,keys:{p256dh:'bad',auth:'bad'}}})).status).toBe(400);});
it('registers idempotently without exposing endpoints or keys',async()=>{const id=await register();expect(await register()).toBe(id);const s=await(await req('settings')).json();expect(s.devices).toHaveLength(1);expect(s.devices[0]).toMatchObject({currentSession:true});expect(JSON.stringify(s)).not.toContain(subscription.endpoint);expect(JSON.stringify(s)).not.toContain(subscription.keys.auth);});
it('does not replay pre-subscription notifications and fans out once',async()=>{event('old');await register();expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(0);event();expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(1);});
it('preference opt-out prevents fanout and pending delivery',async()=>{await register();event();await req('preferences','PATCH',{enabled:false,games:true,groups:true});const send=vi.fn().mockResolvedValue(true);await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();event('new');expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(1);});
it('sends generic payload once with no group/player details',async()=>{await register();event();const send=vi.fn().mockResolvedValue(true);await drainPush(db,env,send);await drainPush(db,env,send);expect(send).toHaveBeenCalledTimes(1);const payload=new TextDecoder().decode(send.mock.calls[0][1].bytes);expect(JSON.parse(payload)).toMatchObject({version:1,kind:'group_active'});expect(payload).not.toContain('SECRET');expect(payload).not.toContain('Secret group');expect(db.sqlite.prepare('SELECT status FROM notification_deliveries').get().status).toBe('sent');});
it('read notifications are not pushed',async()=>{await register();event();db.sqlite.exec('UPDATE group_notifications SET read_at=1');const send=vi.fn();await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();});
it('does not create an inbox record or queue push for self-authored notifications',async()=>{
 await register();event();
 db.sqlite.exec("INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at) VALUES ('self','group','sam','sam','group_active',1)");
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM group_notifications WHERE id='self'").get().n).toBe(0);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_events').get().n).toBe(1);
});
it('migration removes identifiable historical self schedule notifications and queued pushes while preserving other recipients',async()=>{
 db.sqlite.close();db=new DB(false);env.COURTS_DB=db;const now=Date.now();
 for(const id of ['sam','host'])db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run(id,id,now,now);
 db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run('s','sam',await hashToken(token),'csrf',now,now+86400000);
 await register();gameNote();db.sqlite.exec("UPDATE games SET organizer_id='sam'");
 for(const id of ['sam','host'])db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run('game',id,now);
 db.sqlite.prepare('INSERT INTO game_series_changes VALUES (?,?,?,?,?)').run('change','sam',await hashToken(token),'hash',Date.now());
 db.sqlite.prepare("INSERT INTO game_series_change_targets SELECT 'change',id,version,starts_at+1800000,ends_at+1800000,'scheduled',1 FROM games WHERE id='game'").run();
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM notification_events WHERE source='game_schedule_notifications' AND recipient_id='sam'").get().n).toBe(1);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM notification_deliveries d JOIN notification_events e ON e.id=d.event_id WHERE e.source='game_schedule_notifications'").get().n).toBe(1);
 db.sqlite.prepare("INSERT INTO game_schedule_notifications(id,game_id,recipient_id,old_start,new_start,created_at) VALUES ('unknown','game','sam',1,2,?)").run(now-1);
 db.sqlite.exec(readFileSync('functions/db/migrations/0025_notification_action_actor.sql','utf8'));
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_schedule_notifications WHERE recipient_id='sam' AND id!='unknown'").get().n).toBe(0);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM notification_events WHERE source='game_schedule_notifications' AND recipient_id='sam' AND source_id!='unknown'").get().n).toBe(0);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM notification_deliveries d JOIN notification_events e ON e.id=d.event_id WHERE e.source='game_schedule_notifications' AND e.source_id!='unknown'").get().n).toBe(0);
 expect(db.sqlite.prepare("SELECT recipient_id,actor_id FROM game_schedule_notifications WHERE recipient_id='host'").get()).toMatchObject({recipient_id:'host',actor_id:'sam'});
 expect(db.sqlite.prepare("SELECT actor_id FROM game_schedule_notifications WHERE id='unknown'").get()).toMatchObject({actor_id:null});
});
it('suppresses every actor-driven notification kind before inbox insertion and push fanout',async()=>{
 await register();event();gameNote();const before=db.sqlite.prepare('SELECT COUNT(*) n FROM notification_events').get().n;
 for(const kind of ['requested','withdrawn','cancelled','approved','rejected','removed','game_cancelled'])db.sqlite.prepare("INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,places_released,created_at) VALUES (?,'game','sam','sam',?,0,1)").run('self-'+kind,kind);
 for(const kind of ['group_requested','group_active','group_rejected','group_removed','group_archived'])db.sqlite.prepare("INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at) VALUES (?,'group','sam','sam',?,1)").run('self-'+kind,kind);
 for(const kind of ['guest_requested','guest_approved','guest_rejected','guest_cancelled'])db.sqlite.prepare("INSERT INTO game_guest_notifications(id,game_id,recipient_id,actor_id,kind,guest_count,created_at) VALUES (?,'game','sam','sam',?,1,1)").run('self-'+kind,kind);
 db.sqlite.prepare("INSERT INTO game_schedule_notifications(id,game_id,recipient_id,actor_id,old_start,new_start,created_at) VALUES ('self-schedule','game','sam','sam',1,2,1)").run();
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_events').get().n).toBe(before);
 for(const table of ['game_notifications','group_notifications','game_guest_notifications','game_schedule_notifications'])expect(db.sqlite.prepare('SELECT COUNT(*) n FROM '+table+" WHERE id LIKE 'self-%'").get().n).toBe(0);
 expect(()=>db.sqlite.prepare("INSERT INTO player_game_invitations(id,game_id,sender_id,recipient_id,created_at) VALUES ('self-invite','game','sam','sam',1)").run()).toThrow(/CHECK/);
});
it('signout stops queued sends and removes subscriptions',async()=>{await register();event();db.sqlite.exec('UPDATE auth_sessions SET revoked_at=1');const send=vi.fn();await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_devices').get().n).toBe(0);});
it('account deletion cascades devices events and deliveries',async()=>{await register();event();db.sqlite.exec("DELETE FROM players WHERE id='sam'");for(const table of ['notification_devices','notification_events','notification_deliveries'])expect(db.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n).toBe(0);});
it('removes gone endpoints without retries',async()=>{await register();event();await drainPush(db,env,vi.fn().mockResolvedValue(false));expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_devices').get().n).toBe(0);});
it('retries transient provider errors but never stores secret errors',async()=>{await register();event();const send=vi.fn().mockRejectedValue(new WebPushError('private',503,'secret-body',subscription.endpoint,'120'));await drainPush(db,env,send);const d=db.sqlite.prepare('SELECT * FROM notification_deliveries').get();expect(d.status).toBe('pending');expect(d.last_error).toBe('provider_503');expect(d.next_attempt_at).toBeGreaterThan(Date.now()+100000);await drainPush(db,env,send);expect(send).toHaveBeenCalledTimes(1);});
it('fails terminal provider errors without retry loops',async()=>{await register();event();await drainPush(db,env,vi.fn().mockRejectedValue(new WebPushError('private',403,'secret',subscription.endpoint)));expect(db.sqlite.prepare('SELECT status FROM notification_deliveries').get().status).toBe('failed');});
it('overlapping workers claim a delivery only once',async()=>{await register();event();const send=vi.fn().mockResolvedValue(true);await Promise.all([drainPush(db,env,send),drainPush(db,env,send)]);expect(send).toHaveBeenCalledTimes(1);});
it('unsubscribing cancels queued device deliveries',async()=>{const id=await register();event();await req('devices','DELETE',{id});expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(0);});
it('expired events are removed without delivery',async()=>{await register();event();db.sqlite.exec('UPDATE notification_events SET expires_at=1');const send=vi.fn();await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_events').get().n).toBe(0);});
it('worker refuses production origin and missing development marker',async()=>{await register();event();const send=vi.fn();await drainPush(db,{...env,AUTH_ORIGIN:'https://opencourts.us'},send);await drainPush(db,{...env,PUSH_ENVIRONMENT:undefined},send);expect(send).not.toHaveBeenCalled();});

it('prevents old-account deliveries when the same browser signs into another account',async()=>{
 await register();event();const now=Date.now(),other='other-session-token-longer-than-32-characters';
 db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run('other','Other',now,now);
 db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run('other','other',await hashToken(other),'csrf',now,now+86400000);
 env.PUSH_ALLOWED_PLAYER_IDS='sam,other';expect((await req('devices','POST',{subscription},{Cookie:'__Host-oc_session='+other})).status).toBe(200);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_deliveries').get().n).toBe(0);expect(db.sqlite.prepare('SELECT player_id FROM notification_devices').get().player_id).toBe('other');
});
it('membership revoked before delivery suppresses stale membership approval',async()=>{await register();event();db.sqlite.exec("UPDATE group_memberships SET status='removed' WHERE player_id='sam'");db.sqlite.exec("UPDATE notification_events SET kind='group_active'");const send=vi.fn().mockResolvedValue(true);await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();});
it('block relationships suppress actor notifications',async()=>{await register();event();db.sqlite.exec("UPDATE group_notifications SET actor_id='host';INSERT INTO player_blocks VALUES('sam','host',1)");const send=vi.fn();await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();});
it('Web Push adapter encrypts an actual request without network access',async()=>{await register();event();const fetcher=vi.fn().mockResolvedValue(new Response(null,{status:201}));vi.stubGlobal('fetch',fetcher);await drainPush(db,env);expect(fetcher).toHaveBeenCalledTimes(1);const request=fetcher.mock.calls[0][1];expect(request.headers.Authorization??request.headers.authorization).toContain('vapid');expect(request.headers['Content-Encoding']??request.headers['content-encoding']).toBe('aes128gcm');expect(request.body).toBeInstanceOf(Uint8Array);expect(new TextDecoder().decode(request.body)).not.toContain('OpenCourts');});
it('deleting another accounts device has no effect',async()=>{await register();const r=await req('devices','DELETE',{id:'not-my-device'});expect(r.status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_devices').get().n).toBe(1);});
it('lost worker leases retry, with a maximum of five attempts',async()=>{await register();event();db.sqlite.exec("UPDATE notification_deliveries SET status='sending',lease_until=1,attempts=4");await drainPush(db,env,vi.fn().mockRejectedValue(new TypeError('secret endpoint')));expect(db.sqlite.prepare('SELECT status,attempts FROM notification_deliveries').get()).toMatchObject({status:'failed',attempts:5});});

function gameNote(visibility='public'){
 const now=Date.now();if(visibility==='group')event('fixture');
 db.sqlite.prepare(`INSERT INTO games(id,organizer_id,visibility,group_id,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,request_id,request_hash,created_at,updated_at) VALUES ('game','host',?,?,'Private title','court','Private address',38,-77,'public',?,?,'UTC','doubles',4,'game','hash',?,?)`).run(visibility,visibility==='group'?'group':null,now+3600000,now+7200000,now,now);
 db.sqlite.prepare("INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,places_released,created_at) VALUES ('game-note','game','sam','host','approved',0,?)").run(now);
}
function reminderGame(id:string,startsAt:number,createdAt:number){
 db.sqlite.prepare(`INSERT INTO games(id,organizer_id,visibility,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,request_id,request_hash,created_at,updated_at)
  VALUES (?,'host','public','Reminder fixture','court','Court',38,-77,'public',?,?,'UTC','doubles',4,?,'hash',?,?)`).run(id,startsAt,startsAt+3600000,id,createdAt,createdAt);
 db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,'host',createdAt);
 db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,'sam',createdAt);
}
it('queues 24-hour and 3-hour game reminders once for current confirmed players at their due windows',async()=>{
 const now=Date.now(),startsAt=now+25*3600000;await register();reminderGame('reminder-game',startsAt,now);
 expect(await enqueueGameReminders(db,now)).toBe(0);
 expect(await enqueueGameReminders(db,now+3600000)).toBe(2);
 expect(await enqueueGameReminders(db,now+3600000)).toBe(0);
 expect(db.sqlite.prepare("SELECT recipient_id,kind,source_id FROM notification_events WHERE source='game_reminders' ORDER BY recipient_id").all()).toMatchObject([
  {recipient_id:'host',kind:'game_reminder_24h',source_id:`reminder-game:${startsAt}:game_reminder_24h`},
  {recipient_id:'sam',kind:'game_reminder_24h',source_id:`reminder-game:${startsAt}:game_reminder_24h`},
 ]);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM notification_deliveries d JOIN notification_events e ON e.id=d.event_id WHERE e.source='game_reminders'").get().n).toBe(1);
 expect(await enqueueGameReminders(db,now+22*3600000)).toBe(2);
 expect(await enqueueGameReminders(db,now+22*3600000)).toBe(0);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM notification_events WHERE source='game_reminders' AND kind='game_reminder_3h'").get().n).toBe(2);
});
it('omits missed or short-notice reminders and suppresses queued reminders after schedule or attendance changes',async()=>{
 const now=Date.now();await register();
 reminderGame('short-game',now+20*3600000,now);
 reminderGame('missed-game',now+23*3600000,now-48*3600000);
 expect(await enqueueGameReminders(db,now)).toBe(0);
 expect(await enqueueGameReminders(db,now+17*3600000+20*60000)).toBe(2);
 const eventRow=db.sqlite.prepare("SELECT e.*,q.id AS delivery_id,q.device_id,q.attempts,d.endpoint,d.p256dh,d.auth,d.key_id,d.session_id,d.transport FROM notification_events e JOIN notification_deliveries q ON q.event_id=e.id JOIN notification_devices d ON d.id=q.device_id WHERE e.source='game_reminders' AND e.entity_id='short-game' LIMIT 1").get() as any;
 expect(await eventStillVisible(db,eventRow,Date.now())).toBe(true);
 db.sqlite.prepare("UPDATE games SET starts_at=starts_at+3600000,ends_at=ends_at+3600000 WHERE id='short-game'").run();
 expect(await eventStillVisible(db,eventRow,Date.now())).toBe(false);
});
it('does not send a queued game reminder after the recipient is no longer playing',async()=>{
 const now=Date.now();await register();reminderGame('left-game',now+25*3600000,now-3600000);
 await enqueueGameReminders(db,now+3600000);
 db.sqlite.prepare("DELETE FROM game_participants WHERE game_id='left-game' AND player_id='sam'").run();
 const reminder=db.sqlite.prepare("SELECT e.*,q.id AS delivery_id,q.device_id,q.attempts,d.endpoint,d.p256dh,d.auth,d.key_id,d.session_id,d.transport FROM notification_events e JOIN notification_deliveries q ON q.event_id=e.id JOIN notification_devices d ON d.id=q.device_id WHERE e.source='game_reminders' AND e.recipient_id='sam' LIMIT 1").get() as any;
 expect(await eventStillVisible(db,reminder,Date.now())).toBe(false);
});
it('private-game membership removal prevents queued content delivery',async()=>{await register();gameNote('group');db.sqlite.exec("UPDATE group_memberships SET status='removed' WHERE player_id='sam';UPDATE group_notifications SET read_at=1");const send=vi.fn();await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();});
it('completed games suppress delayed updates',async()=>{await register();gameNote();db.sqlite.exec('UPDATE games SET starts_at=1');const send=vi.fn();await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();});
it('revoked unlisted access prevents queued delivery',async()=>{await register();gameNote('unlisted');const send=vi.fn();await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();});
it('category preferences prevent group events without disabling game activity',async()=>{await register();await req('preferences','PATCH',{enabled:true,games:true,groups:false});event();gameNote();const send=vi.fn().mockResolvedValue(true);await drainPush(db,env,send);expect(send).toHaveBeenCalledTimes(1);});

it('APNs and email reserved deliveries are not sent by the Web Push adapter',async()=>{await register();event();db.sqlite.exec("UPDATE notification_deliveries SET channel='apns'");const send=vi.fn();await drainPush(db,env,send);expect(send).not.toHaveBeenCalled();});
it('device cap prevents an eleventh active subscription',async()=>{for(let i=0;i<10;i++){subscription.endpoint='https://fcm.googleapis.com/fcm/send/test-'+i;await register();}subscription.endpoint='https://fcm.googleapis.com/fcm/send/too-many';expect((await req('devices','POST',{subscription})).status).toBe(409);});

it('production push requires explicit production rollout and rejects copied development settings',()=>{
 const production={...env,AUTH_ORIGIN:'https://opencourts.us',CF_PAGES_BRANCH:'main',PLAY_TOGETHER_ENVIRONMENT:'production',PLAY_TOGETHER_PRODUCTION_ENABLED:'true',PUSH_ENVIRONMENT:'production',PUSH_ALLOWED_PLAYER_IDS:''};
 expect(pushEnvironmentEnabled(production)).toBe(true);expect(pushTester(production,'new-opted-in-player')).toBe(true);
 for(const patch of [{PUSH_ENABLED:'false'},{PLAY_TOGETHER_ENABLED:'false'},{PLAY_TOGETHER_ENVIRONMENT:'development'},{PLAY_TOGETHER_PRODUCTION_ENABLED:undefined},{CF_PAGES_BRANCH:'feature/play-together'},{AUTH_ORIGIN:origin},{PUSH_ENVIRONMENT:'development'}])expect(pushEnvironmentEnabled({...production,...patch})).toBe(false);
});

it('drains production notifications only after explicit rollout while retaining preferences and session checks',async()=>{
 await register();event();const send=vi.fn().mockResolvedValue(true);
 const production={...env,AUTH_ORIGIN:'https://opencourts.us',CF_PAGES_BRANCH:'main',PLAY_TOGETHER_ENVIRONMENT:'production',PLAY_TOGETHER_PRODUCTION_ENABLED:'true',PUSH_ENVIRONMENT:'production',PUSH_ALLOWED_PLAYER_IDS:''};
 await drainPush(db,production,send);expect(send).toHaveBeenCalledTimes(1);
 event('production-disabled');await drainPush(db,{...production,PUSH_ENABLED:'false'},send);expect(send).toHaveBeenCalledTimes(1);
 db.sqlite.exec('UPDATE notification_preferences SET push_enabled=0');await drainPush(db,production,send);expect(send).toHaveBeenCalledTimes(1);
});

it('photo cleanup deletes only queued objects that are no longer referenced',async()=>{
 db.sqlite.exec("INSERT INTO media_assets VALUES ('player','sam','keep','v',1); INSERT INTO media_cleanup VALUES ('keep',1),('old',1)");const bucket={delete:vi.fn().mockResolvedValue(undefined)};
 expect(await cleanupMedia(db,bucket)).toEqual({removed:1,failed:0});expect(bucket.delete).toHaveBeenCalledWith('old');expect(bucket.delete).not.toHaveBeenCalledWith('keep');
 expect(db.sqlite.prepare('SELECT object_key FROM media_cleanup').get().object_key).toBe('keep');
});
it('photo cleanup retains failed objects for the next scheduled retry',async()=>{
 db.sqlite.exec("INSERT INTO media_cleanup VALUES ('old',1)");const bucket={delete:vi.fn().mockRejectedValueOnce(new Error('storage unavailable')).mockResolvedValue(undefined)};
 expect(await cleanupMedia(db,bucket)).toEqual({removed:0,failed:1});expect(await cleanupMedia(db,bucket)).toEqual({removed:1,failed:0});expect(db.sqlite.prepare('SELECT COUNT(*) n FROM media_cleanup').get().n).toBe(0);
});
it('production scheduled maintenance cleans deleted photos even with push disabled and refuses mixed environments',async()=>{
 db.sqlite.exec("INSERT INTO media_cleanup VALUES ('old',1)");const bucket={delete:vi.fn().mockResolvedValue(undefined)};
 const production={...env,AUTH_ORIGIN:'https://opencourts.us',CF_PAGES_BRANCH:'main',PLAY_TOGETHER_ENVIRONMENT:'production',PLAY_TOGETHER_PRODUCTION_ENABLED:'true',PUSH_ENVIRONMENT:'production',PUSH_ENABLED:'false',PLAY_TOGETHER_MEDIA:bucket};
 await worker.scheduled(null,{...production,CF_PAGES_BRANCH:'feature/play-together'});expect(bucket.delete).not.toHaveBeenCalled();await worker.scheduled(null,production);expect(bucket.delete).toHaveBeenCalledWith('old');
});

it('allows a previously unlisted account to register and receive opted-in push with an empty legacy list',async()=>{
 env.PUSH_ALLOWED_PLAYER_IDS='';expect(pushTester(env,'new-player')).toBe(true);const now=Date.now(),otherToken='all-account-push-session-with-enough-entropy';db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run('new-player','New player',now,now);db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run('new-session','new-player',await hashToken(otherToken),'csrf',now,now+86400000);
 const registered=await req('devices','POST',{subscription},{Cookie:'__Host-oc_session='+otherToken});expect(registered.status).toBe(200);event();db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,status,role,created_at,updated_at) VALUES ('group','new-player','active','member',?,?)").run(now,now);db.sqlite.prepare("INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at) VALUES ('new-account-note','group','new-player','host','group_active',?)").run(Date.now());const send=vi.fn().mockResolvedValue(true);await drainPush(db,env,send);expect(send).toHaveBeenCalledTimes(1);expect(db.sqlite.prepare("SELECT status FROM notification_deliveries WHERE event_id IN(SELECT id FROM notification_events WHERE recipient_id='new-player')").get().status).toBe('sent');
});
