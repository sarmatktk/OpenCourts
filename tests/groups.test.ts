import {groupGameAccess} from '../functions/lib/group-game-access';
import {handleMedia,safeWebp,type MediaEnv} from '../functions/lib/media';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {handleAuth} from '../functions/lib/auth';
import {handleGames,courtSelectionToken} from '../functions/lib/games';
import {handleGroups} from '../functions/lib/groups';
import {hashToken,type AuthDatabase,type AuthStatement,type AuthEnv} from '../functions/lib/auth';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite');
class DB implements AuthDatabase{
 sqlite=new DatabaseSync(':memory:');
 constructor(){this.sqlite.exec('PRAGMA foreign_keys=ON');for(const f of ['0001_create_tennis_courts.sql','0002_player_auth.sql','0003_public_games.sql','0004_game_participation.sql','0005_game_cancellations.sql','0006_host_notifications.sql','0007_request_notifications.sql','0008_player_notifications.sql','0009_tennis_groups.sql','0010_group_notifications.sql','0011_group_roles.sql','0012_media_assets.sql','0013_group_invitations.sql','0014_group_games.sql','0015_group_game_lifecycle.sql','0016_game_guests.sql','0017_sharing_safety.sql','0018_player_game_invitations.sql','0019_multi_court_events.sql','0020_weekly_game_series.sql','0021_group_game_waitlist.sql','0022_public_group_events.sql','0023_series_management.sql','0024_notification_delivery.sql','0025_notification_action_actor.sql','0026_account_moderation.sql','0027_game_chat.sql','0028_series_chat.sql','0029_series_chat_staff.sql','0030_chat_lifecycle_notices.sql','0031_game_capacity_edit.sql','0036_members_only_group_games.sql','0039_game_capacity_notifications.sql','0040_capacity_chat_access.sql'])this.sqlite.exec(readFileSync('functions/db/migrations/'+f,'utf8'));}
 prepare(sql:string):AuthStatement{let args:unknown[]=[];const s:AuthStatement={bind(...v){args=v;return s;},first:async<T>()=>(this.sqlite.prepare(sql).get(...args)??null) as T|null,all:async<T>()=>({results:this.sqlite.prepare(sql).all(...args) as T[]}),run:async()=>({meta:{changes:Number(this.sqlite.prepare(sql).run(...args).changes)}})};return s;}
 async batch(statements:AuthStatement[]){this.sqlite.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());this.sqlite.exec('COMMIT');return r;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const origin='http://127.0.0.1:8788';let db:DB,env:AuthEnv;const tokens:Record<string,string>={};
beforeEach(async()=>{db=new DB();env={COURTS_DB:db,PLAY_TOGETHER_ENABLED:'true',AUTH_ORIGIN:origin};for(const id of ['owner','admin','member','outsider']){const token='test-session-for-'+id+'-with-more-than-32-characters';tokens[id]=token;db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run(id,'Name '+id,Date.now(),Date.now());db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run(id,id,await hashToken(token),'csrf',Date.now(),Date.now()+86400000);}});
afterEach(()=>db.sqlite.close());
function req(path='',method='GET',body?:unknown,who='owner',extra:Record<string,string>={}){return new Request(origin+'/api/groups'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(who?{Cookie:'oc_session='+tokens[who],'X-CSRF-Token':'csrf'}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});}
const input=()=>({name:'Fairfax Tennis',publicDescription:'Public preview',description:'PRIVATE-CONTENT-SENTINEL',generalLocation:'Fairfax, VA',skillPreference:'advanced',visibility:'private',requestId:crypto.randomUUID()});
function nativeGroupCall(id:string,action:string,who='owner',body?:unknown,csrf='csrf'){
 return handleGroups(new Request(`${origin}/api/groups/${id}${action?'/'+action:''}`,{method:body===undefined?'GET':'POST',headers:{Origin:origin,Authorization:'Bearer '+tokens[who],'X-CSRF-Token':csrf,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
}
async function create(body=input()){const r=await handleGroups(req('','POST',body),env);expect(r.status).toBe(201);return (await r.json()).id as string;}
async function call(path:string,action:string,body={},who='owner'){return handleGroups(req('/'+path+'/'+action,'POST',body,who),env);}
async function member(id:string,who:string){expect((await call(id,'request',{},who)).status).toBe(200);expect((await call(id,'approve',{playerId:who})).status).toBe(200);}

const groupInvitationPreview=(token:string)=>handleGroups(req('/invitation-preview','POST',{token},''),env);
it.each(['public','private'])('native %s group membership links expose limited preview and create one pending request',async visibility=>{
 const id=await create({...input(),visibility});db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const response=await nativeGroupCall(id,'invitations','owner',{expiresInDays:7});expect(response.status).toBe(201);const link=await response.json();const token=new URL(link.url).hash.slice(1);
 expect(token).toMatch(/^[a-f0-9]{64}$/);expect(JSON.stringify(db.sqlite.prepare('SELECT * FROM group_invitations').get())).not.toContain(token);
 const preview=await groupInvitationPreview(token);expect(preview.status).toBe(200);const publicData=await preview.json();expect(publicData.group.id).toBe(id);expect(JSON.stringify(publicData)).not.toMatch(/PRIVATE-CONTENT|owner_id|token_hash|advanced/);
 for(let i=0;i<2;i++)expect((await nativeGroupCall('invitation-accept','','outsider',{token})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT status FROM group_memberships WHERE group_id=? AND player_id='outsider'").get(id).status).toBe('pending');
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM group_invitation_redemptions').get().n).toBe(1);
 expect((await nativeGroupCall(id,'members','outsider')).status).toBe(403);
 expect((await(await nativeGroupCall(id,'','outsider')).json()).content).toBeUndefined();
});

it.each([1,7,30,null])('native group invitation expiry %s matches the server contract',async days=>{
 const id=await create();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();const start=Date.now();
 const response=await nativeGroupCall(id,'invitations','owner',{expiresInDays:days});expect(response.status).toBe(201);const link=await response.json();
 if(days===null)expect(link.expiresAt).toBeNull();else{expect(link.expiresAt).toBeGreaterThanOrEqual(start+days*86400000);expect(link.expiresAt).toBeLessThanOrEqual(Date.now()+days*86400000);}
 const listed=(await(await nativeGroupCall(id,'invitations')).json()).invitations;expect(listed[0]).toMatchObject({id:link.id,expiresAt:link.expiresAt,revokedAt:null});expect(listed[0]).not.toHaveProperty('url');expect(listed[0]).not.toHaveProperty('token');
 db.sqlite.prepare('UPDATE group_invitations SET expires_at=0 WHERE id=?').run(link.id);const token=new URL(link.url).hash.slice(1);
 expect((await groupInvitationPreview(token)).status).toBe(404);expect((await nativeGroupCall('invitation-accept','','outsider',{token})).status).toBe(404);
});

it.each(['owner','coowner','admin','organizer','member'])('native %s invitation management follows current Owner/Co-owner scope',async role=>{
 const id=await create();let actor='owner';if(role!=='owner'){
  await member(id,'admin');actor='admin';db.sqlite.prepare("UPDATE group_memberships SET role=?,assigned_role=? WHERE group_id=? AND player_id='admin'").run(role==='admin'?'admin':'member',role==='admin'?null:role,id);
 }
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGroupCall(id,'invitations',actor,{expiresInDays:7},'wrong')).status).toBe(403);
 const allowed=['owner','coowner'].includes(role);
 expect((await nativeGroupCall(id,'invitations',actor)).status).toBe(allowed?200:403);
 const response=await nativeGroupCall(id,'invitations',actor,{expiresInDays:7});expect(response.status).toBe(allowed?201:403);
 if(allowed){const link=await response.json();expect((await nativeGroupCall(id,'revoke-invitation',actor,{invitationId:link.id})).status).toBe(200);expect((await groupInvitationPreview(new URL(link.url).hash.slice(1))).status).toBe(404);}
 else expect((await nativeGroupCall(id,'revoke-invitation',actor,{invitationId:crypto.randomUUID()})).status).toBe(403);
});

it('native revocation preserves existing approved members and pending requests',async()=>{
 const id=await create();await member(id,'member');db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const link=await(await nativeGroupCall(id,'invitations','owner',{expiresInDays:null})).json(),token=new URL(link.url).hash.slice(1);
 expect((await nativeGroupCall('invitation-accept','','member',{token})).status).toBe(200);
 expect((await nativeGroupCall('invitation-accept','','outsider',{token})).status).toBe(200);
 await nativeGroupCall(id,'revoke-invitation','owner',{invitationId:link.id});
 expect(db.sqlite.prepare("SELECT status FROM group_memberships WHERE group_id=? AND player_id='member'").get(id).status).toBe('active');
 expect(db.sqlite.prepare("SELECT status FROM group_memberships WHERE group_id=? AND player_id='outsider'").get(id).status).toBe('pending');
 expect((await groupInvitationPreview(token)).status).toBe(404);expect((await nativeGroupCall('invitation-accept','','admin',{token})).status).toBe(404);
});

it('native links become unavailable after creator demotion or group archival',async()=>{
 const id=await create();await member(id,'admin');await call(id,'role',{playerId:'admin',role:'coowner'});db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const created=await(await nativeGroupCall(id,'invitations','admin',{expiresInDays:7})).json(),token=new URL(created.url).hash.slice(1);
 await nativeGroupCall(id,'role','owner',{playerId:'admin',role:'member'});
 expect((await groupInvitationPreview(token)).status).toBe(404);expect((await nativeGroupCall('invitation-accept','','outsider',{token})).status).toBe(404);
 expect((await nativeGroupCall(id,'invitations','admin')).status).toBe(403);
 const ownerLink=await(await nativeGroupCall(id,'invitations','owner',{expiresInDays:7})).json();await nativeGroupCall(id,'archive','owner',{});
 expect((await groupInvitationPreview(new URL(ownerLink.url).hash.slice(1))).status).toBe(404);expect((await nativeGroupCall(id,'invitations')).status).toBe(403);
});

it('native link acceptance enforces profile eligibility and live session',async()=>{
 const id=await create();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const link=await(await nativeGroupCall(id,'invitations','owner',{expiresInDays:7})).json(),token=new URL(link.url).hash.slice(1);
 db.sqlite.prepare("UPDATE players SET display_name='' WHERE id='outsider'").run();
 expect((await nativeGroupCall('invitation-accept','','outsider',{token})).status).toBe(403);
 db.sqlite.prepare("UPDATE players SET display_name='Player' WHERE id='outsider'").run();
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=? WHERE player_id='outsider'").run(Date.now());
 expect((await nativeGroupCall('invitation-accept','','outsider',{token})).status).toBe(401);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM group_memberships WHERE group_id=? AND player_id='outsider'").get(id).n).toBe(0);
});

it('native invitation creation validates expiry and enforces the ten-per-minute limit',async()=>{
 const id=await create();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 for(const days of [0,31,'7'])expect((await nativeGroupCall(id,'invitations','owner',{expiresInDays:days})).status).toBe(400);
 for(let i=0;i<10;i++)expect((await nativeGroupCall(id,'invitations','owner',{expiresInDays:7})).status).toBe(201);
 expect((await nativeGroupCall(id,'invitations','owner',{expiresInDays:7})).status).toBe(429);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM group_invitations WHERE group_id=?').get(id).n).toBe(10);
});

it('native Owner assigns supported roles and explicitly converts a legacy Admin without changing ownership',async()=>{
 const id=await create();for(const who of ['admin','member','outsider'])await member(id,who);
 db.sqlite.prepare("UPDATE group_memberships SET role='admin',assigned_role=NULL WHERE group_id=? AND player_id='admin'").run(id);
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const listing=await(await nativeGroupCall(id,'members')).json();expect(listing.players.find((p:any)=>p.id==='admin').role).toBe('admin');
 expect((await nativeGroupCall(id,'role','owner',{playerId:'admin',role:'member'})).status).toBe(200);
 expect((await nativeGroupCall(id,'role','owner',{playerId:'member',role:'coowner'})).status).toBe(200);
 expect((await nativeGroupCall(id,'role','owner',{playerId:'outsider',role:'organizer'})).status).toBe(200);
 expect((await nativeGroupCall(id,'role','owner',{playerId:'admin',role:'admin'})).status).toBe(400);
 expect((await nativeGroupCall(id,'role','owner',{playerId:'owner',role:'member'})).status).toBe(400);
 expect((await nativeGroupCall(id,'transfer','owner',{playerId:'member'})).status).toBe(403);
 expect(db.sqlite.prepare('SELECT owner_id FROM tennis_groups WHERE id=?').get(id).owner_id).toBe('owner');
 expect(db.sqlite.prepare("SELECT assigned_role FROM group_memberships WHERE group_id=? AND player_id='admin'").get(id).assigned_role).toBe('member');
});

it.each(['coowner','admin','organizer','member'])('native %s cannot assign roles after reading the directory',async role=>{
 const id=await create();await member(id,'admin');await member(id,'member');
 db.sqlite.prepare("UPDATE group_memberships SET role=?,assigned_role=? WHERE group_id=? AND player_id='admin'").run(role==='admin'?'admin':'member',role==='admin'?null:role,id);
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGroupCall(id,'members','admin')).status).toBe(200);
 expect((await nativeGroupCall(id,'role','admin',{playerId:'member',role:'organizer'})).status).toBe(403);
 expect(db.sqlite.prepare("SELECT COALESCE(assigned_role,role) role FROM group_memberships WHERE group_id=? AND player_id='member'").get(id).role).toBe('member');
});

it.each(['coowner','organizer'])('native concurrent %s assignments reserve one role slot and demotion releases it',async role=>{
 const id=await create();await member(id,'admin');await member(id,'member');
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const responses=await Promise.all(['admin','member'].map(playerId=>nativeGroupCall(id,'role','owner',{playerId,role})));
 expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
 const holder=db.sqlite.prepare('SELECT player_id FROM group_memberships WHERE group_id=? AND assigned_role=?').get(id,role).player_id;
 const other=holder==='admin'?'member':'admin';
 expect((await nativeGroupCall(id,'role','owner',{playerId:holder,role:'member'})).status).toBe(200);
 expect((await nativeGroupCall(id,'role','owner',{playerId:other,role})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM group_memberships WHERE group_id=? AND assigned_role=? AND status='active'").get(id,role).n).toBe(1);
});

it('native role changes reject CSRF, target membership loss, Owner session revocation and archive',async()=>{
 const id=await create();await member(id,'member');db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const body={playerId:'member',role:'organizer'};
 expect((await nativeGroupCall(id,'role','owner',body,'wrong')).status).toBe(403);
 await nativeGroupCall(id,'leave','member',{});
 expect((await nativeGroupCall(id,'role','owner',body)).status).toBe(400);
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=? WHERE player_id='owner'").run(Date.now());
 expect((await nativeGroupCall(id,'role','owner',body)).status).toBe(401);
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=NULL WHERE player_id='owner'").run();
 await nativeGroupCall(id,'archive','owner',{});
 expect((await nativeGroupCall(id,'role','owner',body)).status).toBe(403);
});

it.each(['public','private'])('native %s member directory is approved-only, searchable and revokes names after access loss',async visibility=>{
 const id=await create({...input(),visibility});await member(id,'member');await call(id,'request',{},'outsider');
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const page=await(await nativeGroupCall(id,'members','member')).json();expect(page.players.map((p:any)=>p.id).sort()).toEqual(['member','owner']);
 expect((await nativeGroupCall(id,'members','outsider')).status).toBe(403);
 const found=await(await nativeGroupCall(id,'members?q=Name%20member','member')).json();expect(found.players.map((p:any)=>p.id)).toEqual(['member']);expect(found.next).toBeNull();
 expect((await nativeGroupCall(id,'members?q='+('x'.repeat(81)),'member')).status).toBe(400);
 expect((await nativeGroupCall(id,'members?cursor=invalid','member')).status).toBe(400);
 expect((await nativeGroupCall(id,'remove','owner',{playerId:'member'})).status).toBe(200);
 expect((await nativeGroupCall(id,'members','member')).status).toBe(403);
 expect((await(await nativeGroupCall(id,'','member')).json()).content).toBeUndefined();
});

it('native member pagination returns each matching active player once across fifty-row pages',async()=>{
 const id=await create();const now=Date.now();
 for(let i=0;i<55;i++){
  const player='paged-'+String(i).padStart(2,'0');
  db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run(player,'Paged member '+i,now,now);
  db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES (?,?,'member','active',?,?)").run(id,player,now,now);
 }
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const first=await(await nativeGroupCall(id,'members?q=Paged')).json();expect(first.players).toHaveLength(50);expect(first.next).toBeTypeOf('string');
 const last=await(await nativeGroupCall(id,'members?q=Paged&cursor='+encodeURIComponent(first.next))).json();expect(last.players).toHaveLength(5);expect(last.next).toBeNull();
 expect(new Set([...first.players,...last.players].map(p=>p.id)).size).toBe(55);
 db.sqlite.prepare("UPDATE players SET status='disabled' WHERE id='paged-00'").run();
 const filtered=await(await nativeGroupCall(id,'members?q=Paged')).json();expect(filtered.players.some((p:any)=>p.id==='paged-00')).toBe(false);
});

it.each(['owner','coowner','admin','organizer','member'])('native %s member removal respects manager authority and preserves Owner',async role=>{
 const id=await create();await member(id,'member');let actor='owner';
 if(role!=='owner'){
  await member(id,'admin');actor='admin';
  db.sqlite.prepare("UPDATE group_memberships SET role=?,assigned_role=? WHERE group_id=? AND player_id='admin'").run(role==='admin'?'admin':'member',role==='admin'?null:role,id);
 }
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGroupCall(id,'remove',actor,{playerId:'owner'})).status).not.toBe(200);
 expect((await nativeGroupCall(id,'remove',actor,{playerId:actor})).status).not.toBe(200);
 const response=await nativeGroupCall(id,'remove',actor,{playerId:'member'});
 expect(response.status).toBe(['owner','coowner','admin'].includes(role)?200:403);
 if(response.status===200){
  expect(db.sqlite.prepare("SELECT status FROM group_memberships WHERE group_id=? AND player_id='member'").get(id).status).toBe('removed');
  expect(db.sqlite.prepare("SELECT COUNT(*) n FROM group_notifications WHERE group_id=? AND recipient_id='member' AND kind='group_removed'").get(id).n).toBe(1);
 }
});

it.each(['coowner','admin'])('native %s cannot remove a legacy Admin peer after viewing the directory',async role=>{
 const id=await create();await member(id,'admin');await member(id,'member');
 db.sqlite.prepare("UPDATE group_memberships SET role='admin',assigned_role=NULL WHERE group_id=? AND player_id='member'").run(id);
 db.sqlite.prepare("UPDATE group_memberships SET role=?,assigned_role=? WHERE group_id=? AND player_id='admin'").run(role==='admin'?'admin':'member',role==='admin'?null:role,id);
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGroupCall(id,'members','admin')).status).toBe(200);
 expect((await nativeGroupCall(id,'remove','admin',{playerId:'member'})).status).toBe(403);
 expect((await nativeGroupCall(id,'remove','owner',{playerId:'member'})).status).toBe(200);
});

it('native directory and removal recheck role/session/archive after listing',async()=>{
 const id=await create();await member(id,'admin');await member(id,'member');await call(id,'role',{playerId:'admin',role:'coowner'});
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGroupCall(id,'members','admin')).status).toBe(200);
 db.sqlite.prepare("UPDATE group_memberships SET assigned_role='member' WHERE group_id=? AND player_id='admin'").run(id);
 expect((await nativeGroupCall(id,'remove','admin',{playerId:'member'})).status).toBe(403);
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=? WHERE player_id='admin'").run(Date.now());
 expect((await nativeGroupCall(id,'members','admin')).status).toBe(401);
 await nativeGroupCall(id,'archive','owner',{});
 expect((await nativeGroupCall(id,'members')).status).toBe(403);
 expect((await nativeGroupCall(id,'remove','owner',{playerId:'member'})).status).toBe(403);
});

it.each(['public','private'])('native creates %s groups with an Owner, exact retry and private member fields',async visibility=>{
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const body={...input(),visibility};
 const created=await nativeGroupCall('','','owner',body);expect(created.status).toBe(201);const {id}=await created.json();
 const retry=await nativeGroupCall('','','owner',body);expect(retry.status).toBe(200);expect((await retry.json()).id).toBe(id);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM tennis_groups').get().n).toBe(1);
 const detail=await(await nativeGroupCall(id,'')).json();expect(detail).toMatchObject({group:{visibility,name:body.name},membership:{status:'active',role:'owner'},content:{description:body.description,skillPreference:'advanced',version:1}});
 const preview=await(await nativeGroupCall(id,'','outsider')).json();expect(preview).not.toHaveProperty('content');expect(JSON.stringify(preview)).not.toContain('PRIVATE-CONTENT');
 expect((await nativeGroupCall(id,'members','outsider')).status).toBe(403);
 const other=await nativeGroupCall('','','outsider',body);expect(other.status).toBe(201);expect((await other.json()).id).not.toBe(id);
});

it.each(['owner','coowner','admin','organizer','member'])('native metadata edits enforce %s authority and version conflicts',async role=>{
 const id=await create();let actor='owner';
 if(role!=='owner'){
  await member(id,'admin');actor='admin';
  db.sqlite.prepare("UPDATE group_memberships SET role=?,assigned_role=? WHERE group_id=? AND player_id='admin'").run(role==='admin'?'admin':'member',role==='admin'?null:role,id);
 }
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const {requestId,...fields}=input();const body={...fields,name:'Updated native group',visibility:'public',version:1};
 const response=await nativeGroupCall(id,'edit',actor,body);
 if(role==='organizer'||role==='member'){
  expect(response.status).toBe(403);expect(db.sqlite.prepare('SELECT version FROM tennis_groups WHERE id=?').get(id).version).toBe(1);return;
 }
 expect(response.status).toBe(200);
 expect((await nativeGroupCall(id,'edit',actor,{...body,name:'Stale overwrite'})).status).toBe(409);
 const detail=await(await nativeGroupCall(id,'',actor)).json();expect(detail.group.name).toBe('Updated native group');expect(detail.content.version).toBe(2);
 expect((await nativeGroupCall(id,'edit',actor,{...body,visibility:'private',version:2})).status).toBe(200);
 expect((await(await nativeGroupCall(id,'','outsider')).json()).content).toBeUndefined();
 expect((await nativeGroupCall(id,'edit','outsider',{...body,version:3})).status).toBe(403);
});

it('native group editing rejects role loss, archival and revoked sessions without overwriting',async()=>{
 const id=await create();await member(id,'admin');await call(id,'role',{playerId:'admin',role:'coowner'});
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const {requestId,...fields}=input();const body={...fields,version:1};
 db.sqlite.prepare("UPDATE group_memberships SET assigned_role='member' WHERE group_id=? AND player_id='admin'").run(id);
 expect((await nativeGroupCall(id,'edit','admin',body)).status).toBe(403);
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=? WHERE player_id='admin'").run(Date.now());
 expect((await nativeGroupCall(id,'edit','admin',body)).status).toBe(401);
 await nativeGroupCall(id,'archive','owner',{});
 expect((await nativeGroupCall(id,'edit','owner',body)).status).toBe(403);
 expect(db.sqlite.prepare('SELECT name FROM tennis_groups WHERE id=?').get(id).name).toBe(fields.name);
});

it('native group metadata rejects malformed drafts and CSRF before creating groups',async()=>{
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGroupCall('','','owner',input(),'wrong')).status).toBe(403);
 for(const change of [{name:'   '},{generalLocation:''},{name:'x'.repeat(81)},{publicDescription:'x'.repeat(501)},{description:'x'.repeat(2001)},{visibility:'unlisted'},{skillPreference:'expert'}]){
  expect((await nativeGroupCall('','','owner',{...input(),...change})).status).toBe(400);
 }
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM tennis_groups').get().n).toBe(0);
});

it.each(['owner','coowner','organizer','admin'])('native %s reviews pending memberships and decides the displayed request only',async role=>{
 const id=await create();let actor='owner';
 if(role!=='owner'){
  await member(id,'admin');actor='admin';
  db.sqlite.prepare("UPDATE group_memberships SET role=?,assigned_role=? WHERE group_id=? AND player_id='admin'").run(role==='admin'?'admin':'member',role==='admin'?null:role,id);
 }
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGroupCall(id,'request','outsider',{})).status).toBe(200);
 const response=await nativeGroupCall(id,'requests',actor);expect(response.status).toBe(200);
 const page=await response.json();expect(page.limitedTo).toBe(200);expect(page.players).toHaveLength(1);
 const body={playerId:'outsider',requestUpdatedAt:page.players[0].updatedAt};expect(body.requestUpdatedAt).toBeTypeOf('number');
 expect((await nativeGroupCall(id,'approve',actor,body,'wrong')).status).toBe(403);
 expect((await nativeGroupCall(id,'approve',actor,body)).status).toBe(200);
 expect((await nativeGroupCall(id,'approve',actor,body)).status).toBe(409);
 expect(db.sqlite.prepare("SELECT status FROM group_memberships WHERE group_id=? AND player_id='outsider'").get(id).status).toBe('active');
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM group_notifications WHERE group_id=? AND recipient_id='outsider' AND kind='group_active'").get(id).n).toBe(1);
 expect((await nativeGroupCall(id,'leave','outsider',{})).status).toBe(200);
 expect((await nativeGroupCall(id,'request','outsider',{})).status).toBe(200);
 const pending=(await(await nativeGroupCall(id,'requests',actor)).json()).players[0];
 expect((await nativeGroupCall(id,'reject',actor,{playerId:'outsider',requestUpdatedAt:pending.updatedAt})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT status FROM group_memberships WHERE group_id=? AND player_id='outsider'").get(id).status).toBe('rejected');
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM group_notifications WHERE group_id=? AND recipient_id='outsider' AND kind='group_rejected'").get(id).n).toBe(1);
 if(role==='organizer'){
  expect((await nativeGroupCall(id,'role',actor,{playerId:'outsider',role:'coowner'})).status).toBe(403);
  expect((await nativeGroupCall(id,'archive',actor,{})).status).toBe(403);
 }
});

it.each(['approve','reject'])('native %s refuses withdrawn or replaced pending requests',async action=>{
 const id=await create();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 await nativeGroupCall(id,'request','outsider',{});
 const pending=(await(await nativeGroupCall(id,'requests')).json()).players[0];const body={playerId:'outsider',requestUpdatedAt:pending.updatedAt};
 await nativeGroupCall(id,'leave','outsider',{});
 expect((await nativeGroupCall(id,action,'owner',body)).status).toBe(409);
 await nativeGroupCall(id,'request','outsider',{});
 db.sqlite.prepare("UPDATE group_memberships SET updated_at=? WHERE group_id=? AND player_id='outsider'").run(pending.updatedAt+100,id);
 expect((await nativeGroupCall(id,action,'owner',body)).status).toBe(409);
 expect(db.sqlite.prepare("SELECT status FROM group_memberships WHERE group_id=? AND player_id='outsider'").get(id).status).toBe('pending');
 expect((await nativeGroupCall(id,action,'owner',{playerId:'outsider',requestUpdatedAt:'bad'})).status).toBe(400);
});

it('native request queues deny ordinary/pending members and recheck role, session and archive changes',async()=>{
 const id=await create();await member(id,'admin');await member(id,'member');await call(id,'role',{playerId:'admin',role:'organizer'});
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 await nativeGroupCall(id,'request','outsider',{});
 expect((await nativeGroupCall(id,'requests','member')).status).toBe(403);
 expect((await nativeGroupCall(id,'requests','outsider')).status).toBe(403);
 const pending=(await(await nativeGroupCall(id,'requests','admin')).json()).players[0],body={playerId:'outsider',requestUpdatedAt:pending.updatedAt};
 db.sqlite.prepare("UPDATE group_memberships SET assigned_role='member' WHERE group_id=? AND player_id='admin'").run(id);
 expect((await nativeGroupCall(id,'approve','admin',body)).status).toBe(403);
 expect((await nativeGroupCall(id,'requests','admin')).status).toBe(403);
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=? WHERE player_id='admin'").run(Date.now());
 expect((await nativeGroupCall(id,'requests','admin')).status).toBe(401);
 await nativeGroupCall(id,'archive','owner',{});
 expect((await nativeGroupCall(id,'requests')).status).toBe(403);
 expect((await nativeGroupCall(id,'approve','owner',body)).status).toBe(403);
 expect(db.sqlite.prepare("SELECT status FROM group_memberships WHERE group_id=? AND player_id='outsider'").get(id).status).toBe('pending');
});

it('native request decisions reject disabled applicants without granting membership',async()=>{
 const id=await create();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 await nativeGroupCall(id,'request','outsider',{});
 const pending=(await(await nativeGroupCall(id,'requests')).json()).players[0];
 db.sqlite.prepare("UPDATE players SET status='disabled' WHERE id='outsider'").run();
 expect((await(await nativeGroupCall(id,'requests')).json()).players).toEqual([]);
 expect((await nativeGroupCall(id,'approve','owner',{playerId:'outsider',requestUpdatedAt:pending.updatedAt})).status).toBe(409);
 expect(db.sqlite.prepare("SELECT status FROM group_memberships WHERE group_id=? AND player_id='outsider'").get(id).status).toBe('pending');
});

it('native decision timestamp is checked atomically if a request changes after preflight',async()=>{
 const id=await create();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 await nativeGroupCall(id,'request','outsider',{});
 const pending=(await(await nativeGroupCall(id,'requests')).json()).players[0];
 const prepare=db.prepare.bind(db);let changed=false;
 db.prepare=(sql:string)=>{
  const statement=prepare(sql);
  if(sql.startsWith('UPDATE group_memberships SET status=?,assigned_role=?,updated_at=?')){
   const run=statement.run.bind(statement);
   statement.run=async()=>{
    changed=true;db.sqlite.prepare("UPDATE group_memberships SET updated_at=? WHERE group_id=? AND player_id='outsider'").run(pending.updatedAt+1,id);
    return run();
   };
  }
  return statement;
 };
 expect((await nativeGroupCall(id,'approve','owner',{playerId:'outsider',requestUpdatedAt:pending.updatedAt})).status).toBe(409);
 expect(changed).toBe(true);
 expect(db.sqlite.prepare("SELECT status FROM group_memberships WHERE group_id=? AND player_id='outsider'").get(id).status).toBe('pending');
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM group_notifications WHERE group_id=? AND recipient_id='outsider' AND kind='group_active'").get(id).n).toBe(0);
});
it('discovers private previews without leaking members, descriptions, roles or skills',async()=>{const id=await create();const r=await handleGroups(req('','GET',undefined,''),env);const text=await r.text();expect(text).toContain(id);for(const secret of ['PRIVATE-CONTENT','advanced','owner_id','membership','Name owner'])expect(text).not.toContain(secret);const detail=await(await handleGroups(req('/'+id,'GET',undefined,''),env)).json();expect(detail).not.toHaveProperty('content');expect(detail.group).toEqual({id,name:'Fairfax Tennis',publicDescription:'Public preview',generalLocation:'Fairfax, VA',visibility:'private'});});
it('requires approval for both public and private groups and deduplicates requests',async()=>{for(const visibility of ['public','private']){const id=await create({...input(),visibility});for(let i=0;i<2;i++)expect((await call(id,'request',{},'member')).status).toBe(200);expect((await handleGroups(req('/'+id+'/members','GET',undefined,'member'),env)).status).toBe(403);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_memberships WHERE group_id=?').get(id).n).toBe(2);await call(id,'approve',{playerId:'member'});expect((await handleGroups(req('/'+id+'/members','GET',undefined,'member'),env)).status).toBe(200);}});
it('revokes content and roster access immediately on removal',async()=>{const id=await create();await member(id,'member');expect((await(await handleGroups(req('/'+id,'GET',undefined,'member'),env)).json()).content.description).toBe('PRIVATE-CONTENT-SENTINEL');await call(id,'remove',{playerId:'member'});expect((await handleGroups(req('/'+id+'/members','GET',undefined,'member'),env)).status).toBe(403);expect(await(await handleGroups(req('/'+id,'GET',undefined,'member'),env)).json()).not.toHaveProperty('content');expect((await call(id,'request',{},'member')).status).toBe(200);});
it('keeps administrator roles owner-controlled and prevents peer-admin removal',async()=>{const id=await create();await member(id,'admin');await member(id,'member');await call(id,'role',{playerId:'admin',role:'coowner'});expect((await call(id,'role',{playerId:'member',role:'coowner'},'admin')).status).toBe(403);expect((await call(id,'remove',{playerId:'member'},'admin')).status).toBe(200);expect((await call(id,'remove',{playerId:'owner'},'admin')).status).toBe(400);});
it('supports withdraw and reject while preserving the primary Owner',async()=>{const id=await create();await call(id,'request',{},'member');await call(id,'leave',{},'member');expect((await call(id,'request',{},'member')).status).toBe(200);await call(id,'reject',{playerId:'member'});expect((await call(id,'request',{},'member')).status).toBe(200);await call(id,'approve',{playerId:'member'});expect((await call(id,'leave')).status).toBe(409);expect((await call(id,'transfer',{playerId:'member'})).status).toBe(403);expect((await call(id,'leave')).status).toBe(409);expect((await call(id,'archive')).status).toBe(200);});
it('excludes archived groups from discovery and protects member lists',async()=>{const id=await create();await member(id,'member');await call(id,'archive');expect((await(await handleGroups(req(),env)).json()).groups).toHaveLength(0);expect((await handleGroups(req('/'+id+'/members','GET',undefined,'member'),env)).status).toBe(403);expect((await call(id,'request',{},'outsider')).status).toBe(409);});
it('protects writes with session/CSRF/environment and isolates My Groups',async()=>{const id=await create();expect((await call(id,'remove',{playerId:'owner'},'outsider')).status).toBe(403);expect((await handleGroups(req('/'+id+'/request','POST',{},'outsider',{'X-CSRF-Token':'wrong'}),env)).status).toBe(403);expect((await handleGroups(req('/'+id+'/request','POST',{},''),env)).status).toBe(401);expect((await handleGroups(req(),{...env,CF_PAGES_BRANCH:'main'})).status).toBe(404);expect((await(await handleGroups(req('/mine','GET',undefined,'outsider'),env)).json()).groups).toHaveLength(0);});
it('version-checks metadata edits and never exposes private description to pending players',async()=>{const id=await create();await call(id,'request',{},'member');expect((await call(id,'edit',{...input(),requestId:undefined,version:1})).status).toBe(200);expect((await call(id,'edit',{...input(),requestId:undefined,version:1})).status).toBe(409);expect(await(await handleGroups(req('/'+id,'GET',undefined,'member'),env)).json()).not.toHaveProperty('content');});

it('requires active group ownership resolution before account deletion and cleans archived groups',async()=>{const id=await create();const request=()=>new Request(origin+'/api/auth/me',{method:'DELETE',headers:{Origin:origin,'Content-Type':'application/json',Cookie:'oc_session='+tokens.owner,'X-CSRF-Token':'csrf'},body:JSON.stringify({confirm:'DELETE'})});expect((await handleAuth(request(),env)).status).toBe(409);await call(id,'archive');expect((await handleAuth(request(),env)).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM tennis_groups').get().n).toBe(0);});

it('notifies group managers and applicants without exposing member names to nonmembers',async()=>{const id=await create();await call(id,'request',{},'member');const inbox=async(who:string)=>{const r=await handleGames(new Request(origin+'/api/games/notifications',{headers:{Cookie:'oc_session='+tokens[who]}}),env);expect(r.status).toBe(200);return (await r.json()).notifications;};expect((await inbox('owner'))[0]).toMatchObject({kind:'group_requested',displayName:'Name member',actionPlayerId:'member',requestStatus:'pending'});expect(await inbox('outsider')).toHaveLength(0);await call(id,'reject',{playerId:'member'});expect((await inbox('member'))[0]).toMatchObject({kind:'group_rejected',displayName:'Group administrator'});await call(id,'request',{},'member');await call(id,'approve',{playerId:'member'});expect((await inbox('member')).some((n:any)=>n.kind==='group_active')).toBe(true);});
it('revokes old membership-request notifications when an administrator is removed',async()=>{const id=await create();await member(id,'admin');await call(id,'role',{playerId:'admin',role:'coowner'});await call(id,'request',{},'outsider');await call(id,'remove',{playerId:'admin'});const r=await handleGames(new Request(origin+'/api/games/notifications',{headers:{Cookie:'oc_session='+tokens.admin}}),env);expect(r.status).toBe(200);const notes=(await r.json()).notifications;expect(notes.some((n:any)=>n.kind==='group_requested')).toBe(false);expect(JSON.stringify(notes)).not.toContain('Name outsider');});

it('does not search private descriptions and blocks peer-admin management',async()=>{const id=await create();const search=await(await handleGroups(req('?q=PRIVATE-CONTENT-SENTINEL','GET',undefined,''),env)).json();expect(search.groups).toHaveLength(0);await member(id,'admin');await member(id,'member');await call(id,'role',{playerId:'admin',role:'coowner'});expect((await call(id,'role',{playerId:'member',role:'coowner'})).status).toBe(409);expect((await call(id,'role',{playerId:'admin',role:'member'},'admin')).status).toBe(400);await call(id,'remove',{playerId:'admin'});expect((await call(id,'approve',{playerId:'outsider'},'admin')).status).toBe(403);});

it('preserves legacy Admin authority without granting new role-management powers',async()=>{const id=await create();await member(id,'admin');db.sqlite.prepare("UPDATE group_memberships SET role='admin',assigned_role=NULL WHERE group_id=? AND player_id='admin'").run(id);await call(id,'request',{},'member');expect((await call(id,'approve',{playerId:'member'},'admin')).status).toBe(200);expect((await call(id,'role',{playerId:'member',role:'organizer'},'admin')).status).toBe(403);expect((await(await handleGroups(req('/'+id,'GET',undefined,'admin'),env)).json()).membership.role).toBe('admin');});
it('only primary Owner assigns roles and controls archive',async()=>{const id=await create();await member(id,'admin');await member(id,'member');await call(id,'role',{playerId:'admin',role:'coowner'});expect((await call(id,'role',{playerId:'member',role:'organizer'},'admin')).status).toBe(403);expect((await call(id,'role',{playerId:'member',role:'organizer'})).status).toBe(200);expect((await call(id,'role',{playerId:'member',role:'coowner'},'admin')).status).toBe(403);expect((await call(id,'archive',{},'admin')).status).toBe(403);expect((await call(id,'transfer',{playerId:'member'},'admin')).status).toBe(403);expect((await call(id,'request',{},'outsider')).status).toBe(200);expect((await call(id,'approve',{playerId:'outsider'},'member')).status).toBe(200);expect((await call(id,'role',{playerId:'admin',role:'member'},'admin')).status).toBe(400);});

function webp(){const b=new Uint8Array(48),v=new DataView(b.buffer);b.set(new TextEncoder().encode('RIFF'),0);v.setUint32(4,40,true);b.set(new TextEncoder().encode('WEBPVP8X'),8);v.setUint32(16,10,true);b[24]=31;b[27]=31;b.set(new TextEncoder().encode('VP8 '),30);v.setUint32(34,10,true);b.set([0x9d,1,0x2a],41);v.setUint16(44,32,true);v.setUint16(46,32,true);return b;}
it('validates output dimensions/metadata and stores only optimized images for authorized actors',async()=>{const id=await create();const objects=new Map<string,ArrayBuffer>();const bucket={put:async(k:string,v:ArrayBuffer)=>{objects.set(k,v);},get:async(k:string)=>objects.has(k)?{body:new Blob([objects.get(k)!]).stream()}:null,delete:async(k:string)=>{objects.delete(k);}};let calls=0;const mediaEnv:MediaEnv={...env,MEDIA_UPLOADS_ENABLED:'true',PLAY_TOGETHER_MEDIA:bucket,PLAY_TOGETHER_IMAGE_PROCESSOR:{fetch:async()=>{calls++;return new Response(webp());}}};const upload=(who:string)=>new Request(origin+'/api/media/group/'+id,{method:'PUT',headers:{Origin:origin,Cookie:'oc_session='+tokens[who],'X-CSRF-Token':'csrf','Content-Type':'image/jpeg'},body:'original-input'});expect((await handleMedia(upload('outsider'),mediaEnv)).status).toBe(404);expect(calls).toBe(0);expect((await handleMedia(upload('owner'),mediaEnv)).status).toBe(200);expect(objects.size).toBe(1);expect((await handleMedia(upload('owner'),mediaEnv)).status).toBe(200);expect(objects.size).toBe(1);const read=new Request(origin+'/api/media/group/'+id);const redirected=await handleMedia(read,mediaEnv);expect(redirected.status).toBe(302);expect((await handleMedia(new Request(origin+redirected.headers.get('Location')),mediaEnv)).status).toBe(200);expect(safeWebp(webp(),'group')).toEqual({width:32,height:32});const bad=webp();bad.set(new TextEncoder().encode('EXIF'),12);expect(()=>safeWebp(bad,'group')).toThrow();});
it('player photo reads require the same account and uploads fail closed without bindings',async()=>{const read=new Request(origin+'/api/media/player/owner');expect((await handleMedia(read,env)).status).toBe(404);const upload=new Request(origin+'/api/media/player/owner',{method:'PUT',headers:{Origin:origin,Cookie:'oc_session='+tokens.owner,'X-CSRF-Token':'csrf','Content-Type':'image/jpeg'},body:'x'});expect((await handleMedia(upload,env)).status).toBe(503);});

it('invitations preserve preview privacy and require fresh approval',async()=>{const id=await create();const r=await call(id,'invitations',{expiresInDays:7});expect(r.status).toBe(201);const invite=await r.json();const token=invite.url.split('#')[1];expect(token).toHaveLength(64);expect(JSON.stringify(db.sqlite.prepare('SELECT * FROM group_invitations').get())).not.toContain(token);const preview=await(await handleGroups(req('/invitation-preview','POST',{token},''),env)).json();expect(JSON.stringify(preview)).not.toContain('PRIVATE-CONTENT');for(let i=0;i<2;i++)expect((await handleGroups(req('/invitation-accept','POST',{token},'member'),env)).status).toBe(200);expect(db.sqlite.prepare('SELECT status FROM group_memberships WHERE player_id=?').get('member').status).toBe('pending');expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_invitation_redemptions').get().n).toBe(1);await call(id,'revoke-invitation',{invitationId:invite.id});expect((await handleGroups(req('/invitation-preview','POST',{token},''),env)).status).toBe(404);});
it('nonmanagers cannot issue invitations and expired links fail',async()=>{const id=await create();await member(id,'member');expect((await call(id,'invitations',{},'member')).status).toBe(403);const invite=await(await call(id,'invitations',{expiresInDays:1})).json();db.sqlite.prepare('UPDATE group_invitations SET expires_at=0 WHERE id=?').run(invite.id);expect((await handleGroups(req('/invitation-accept','POST',{token:invite.url.split('#')[1]},'member'),env)).status).toBe(404);});

it('group event capabilities distinguish Members, legacy Admins, Organizers and Coowners',async()=>{const id=await create();await member(id,'member');await member(id,'admin');expect(await groupGameAccess(db,id,null)).toMatchObject({canView:false,canCreate:false});expect(await groupGameAccess(db,id,'outsider')).toMatchObject({canView:false});expect(await groupGameAccess(db,id,'member')).toMatchObject({canView:true,canCreate:false,canManage:false,canJoin:true});db.sqlite.prepare("UPDATE group_memberships SET role='admin' WHERE group_id=? AND player_id='admin'").run(id);expect(await groupGameAccess(db,id,'admin')).toMatchObject({canView:true,canCreate:false,canManage:false});await call(id,'role',{playerId:'member',role:'organizer'});expect(await groupGameAccess(db,id,'member','member')).toMatchObject({canCreate:true,canManage:true});expect(await groupGameAccess(db,id,'member','other')).toMatchObject({canManage:false});await call(id,'role',{playerId:'admin',role:'coowner'});expect(await groupGameAccess(db,id,'admin','other')).toMatchObject({canCreate:true,canManage:true});await call(id,'remove',{playerId:'member'});expect(await groupGameAccess(db,id,'member','member')).toMatchObject({canView:false,canCreate:false,canManage:false,canJoin:false});});

it('creates member-only group games, feeds approved members, and revokes access on removal',async()=>{
 const groupId=await create();await member(groupId,'member');await member(groupId,'admin');await call(groupId,'role',{playerId:'admin',role:'organizer'});
 const gameReq=(path:string,method='GET',body?:unknown,who='owner')=>new Request(origin+'/api/games'+path,{method,headers:{Origin:origin,Cookie:'oc_session='+tokens[who],'X-CSRF-Token':'csrf','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const now=Date.now(),date=new Date(now+86400000).toISOString().slice(0,16);
 const input={groupId,title:'PRIVATE-GAME-SENTINEL',courtToken:await courtSelectionToken({id:'court',name:'PRIVATE-COURT-SENTINEL',lat:38,lon:-77,access:'public'},'admin',env,origin),startLocal:date,timeZone:'UTC',durationMinutes:60,format:'doubles',capacity:4,skillPreference:'any',notes:'Private notes',requestId:crypto.randomUUID(),acknowledgeNoReservation:true};
 const response=await handleGames(gameReq('','POST',input,'admin'),env);const data=await response.json();expect(response.status,JSON.stringify(data)).toBe(201);const id=data.game.id;
 expect(JSON.stringify(await(await handleGames(gameReq(),env)).json())).not.toContain('PRIVATE-GAME');
 expect((await handleGames(gameReq('/'+id,'GET',undefined,'outsider'),env)).status).toBe(404);
 expect((await(await handleGames(gameReq('/feed','GET',undefined,'member'),env)).json()).games[0].id).toBe(id);
 expect((await handleGames(gameReq('/'+id+'/join','POST',{},'member'),env)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_participants WHERE game_id=?').get(id).n).toBe(2);
 expect((await handleGames(gameReq('/'+id+'/request-guests','POST',{guestCount:1},'member'),env)).status).toBe(200);
 expect((await handleGames(gameReq('/'+id+'/approve-guests','POST',{playerId:'member'},'owner'),env)).status).toBe(200);
 expect((await(await handleGames(gameReq('/'+id,'GET',undefined,'member'),env)).json()).game.playerCount).toBe(3);
 expect((await handleGames(gameReq('/'+id+'/guests','GET',undefined,'outsider'),env)).status).toBe(404);

 db.sqlite.prepare('INSERT INTO game_cancellations(game_id,player_id,reason,cancelled_at) VALUES (?,?,?,?)').run(id,'member','Private cancellation history',Date.now());
 await call(groupId,'remove',{playerId:'member'});
 expect((await handleGames(gameReq('/'+id,'GET',undefined,'member'),env)).status).toBe(404);
 expect((await(await handleGames(gameReq('/mine?view=cancelled','GET',undefined,'member'),env)).json()).games).toHaveLength(0);
 expect((await(await handleGames(gameReq('/feed','GET',undefined,'member'),env)).json()).games).toHaveLength(0);
 await call(groupId,'role',{playerId:'admin',role:'member'});
 expect(db.sqlite.prepare('SELECT organizer_id FROM games WHERE id=?').get(id).organizer_id).toBe('owner');
});
import {handlePlayers} from '../functions/lib/players';
it('player discovery is opt-in, blocks are symmetric, and reports are moderator-only',async()=>{
 const pReq=(path='',method='GET',body?:unknown,who='owner')=>new Request(origin+'/api/players'+path,{method,headers:{Origin:origin,Cookie:'oc_session='+tokens[who],'X-CSRF-Token':'csrf','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 expect((await(await handlePlayers(pReq(),env)).json()).players).toHaveLength(0);db.sqlite.prepare("UPDATE players SET discoverable=1 WHERE id IN ('member','outsider')").run();
 let list=await(await handlePlayers(pReq(),env)).json();expect(list.players).toHaveLength(2);expect(JSON.stringify(list)).not.toMatch(/token|email|identity|membership|created_at/);
 expect((await handlePlayers(pReq('/block','POST',{playerId:'member'}),env)).status).toBe(200);expect((await(await handlePlayers(pReq(),env)).json()).players.map((p:any)=>p.id)).toEqual(['outsider']);expect((await(await handlePlayers(pReq('','GET',undefined,'member'),env)).json()).players.some((p:any)=>p.id==='owner')).toBe(false);
 expect((await handlePlayers(pReq('/report','POST',{subjectType:'player',subjectId:'member',category:'harassment',details:'Synthetic test report'}),env)).status).toBe(201);expect((await handlePlayers(pReq('/report','POST',{subjectType:'player',subjectId:'member',category:'harassment',details:'Duplicate report explanation'}),env)).status).toBe(429);
 expect((await handlePlayers(pReq('/reports'),env)).status).toBe(403);const moderatorEnv={...env,MODERATOR_PLAYER_IDS:'owner'};const reports=await(await handlePlayers(pReq('/reports'),moderatorEnv)).json();expect(reports.reports).toHaveLength(1);expect((await handlePlayers(pReq('/review-report','POST',{id:reports.reports[0].id,status:'resolved'}),moderatorEnv)).status).toBe(200);
 await handlePlayers(pReq('/unblock','POST',{playerId:'member'}),env);expect((await(await handlePlayers(pReq(),env)).json()).players).toHaveLength(2);db.sqlite.prepare("UPDATE players SET discoverable=0 WHERE id='member'").run();expect((await(await handlePlayers(pReq(),env)).json()).players.map((p:any)=>p.id)).toEqual(['outsider']);
});
it('reports cannot infer an inaccessible group-only game',async()=>{const r=new Request(origin+'/api/players/report',{method:'POST',headers:{Origin:origin,Cookie:'oc_session='+tokens.outsider,'X-CSRF-Token':'csrf','Content-Type':'application/json'},body:JSON.stringify({subjectType:'game',subjectId:'missing-private-game',category:'privacy',details:'Private game concern'})});expect((await handlePlayers(r,env)).status).toBe(404);});
it('player safety mutations require CSRF and reports cannot grant moderator privileges',async()=>{
 const base=origin+'/api/players';const h={Origin:origin,Cookie:'oc_session='+tokens.owner,'Content-Type':'application/json'};expect((await handlePlayers(new Request(base+'/block',{method:'POST',headers:h,body:JSON.stringify({playerId:'member'})}),env)).status).toBe(403);
 expect((await handlePlayers(new Request(base+'/reports',{headers:{Cookie:'oc_session='+tokens.owner}}),{...env,MODERATOR_PLAYER_IDS:'outsider'})).status).toBe(403);
 const id=await create();const r=new Request(base+'/report',{method:'POST',headers:{...h,'X-CSRF-Token':'csrf'},body:JSON.stringify({subjectType:'group',subjectId:id,category:'privacy',details:'No private content included'})});expect((await handlePlayers(r,env)).status).toBe(201);expect(db.sqlite.prepare('SELECT subject_id,details FROM safety_reports').get()).toEqual({subject_id:id,details:'No private content included'});
});
it('member roster pagination and search retain membership privacy',async()=>{
 const id=await create();for(let i=0;i<55;i++){const p='roster-'+String(i).padStart(2,'0');db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run(p,'Roster '+i,Date.now(),Date.now());db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES (?,?,'member','active',?,?)").run(id,p,100+i,100+i);}
 const first=await(await handleGroups(req('/'+id+'/members'),env)).json();expect(first.players).toHaveLength(50);expect(first.next).toBeTruthy();const second=await(await handleGroups(req('/'+id+'/members?cursor='+encodeURIComponent(first.next)),env)).json();expect(second.players).toHaveLength(6);expect(new Set([...first.players,...second.players].map((p:any)=>p.id)).size).toBe(56);expect(first.players[0]).not.toHaveProperty('created_at');const search=await(await handleGroups(req('/'+id+'/members?q=Roster%2054'),env)).json();expect(search.players.map((p:any)=>p.id)).toEqual(['roster-54']);expect((await handleGroups(req('/'+id+'/members?q=Roster','GET',undefined,'outsider'),env)).status).toBe(403);
});
it('ZIP and city-state player searches match shared locality labels without exposing coordinates',async()=>{
 const upstream=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json([{display_name:'22033, Fairfax County, Virginia, United States',lat:'38.87',lon:'-77.38',address:{postcode:'22033',country_code:'us'}}]));
 try{db.sqlite.prepare("UPDATE players SET discoverable=1,general_location='Fairfax' WHERE id IN ('member','outsider')").run();db.sqlite.prepare('INSERT INTO player_blocks VALUES (?,?,?)').run('owner','outsider',Date.now());
 const search=(q:string)=>handlePlayers(new Request(origin+'/api/players?q='+encodeURIComponent(q),{headers:{Cookie:'oc_session='+tokens.owner}}),env);
 for(const q of ['22033','22033-1234','Fairfax','Fairfax, VA']){const r=await search(q),data=await r.json();expect(r.status).toBe(200);expect(data.players.map((p:any)=>p.id)).toEqual(['member']);expect(JSON.stringify(data)).not.toMatch(/"lat"|"lon"|token_hash|email/);if(q.startsWith('22033'))expect(data.resolvedLocation).toContain('Fairfax');}
 expect((await search('2203')).status).toBe(400);
 }finally{upstream.mockRestore();}
});
it('ZIP player search fails clearly for unavailable or mismatched location results',async()=>{
 const upstream=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('Unavailable',{status:503}));try{const request=()=>new Request(origin+'/api/players?q=22033',{headers:{Cookie:'oc_session='+tokens.owner}});expect((await handlePlayers(request(),env)).status).toBe(503);upstream.mockResolvedValue(Response.json([{display_name:'Other ZIP, Virginia, United States',lat:'38',lon:'-77',address:{postcode:'22034',country_code:'us'}}]));expect((await handlePlayers(request(),env)).status).toBe(400);}finally{upstream.mockRestore();}
});

it('allows only one active Co-owner and one Organizer and releases slots on demotion',async()=>{
 const id=await create();await member(id,'member');await member(id,'admin');await member(id,'outsider');
 expect((await call(id,'role',{playerId:'member',role:'coowner'})).status).toBe(200);
 expect((await call(id,'role',{playerId:'admin',role:'coowner'})).status).toBe(409);
 expect((await call(id,'role',{playerId:'admin',role:'organizer'})).status).toBe(200);
 expect((await call(id,'role',{playerId:'outsider',role:'organizer'})).status).toBe(409);
 expect((await call(id,'role',{playerId:'admin',role:'member'})).status).toBe(200);
 expect((await call(id,'role',{playerId:'outsider',role:'organizer'})).status).toBe(200);
 expect((await call(id,'role',{playerId:'owner',role:'member'})).status).toBe(400);
});

async function waitGame(){
 const groupId=await create();for(const p of ['member','admin','outsider'])await member(groupId,p);
 const id=crypto.randomUUID(),now=Date.now();db.sqlite.prepare(`INSERT INTO games(id,organizer_id,visibility,group_id,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,request_id,request_hash,created_at,updated_at,join_policy) VALUES (?,?,'group',?,'Waitlist test','court','Park',38,-77,'public',?,?,'UTC','singles',2,?,'hash',?,?,'instant')`).run(id,'owner',groupId,now+86400000,now+90000000,id,now,now);
 for(const p of ['owner','member'])db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,p,now);
 return {id,groupId};
}
it.each(['organizer','coowner'])('native demoting %s transfers future hosted group games while preserving member attendance',async role=>{
 const {id,groupId}=await waitGame();
 await call(groupId,'role',{playerId:'member',role});
 db.sqlite.prepare("UPDATE games SET organizer_id='member' WHERE id=?").run(id);
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGroupCall(groupId,'role','owner',{playerId:'member',role:'member'})).status).toBe(200);
 expect(db.sqlite.prepare('SELECT organizer_id,status FROM games WHERE id=?').get(id)).toMatchObject({organizer_id:'owner',status:'scheduled'});
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_participants WHERE game_id=? AND player_id='member'").get(id).n).toBe(1);
 expect(db.sqlite.prepare("SELECT status,assigned_role FROM group_memberships WHERE group_id=? AND player_id='member'").get(groupId)).toMatchObject({status:'active',assigned_role:'member'});
});
it.each(['public','private'])('native removal releases future %s group attendance and guests and transfers hosted games',async visibility=>{
 const {id,groupId}=await waitGame();
 await call(groupId,'role',{playerId:'member',role:'organizer'});
 db.sqlite.prepare('UPDATE tennis_groups SET visibility=? WHERE id=?').run(visibility,groupId);
 db.sqlite.prepare("UPDATE games SET event_capacity=4,organizer_id='member' WHERE id=?").run(id);
 db.sqlite.prepare("UPDATE game_participants SET guest_count=2 WHERE game_id=? AND player_id='owner'").run(id);
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGroupCall(groupId,'remove','owner',{playerId:'member'})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_participants WHERE game_id=? AND player_id='member'").get(id).n).toBe(0);
 expect(db.sqlite.prepare('SELECT status,organizer_id FROM games WHERE id=?').get(id)).toMatchObject({status:'scheduled',organizer_id:'owner'});
 expect((await nativeGroupCall(groupId,'members','member')).status).toBe(403);
 expect((await nativeGameCall(id,'participation','member')).status).toBe(404);
});
async function waitCall(id:string,action:string,who:string,body={}){return handleGames(new Request(origin+'/api/games/'+id+'/'+action,{method:action==='participation'?'GET':'POST',headers:{Origin:origin,Cookie:'oc_session='+tokens[who],'X-CSRF-Token':'csrf','Content-Type':'application/json'},...(action==='participation'?{}:{body:JSON.stringify(body)})}),env);}
for(const visibility of ['public','private'])it(`organizer attendance is independent of managing a ${visibility} group game and respects offered places`,async()=>{
 const {id,groupId}=await waitGame();db.sqlite.prepare('UPDATE tennis_groups SET visibility=? WHERE id=?').run(visibility,groupId);
 expect((await waitCall(id,'join-waitlist','admin')).status).toBe(200);
 expect((await waitCall(id,'leave','owner')).status).toBe(200);
 expect(db.sqlite.prepare('SELECT status,organizer_id FROM games WHERE id=?').get(id)).toMatchObject({status:'scheduled',organizer_id:'owner'});
 expect(db.sqlite.prepare('SELECT status FROM game_waitlist WHERE game_id=? AND player_id=?').get(id,'admin').status).toBe('offered');
 expect((await waitCall(id,'join','owner')).status).toBe(409);
 expect((await(await waitCall(id,'participation','owner')).json())).toMatchObject({isOrganizer:true,isGameOrganizer:true,joined:false,availablePlaces:0});
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_notifications WHERE recipient_id='owner'").get().n).toBe(0);
 expect((await waitCall(id,'accept-waitlist','admin')).status).toBe(200);
 expect((await waitCall(id,'leave','member')).status).toBe(200);
 expect((await waitCall(id,'join','owner')).status).toBe(200);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(2);
 expect((await waitCall(id,'cancel','owner')).status).toBe(200);
});
it('queues group players FIFO, reserves openings and accepts only the offered player',async()=>{
 const {id}=await waitGame();expect((await waitCall(id,'join-waitlist','admin')).status).toBe(200);db.sqlite.prepare('UPDATE game_waitlist SET created_at=created_at-100 WHERE player_id=?').run('admin');
 expect((await waitCall(id,'join-waitlist','outsider')).status).toBe(200);const state=await(await waitCall(id,'participation','outsider')).json();expect(state.waitlist).toMatchObject({status:'waiting',position:2});
 expect((await waitCall(id,'leave','member')).status).toBe(200);expect(db.sqlite.prepare('SELECT status FROM game_waitlist WHERE player_id=?').get('admin').status).toBe('offered');
 expect((await waitCall(id,'join','member')).status).toBe(409);expect((await waitCall(id,'accept-waitlist','outsider')).status).toBe(409);
 expect((await waitCall(id,'accept-waitlist','admin')).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(2);
 expect((await waitCall(id,'accept-waitlist','admin')).status).toBe(409);
});
it('expires offers, advances the queue, supports withdrawal and respects membership removal',async()=>{
 const {id,groupId}=await waitGame();await waitCall(id,'join-waitlist','admin');db.sqlite.prepare('UPDATE game_waitlist SET created_at=created_at-100 WHERE player_id=?').run('admin');await waitCall(id,'join-waitlist','outsider');await waitCall(id,'leave','member');
 db.sqlite.prepare('UPDATE game_waitlist SET offer_expires_at=? WHERE player_id=?').run(Date.now()-1,'admin');
 const next=await(await waitCall(id,'participation','outsider')).json();expect(next.waitlist.status).toBe('offered');expect((await waitCall(id,'accept-waitlist','admin')).status).toBe(409);
 await call(groupId,'remove',{playerId:'outsider'});const privateInbox=await handleGames(new Request(origin+'/api/games/notifications',{headers:{Cookie:'oc_session='+tokens.outsider}}),env);expect((await privateInbox.json()).notifications.some((n:any)=>n.kind==='waitlist_offer')).toBe(false);expect((await waitCall(id,'accept-waitlist','outsider')).status).toBe(404);
 await waitCall(id,'join-waitlist','admin');expect((await waitCall(id,'leave-waitlist','admin')).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_waitlist WHERE player_id=?').get('admin').n).toBe(0);
});
it('waitlist notifications expose offers only to eligible recipients and reserve against guests',async()=>{
 const {id}=await waitGame();await waitCall(id,'join-waitlist','admin');await waitCall(id,'leave','member');
 const inbox=async(who:string)=>handleGames(new Request(origin+'/api/games/notifications',{headers:{Cookie:'oc_session='+tokens[who]}}),env);
 const mine=await(await inbox('admin')).json();expect(mine.notifications.some((n:any)=>n.kind==='waitlist_offer'&&n.gameId===id)).toBe(true);
 const other=await(await inbox('outsider')).json();expect(other.notifications.some((n:any)=>n.kind==='waitlist_offer')).toBe(false);
 expect(()=>db.sqlite.prepare('UPDATE game_participants SET guest_count=1 WHERE game_id=? AND player_id=?').run(id,'owner')).toThrow(/capacity/);
 db.sqlite.prepare("INSERT INTO player_blocks VALUES ('owner','admin',?)").run(Date.now());expect((await(await inbox('admin')).json()).notifications.some((n:any)=>n.kind==='waitlist_offer')).toBe(false);
});

it('host queue is authorized and personal waitlist schedule never leaks after removal',async()=>{
 const {id,groupId}=await waitGame();await waitCall(id,'join-waitlist','admin');
 const queue=async(who:string)=>handleGames(new Request(origin+'/api/games/'+id+'/waitlist',{headers:{Cookie:'oc_session='+tokens[who]}}),env);
 expect((await queue('member')).status).toBe(200);expect((await queue('owner')).status).toBe(200);expect((await(await queue('owner')).json()).players[0]).toMatchObject({id:'admin',status:'waiting'});
 const mine=async()=>handleGames(new Request(origin+'/api/games/mine?view=waitlisted',{headers:{Cookie:'oc_session='+tokens.admin}}),env);
 expect((await(await mine()).json()).games[0]).toMatchObject({id,position:1,section:'waitlisted'});
 await waitCall(id,'leave','member');expect((await(await mine()).json()).games[0].waitlistStatus).toBe('offered');
 await call(groupId,'remove',{playerId:'admin'});expect((await(await mine()).json()).games).toHaveLength(0);expect((await queue('admin')).status).toBe(404);
});

it.each(['public','private'])('%s group games require membership approval before access or attendance',async visibility=>{
 const {id,groupId}=await waitGame();db.sqlite.prepare('UPDATE tennis_groups SET visibility=? WHERE id=?').run(visibility,groupId);
 db.sqlite.prepare('UPDATE games SET event_capacity=8 WHERE id=?').run(id);
 db.sqlite.prepare("DELETE FROM group_memberships WHERE group_id=? AND player_id='outsider'").run(groupId);
 const get=async(path:string,who='outsider')=>handleGames(new Request(origin+'/api/games'+path,{headers:who?{Cookie:'oc_session='+tokens[who]}:{}}),env);
 for(const who of ['', 'outsider']){
  expect((await get('/'+id,who)).status).toBe(404);
  for(const path of ['', '/feed'])expect(JSON.stringify(await(await get(path,who)).json())).not.toContain('Waitlist test');
 }
 for(const action of ['join','join-waitlist'])expect((await waitCall(id,action,'outsider')).status).toBe(404);
 expect((await get('/'+id+'/participation')).status).toBe(404);
 await call(groupId,'request',{},'outsider');
 expect((await waitCall(id,'join','outsider')).status).toBe(404);
 // Even a legacy pending game request cannot bypass approved group membership.
 db.sqlite.prepare("INSERT INTO game_join_requests(game_id,player_id,status,created_at,updated_at) VALUES (?,'outsider','pending',?,?)").run(id,Date.now(),Date.now());
 expect(()=>db.sqlite.prepare("INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,'outsider',?)").run(id,Date.now())).toThrow();
 await call(groupId,'role',{playerId:'admin',role:'organizer'});
 expect((await handleGroups(req('/'+groupId+'/requests','GET',undefined,'admin'),env)).status).toBe(200);
 expect((await call(groupId,'edit',{...input(),version:1},'admin')).status).toBe(403);
 expect((await call(groupId,'archive',{},'admin')).status).toBe(403);
 expect((await call(groupId,'approve',{playerId:'outsider'},'admin')).status).toBe(200);
 expect((await get('/'+id)).status).toBe(200);
 expect((await waitCall(id,'join','outsider')).status).toBe(200);
 await call(groupId,'remove',{playerId:'outsider'});
 expect((await get('/'+id)).status).toBe(404);
});
it('switching a group to private immediately hides events from nonmembers everywhere',async()=>{
 const {id,groupId}=await waitGame();db.sqlite.prepare("UPDATE tennis_groups SET visibility='public' WHERE id=?").run(groupId);db.sqlite.prepare("DELETE FROM group_memberships WHERE group_id=? AND player_id='outsider'").run(groupId);
 expect((await waitCall(id,'join','outsider')).status).toBe(404);
 db.sqlite.prepare("UPDATE tennis_groups SET visibility='private' WHERE id=?").run(groupId);
 const get=async(path:string)=>handleGames(new Request(origin+'/api/games'+path,{headers:{Cookie:'oc_session='+tokens.outsider}}),env);
 expect((await get('/'+id)).status).toBe(404);expect((await get('/'+id+'/participation')).status).toBe(404);expect((await get('/feed?groupId='+groupId)).status).toBe(404);
 for(const path of ['', '/feed','/mine?view=requests','/notifications'])expect(JSON.stringify(await(await get(path)).json())).not.toContain('Waitlist test');
 expect((await waitCall(id,'accept-waitlist','outsider')).status).toBe(404);
});

it('series management honors current group roles and hides schedule notes after removal',async()=>{
 const {id,groupId}=await waitGame();const request=(who:string,suffix='',body?:unknown)=>new Request(origin+'/api/games/'+id+'/series'+suffix,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:'oc_session='+tokens[who],'X-CSRF-Token':'csrf','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 expect((await handleGames(request('member'),env)).status).toBe(404);await call(groupId,'role',{playerId:'admin',role:'coowner'});expect((await handleGames(request('admin'),env)).status).toBe(200);
 const next=new Date(Date.now()+2*86400000).toISOString().slice(0,16);const input={scope:'single',operation:'reschedule',preserveExceptions:true,startLocal:next};let r=await handleGames(request('admin','/preview',input),env);expect(r.status).toBe(200);const plan=await r.json();r=await handleGames(request('admin','/apply',{...input,planHash:plan.planHash,requestId:crypto.randomUUID()}),env);expect(r.status).toBe(200);
 expect(db.sqlite.prepare('SELECT recipient_id,actor_id FROM game_schedule_notifications WHERE recipient_id=?').get('owner')).toMatchObject({recipient_id:'owner',actor_id:'admin'});
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_schedule_notifications WHERE recipient_id=?').get('admin').n).toBe(0);
 await call(groupId,'remove',{playerId:'member'});const inbox=await handleGames(new Request(origin+'/api/games/notifications',{headers:{Cookie:'oc_session='+tokens.member}}),env);expect((await inbox.json()).notifications.some((n:any)=>n.kind==='schedule_changed')).toBe(false);
 await call(groupId,'role',{playerId:'admin',role:'member'});expect((await handleGames(request('admin'),env)).status).toBe(404);
});

for(const operation of ['cancel','series-cancel','archive','reschedule'])it(`excludes acting group owner but not the game's organizer on ${operation}`,async()=>{
 const {id,groupId}=await waitGame();
 // Both Owner and the delegated game organizer participate in this game.
 db.sqlite.prepare("UPDATE games SET organizer_id='member' WHERE id=?").run(id);
 await call(groupId,'role',{playerId:'member',role:'organizer'});
 if(operation==='archive')expect((await call(groupId,'archive')).status).toBe(200);
 else if(operation==='cancel')expect((await waitCall(id,'cancel','owner')).status).toBe(200);
 else {
  const input={scope:'single',operation:operation==='reschedule'?'reschedule':'cancel',preserveExceptions:true,startLocal:new Date(Date.now()+2*86400000).toISOString().slice(0,16)};
  const seriesReq=(suffix:string,body:unknown)=>new Request(origin+'/api/games/'+id+'/series/'+suffix,{method:'POST',headers:{Origin:origin,Cookie:'oc_session='+tokens.owner,'X-CSRF-Token':'csrf','Content-Type':'application/json'},body:JSON.stringify(body)});
  const preview=await handleGames(seriesReq('preview',input),env);expect(preview.status).toBe(200);const plan=await preview.json();
  expect((await handleGames(seriesReq('apply',{...input,planHash:plan.planHash,requestId:crypto.randomUUID()}),env)).status).toBe(200);
 }
 const table=operation==='reschedule'?'game_schedule_notifications':'game_notifications';
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM '+table+' WHERE recipient_id=?').get('owner').n).toBe(0);
 expect(db.sqlite.prepare('SELECT actor_id FROM '+table+' WHERE recipient_id=?').get('member')).toMatchObject({actor_id:'owner'});
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_action_context').get().n).toBe(0);
});

it('does not notify a Co-owner approving their own guests, but notifies them when another manager acts',async()=>{
 const {id,groupId}=await waitGame();await call(groupId,'role',{playerId:'admin',role:'coowner'});
 db.sqlite.prepare('UPDATE games SET event_capacity=4 WHERE id=?').run(id);
 db.sqlite.prepare("INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,'admin',?)").run(id,Date.now());
 expect((await waitCall(id,'request-guests','admin',{guestCount:1})).status).toBe(200);
 expect((await waitCall(id,'approve-guests','admin',{playerId:'admin'})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_guest_notifications WHERE recipient_id='admin'").get().n).toBe(0);
 expect((await waitCall(id,'cancel-guests','admin')).status).toBe(200);
 await call(groupId,'role',{playerId:'admin',role:'member'});
 expect((await waitCall(id,'request-guests','admin',{guestCount:1})).status).toBe(200);
 expect((await waitCall(id,'approve-guests','owner',{playerId:'admin'})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT actor_id FROM game_guest_notifications WHERE recipient_id='admin' AND kind='guest_approved'").get()).toMatchObject({actor_id:'owner'});
});

it('approved group members read player lists without private reasons or management rights',async()=>{
 const {id,groupId}=await waitGame();await waitCall(id,'leave','member',{reason:'PRIVATE cancellation reason'});
 const get=async(action:string,who='admin')=>handleGames(new Request(origin+'/api/games/'+id+'/'+action,{headers:{Cookie:'oc_session='+tokens[who]}}),env);
 expect((await get('participants')).status).toBe(200);
 const cancellations=await get('cancellations');expect(cancellations.status).toBe(200);const data=await cancellations.json();expect(data.players[0]).toHaveProperty('displayName');expect(data.players[0]).not.toHaveProperty('reason');
 expect((await get('requests')).status).toBe(403);expect((await waitCall(id,'remove','admin',{playerId:'owner'})).status).toBe(403);
 await call(groupId,'remove',{playerId:'admin'});for(const action of ['participants','waitlist','cancellations'])expect((await get(action)).status).toBe(404);
});

it('rejoining clears current player cancellations and guest cancellations are shown separately',async()=>{
 const {id}=await waitGame();await waitCall(id,'leave','member',{reason:'Earlier cancellation'});
 const list=async()=> (await(await handleGames(new Request(origin+'/api/games/'+id+'/cancellations',{headers:{Cookie:'oc_session='+tokens.owner}}),env)).json()).players;
 expect((await list()).some((p:any)=>p.kind==='player'&&p.displayName==='Name member')).toBe(true);
 await waitCall(id,'join','member');expect((await list()).some((p:any)=>p.kind==='player'&&p.displayName==='Name member')).toBe(false);
 await waitCall(id,'request-guests','member',{guestCount:1});await waitCall(id,'cancel-guests','member');
 expect(await list()).toContainEqual(expect.objectContaining({kind:'guests',displayName:'Name member',guestCount:1}));
 await waitCall(id,'request-guests','member',{guestCount:1});expect((await list()).some((p:any)=>p.kind==='guests')).toBe(false);
});

it('public group covers use bounded versioned caching while player images stay private',async()=>{
 const id=await create();db.sqlite.prepare("INSERT INTO media_assets VALUES('group',?,'cover','version1',?)").run(id,Date.now());db.sqlite.prepare("INSERT INTO media_assets VALUES('player','owner','avatar','avatar1',?)").run(Date.now());
 const mediaEnv={...env,PLAY_TOGETHER_MEDIA:{get:async()=>({body:new Response('image').body!}),put:async()=>{},delete:async()=>{}}};
 const original=await handleMedia(new Request(origin+'/api/media/group/'+id),mediaEnv);expect(original.status).toBe(302);expect(original.headers.get('Cache-Control')).toBe('no-store');
 const cover=await handleMedia(new Request(origin+original.headers.get('Location')),mediaEnv);expect(cover.headers.get('Cache-Control')).toBe('public, max-age=3600');
 const avatar=await handleMedia(new Request(origin+'/api/media/player/owner?v=avatar1',{headers:{Cookie:'oc_session='+tokens.owner}}),mediaEnv);expect(avatar.headers.get('Cache-Control')).toBe('private, no-store');
 db.sqlite.prepare("UPDATE media_assets SET version='version2' WHERE kind='group'").run();const changed=await handleMedia(new Request(origin+'/api/media/group/'+id+'?v=version1'),mediaEnv);expect(changed.status).toBe(302);expect(changed.headers.get('Location')).toContain('version2');
});

it('removes processor metadata before saving without relaxing output safety',async()=>{
 const id=await create(),plain=webp(),extra=new TextEncoder().encode('EXIF GPS private');const encoded=new Uint8Array(plain.length+8+extra.length);encoded.set(plain);encoded.set(new TextEncoder().encode('EXIF'),plain.length);new DataView(encoded.buffer).setUint32(plain.length+4,extra.length,true);encoded.set(extra,plain.length+8);new DataView(encoded.buffer).setUint32(4,encoded.length-8,true);let stored:ArrayBuffer|null=null;
 const mediaEnv:MediaEnv={...env,MEDIA_UPLOADS_ENABLED:'true',PLAY_TOGETHER_MEDIA:{put:async(_k,v)=>{stored=v;},get:async()=>null,delete:async()=>{}},PLAY_TOGETHER_IMAGE_PROCESSOR:{fetch:async()=>new Response(encoded)}};
 const response=await handleMedia(new Request(origin+'/api/media/group/'+id,{method:'PUT',headers:{Origin:origin,Cookie:'oc_session='+tokens.owner,'X-CSRF-Token':'csrf','Content-Type':'image/png'},body:'synthetic-input'}),mediaEnv);expect(response.status).toBe(200);expect(stored).not.toBeNull();expect(new Uint8Array(stored!)).toEqual(plain);expect(safeWebp(new Uint8Array(stored!),'group')).toEqual({width:32,height:32});
});

it('a first photo starts private even after a legacy empty opt-in, while replacement keeps explicit sharing',async()=>{
 db.sqlite.exec(readFileSync('functions/db/migrations/0032_group_discussions.sql','utf8'));db.sqlite.prepare("INSERT INTO player_photo_preferences VALUES('owner',1,?)").run(Date.now());const mediaEnv:MediaEnv={...env,MEDIA_UPLOADS_ENABLED:'true',PLAY_TOGETHER_MEDIA:{put:async()=>{},get:async()=>null,delete:async()=>{}},PLAY_TOGETHER_IMAGE_PROCESSOR:{fetch:async()=>new Response(webp())}};const upload=()=>new Request(origin+'/api/media/player/owner',{method:'PUT',headers:{Origin:origin,Cookie:'oc_session='+tokens.owner,'X-CSRF-Token':'csrf','Content-Type':'image/png'},body:'synthetic-image'});expect((await handleMedia(upload(),mediaEnv)).status).toBe(200);expect(db.sqlite.prepare("SELECT shared FROM player_photo_preferences WHERE player_id='owner'").get().shared).toBe(0);db.sqlite.prepare("UPDATE player_photo_preferences SET shared=1 WHERE player_id='owner'").run();expect((await handleMedia(upload(),mediaEnv)).status).toBe(200);expect(db.sqlite.prepare("SELECT shared FROM player_photo_preferences WHERE player_id='owner'").get().shared).toBe(1);
});

// Exercise the exact bearer/CSRF transport and fields used by native Create Game.
async function nativeCreateFixture(visibility: 'public' | 'private') {
 // Keep sessions valid relative to the fixed clock used by DST fixtures.
 db.sqlite.prepare("UPDATE auth_sessions SET created_at=?,expires_at=? WHERE player_id='owner'").run(Date.now(),Date.now()+86400000);
 const groupId=await create({...input(),visibility});
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios' WHERE player_id='owner'").run();
 const payload={groupId,visibility:'group',joinPolicy:'instant',title:'Native group fixture',
  courtToken:await courtSelectionToken({id:'court',name:'Fixture court',lat:38,lon:-77,access:'public'},'owner',env,origin),
  startLocal:new Date(Date.now()+86400000).toISOString().slice(0,16),timeZone:'UTC',durationMinutes:60,
  format:'doubles',courtCount:1,capacity:4,repeatWeeks:1,skillPreference:'any',notes:'',
  requestId:crypto.randomUUID(),acknowledgeNoReservation:true,confirmAccess:false};
 const submit=(body=payload,extra:Record<string,string>={})=>handleGames(new Request(origin+'/api/games',{
  method:'POST',headers:{Origin:origin,Authorization:'Bearer '+tokens.owner,'X-CSRF-Token':'csrf','Content-Type':'application/json',...extra},body:JSON.stringify(body)}),env);
 return {groupId,payload,submit};
}

it.each(['public','private'] as const)('accepts native bearer creation and exact retries for %s groups without duplicate games',async visibility=>{
 const {payload,submit}=await nativeCreateFixture(visibility);
 const first=await submit();expect(first.status).toBe(201);const created=await first.json();
 expect(created.game).toMatchObject({visibility:'group',joinPolicy:'instant',playerCount:1,capacity:4,groupId:payload.groupId});
 const retry=await submit();expect(retry.status).toBe(200);expect((await retry.json()).game.id).toBe(created.game.id);
 expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM games').get().n).toBe(1);
 const anonymous=await handleGames(new Request(origin+'/api/games/'+created.game.id),env);
 expect(anonymous.status).toBe(404);
 expect((await submit({...payload,title:'Changed after uncertain response'})).status).toBe(409);
});

it.each(['role','archive','membership'] as const)('denies native group creation after %s access changes with no partial write',async change=>{
 const {groupId,submit}=await nativeCreateFixture('private');
 if(change==='archive')db.sqlite.prepare("UPDATE tennis_groups SET status='archived' WHERE id=?").run(groupId);
 else if(change==='membership')db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE group_id=? AND player_id='owner'").run(groupId);
 else {
  db.sqlite.prepare("UPDATE tennis_groups SET owner_id='member' WHERE id=?").run(groupId);
  db.sqlite.prepare("UPDATE group_memberships SET role='member',assigned_role='member' WHERE group_id=? AND player_id='owner'").run(groupId);
 }
 expect((await submit()).status).toBe(403);
 expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM games').get().n).toBe(0);
});

it('rejects native CSRF, account switching and session revocation before creating duplicates',async()=>{
 const {submit}=await nativeCreateFixture('private');
 expect((await submit(undefined,{'X-CSRF-Token':'wrong'})).status).toBe(403);
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios' WHERE player_id='outsider'").run();
 expect((await submit(undefined,{Authorization:'Bearer '+tokens.outsider})).status).toBe(403);
 expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM games').get().n).toBe(0);
 expect((await submit()).status).toBe(201);
 db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=? WHERE player_id='owner'").run(Date.now());
 expect((await submit()).status).toBe(401);
 expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM games').get().n).toBe(1);
});

it.each([
 ['2027-03-14T02:30',Date.UTC(2026,10,21),'does not exist'],
 ['2026-11-01T01:30',Date.UTC(2026,9,1),'occurs twice']
] as const)('rejects native DST wall time %s without partial creation',async(startLocal,now,reason)=>{
 const clock=vi.spyOn(Date,'now').mockReturnValue(now);
 try {
  const {payload,submit}=await nativeCreateFixture('private');
  const response=await submit({...payload,startLocal,timeZone:'America/New_York'});
  expect(response.status).toBe(400);expect((await response.json()).error).toContain(reason);
  expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM games').get().n).toBe(0);
 } finally {clock.mockRestore();}
});

function nativeGameCall(id:string,action:string,who:string,body?:unknown){
 return handleGames(new Request(`${origin}/api/games/${id}/${action}`,{
  method:body===undefined?'GET':'POST',headers:{Origin:origin,Authorization:'Bearer '+tokens[who],'X-CSRF-Token':'csrf','Content-Type':'application/json'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
}

it('native standalone participation uses approval for public outsiders and preserves notification events and private reasons',async()=>{
 const {submit}=await nativeCreateFixture('public');const created=await submit();const id=(await created.json()).game.id;
 db.sqlite.prepare("UPDATE games SET visibility='public',group_id=NULL,join_policy='approval' WHERE id=?").run(id);
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios' WHERE player_id='outsider'").run();
 expect((await nativeGameCall(id,'join','outsider',{})).status).toBe(200);
 expect((await nativeGameCall(id,'join','outsider',{})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM notification_events WHERE entity_id=? AND kind='requested'").get(id).n).toBe(1);
 expect(await(await nativeGameCall(id,'participation','outsider')).json()).toMatchObject({joined:false,requestStatus:'pending',joinPolicy:'approval',isOrganizer:false,isGroupMember:false});
 expect((await nativeGameCall(id,'participants','outsider')).status).toBe(403);
 expect((await(await nativeGameCall(id,'requests','owner')).json()).players).toEqual([expect.objectContaining({id:'outsider'})]);
 expect((await nativeGameCall(id,'approve','owner',{playerId:'outsider'})).status).toBe(200);
 expect(await(await nativeGameCall(id,'participation','outsider')).json()).toMatchObject({joined:true,requestStatus:'approved'});
 expect((await nativeGameCall(id,'leave','outsider',{reason:'PRIVATE native reason'})).status).toBe(200);
 expect(await(await nativeGameCall(id,'participation','outsider')).json()).toMatchObject({joined:false,requestStatus:null});
 // Notifications live at the collection route, not under the game.
 const inbox=await handleGames(new Request(origin+'/api/games/notifications',{headers:{Authorization:'Bearer '+tokens.owner}}),env);
 expect((await inbox.json()).notifications).toEqual(expect.arrayContaining([expect.objectContaining({kind:'cancelled',reason:'PRIVATE native reason'})]));
 expect(db.sqlite.prepare('SELECT kind FROM notification_events WHERE entity_id=?').all(id).map((r:any)=>r.kind)).toEqual(expect.arrayContaining(['requested','approved','cancelled']));
 expect(JSON.stringify(db.sqlite.prepare('SELECT * FROM notification_events WHERE entity_id=?').all(id))).not.toContain('PRIVATE native reason');
});

it('native group members join instantly and host attendance is independent of cancellation',async()=>{
 const {groupId,submit}=await nativeCreateFixture('private');const id=(await(await submit()).json()).game.id;
 db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES (?,'member','member','active',?,?)").run(groupId,Date.now(),Date.now());
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios' WHERE player_id='member'").run();
 expect(await(await nativeGameCall(id,'participation','member')).json()).toMatchObject({joinPolicy:'instant',isGroupMember:true,joined:false});
 expect((await nativeGameCall(id,'join','member',{})).status).toBe(200);
 expect((await(await nativeGameCall(id,'participants','member')).json()).players).toHaveLength(2);
 expect((await nativeGameCall(id,'leave','owner',{})).status).toBe(200);
 expect(db.sqlite.prepare('SELECT status,organizer_id FROM games WHERE id=?').get(id)).toMatchObject({status:'scheduled',organizer_id:'owner'});
 expect(await(await nativeGameCall(id,'participation','owner')).json()).toMatchObject({isOrganizer:true,isGameOrganizer:true,joined:false});
 expect((await nativeGameCall(id,'join','owner',{})).status).toBe(200);
 expect((await nativeGameCall(id,'cancel','owner',{})).status).toBe(200);
 expect(db.sqlite.prepare('SELECT kind FROM notification_events WHERE entity_id=? AND recipient_id=?').all(id,'member').map((r:any)=>r.kind)).toContain('game_cancelled');
});

it.each(['public','unlisted'] as const)('host request notification migration preserves %s standalone events',async visibility=>{
 const {submit}=await nativeCreateFixture('public');const id=(await(await submit()).json()).game.id;
 db.sqlite.prepare("UPDATE games SET visibility=?,group_id=NULL,join_policy='approval' WHERE id=?").run(visibility,id);
 db.sqlite.prepare("INSERT INTO game_join_requests(game_id,player_id,status,created_at,updated_at) VALUES (?,'outsider','pending',?,?)").run(id,Date.now(),Date.now());
 expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM notification_events WHERE entity_id=? AND recipient_id='owner' AND kind='requested'").get(id).n).toBe(1);
});

it('host request notification migration does not create outsider events for private groups or self-requests',async()=>{
 const {submit}=await nativeCreateFixture('private');const id=(await(await submit()).json()).game.id;
 for(const player of ['outsider','owner'])db.sqlite.prepare("INSERT INTO game_join_requests(game_id,player_id,status,created_at,updated_at) VALUES (?,?,'pending',?,?)").run(id,player,Date.now(),Date.now());
 expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM notification_events WHERE entity_id=? AND kind='requested'").get(id).n).toBe(0);
});

// Native editor contract: preview is read-only, current reservations/version/access remain authoritative.
it('native group capacity editing leaves pending join requests out of the waitlist fill',async()=>{
 const {groupId,submit}=await nativeCreateFixture('public');const id=(await(await submit()).json()).game.id;
 const now=Date.now();
 db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES (?,'member','member','active',?,?)").run(groupId,now,now);
 for(const who of ['member','outsider'])db.sqlite.prepare("INSERT INTO game_join_requests(game_id,player_id,status,created_at,updated_at) VALUES (?,?,'pending',?,?)").run(id,who,now,now);
 const state=await(await nativeGameCall(id,'participation','owner')).json();
 const body={title:'Edited native game',notes:'Bring water',format:'doubles',courtCount:2,capacity:8,fillWaiting:true,version:state.version};
 const preview=await nativeGameCall(id,'edit-preview','owner',body);expect(preview.status).toBe(200);
 expect(await preview.json()).toMatchObject({confirmedPlaces:1,reservedPlaces:0,capacity:8,candidates:[]});
 expect(db.sqlite.prepare('SELECT title,event_capacity FROM games WHERE id=?').get(id)).toMatchObject({title:'Native group fixture',event_capacity:4});
 const saved=await nativeGameCall(id,'edit','owner',body);expect(saved.status,await saved.clone().text()).toBe(200);
 expect(db.sqlite.prepare('SELECT title,event_capacity,version FROM games WHERE id=?').get(id)).toMatchObject({title:body.title,event_capacity:8,version:state.version+1});
 expect(db.sqlite.prepare("SELECT player_id FROM game_participants WHERE game_id=? ORDER BY player_id").all(id).map((p:any)=>p.player_id)).toEqual(['owner']);
 expect((await nativeGameCall(id,'edit','owner',{...body,title:'Stale overwrite'})).status).toBe(409);
 expect(db.sqlite.prepare('SELECT title FROM games WHERE id=?').get(id).title).toBe(body.title);
 expect(db.sqlite.prepare("SELECT status FROM game_join_requests WHERE game_id=? AND player_id='member'").get(id).status).toBe('pending');
 // A capacity below confirmed places must leave both the game and attendance intact.
 expect((await nativeGameCall(id,'edit-preview','owner',{...body,version:state.version+1,format:'singles',courtCount:1,capacity:2})).status).toBe(200);
 db.sqlite.prepare("UPDATE game_participants SET guest_count=2 WHERE game_id=? AND player_id='owner'").run(id);
 expect((await nativeGameCall(id,'edit','owner',{...body,version:state.version+1,format:'singles',courtCount:1,capacity:2})).status).toBe(409);
 expect(db.sqlite.prepare('SELECT event_capacity FROM games WHERE id=?').get(id).event_capacity).toBe(8);
 db.sqlite.prepare("UPDATE tennis_groups SET status='archived' WHERE id=?").run(groupId);
 expect((await nativeGameCall(id,'edit','owner',{...body,version:state.version+1})).status).toBe(404);
});

it('native guest requests preserve member places, enforce whole-party capacity and queue decision events',async()=>{
 const {groupId,submit}=await nativeCreateFixture('private');const id=(await(await submit()).json()).game.id;
 for(const who of ['member','admin']){
  db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES (?,?,'member','active',?,?)").run(groupId,who,Date.now(),Date.now());
  db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios' WHERE player_id=?").run(who);
  expect((await nativeGameCall(id,'join',who,{})).status).toBe(200);
 }
 expect(await(await nativeGameCall(id,'guests','member')).json()).toMatchObject({own:{confirmed:0},canAddGuestsDirectly:false,requests:[]});
 expect((await nativeGameCall(id,'request-guests','member',{guestCount:2})).status).toBe(200);
 expect((await nativeGameCall(id,'request-guests','member',{guestCount:2})).status).toBe(409);
 expect((await nativeGameCall(id,'approve-guests','admin',{playerId:'member'})).status).toBe(403);
 expect((await nativeGameCall(id,'approve-guests','owner',{playerId:'member'})).status).toBe(409);
 expect(await(await nativeGameCall(id,'guests','member')).json()).toMatchObject({own:{confirmed:0,requested:2,status:'pending'},requests:[]});
 expect((await nativeGameCall(id,'cancel-guests','member',{})).status).toBe(200);
 expect((await nativeGameCall(id,'request-guests','member',{guestCount:1})).status).toBe(200);
 expect((await(await nativeGameCall(id,'guests','owner')).json()).requests).toEqual([expect.objectContaining({playerId:'member',guestCount:1})]);
 expect((await nativeGameCall(id,'approve-guests','owner',{playerId:'member'})).status).toBe(200);
 expect(await(await nativeGameCall(id,'guests','member')).json()).toMatchObject({own:{confirmed:1,status:'approved'}});
 expect(db.sqlite.prepare("SELECT kind FROM notification_events WHERE entity_id=? AND recipient_id='member'").all(id).map((n:any)=>n.kind)).toContain('guest_approved');
 expect((await nativeGameCall(id,'cancel-guests','member',{})).status).toBe(200);
 expect(await(await nativeGameCall(id,'participation','member')).json()).toMatchObject({joined:true});
 expect((await nativeGameCall(id,'request-guests','member',{guestCount:1})).status).toBe(200);
 expect((await nativeGameCall(id,'reject-guests','owner',{playerId:'member'})).status).toBe(200);
 expect(await(await nativeGameCall(id,'guests','member')).json()).toMatchObject({own:{confirmed:0,status:'rejected'}});
 // Current server eligibility, not a client role label, controls direct additions.
 expect((await handleGroups(new Request(origin+'/api/groups/'+groupId+'/role',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+tokens.owner,'X-CSRF-Token':'csrf','Content-Type':'application/json'},body:JSON.stringify({playerId:'admin',role:'organizer'})}),env)).status).toBe(200);
 expect(await(await nativeGameCall(id,'guests','admin')).json()).toMatchObject({canAddGuestsDirectly:true});
 expect((await nativeGameCall(id,'request-guests','admin',{guestCount:1})).status).toBe(200);
 expect(await(await nativeGameCall(id,'guests','admin')).json()).toMatchObject({own:{confirmed:1,status:'approved'}});
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE group_id=? AND player_id='member'").run(groupId);
 expect((await nativeGameCall(id,'guests','member')).status).toBe(404);
 expect((await nativeGameCall(id,'request-guests','member',{guestCount:1})).status).toBe(404);
});

it('native waitlist follows FIFO offers, expiry, reservation and revoked-member access',async()=>{
 const {groupId,payload,submit}=await nativeCreateFixture('private');
 const id=(await(await submit({...payload,format:'singles',capacity:2})).json()).game.id;
 for(const who of ['member','admin','outsider']){
  db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES (?,?,'member','active',?,?)").run(groupId,who,Date.now(),Date.now());
  db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios' WHERE player_id=?").run(who);
 }
 expect((await nativeGameCall(id,'join','member',{})).status).toBe(200);
 expect((await nativeGameCall(id,'join-waitlist','admin',{})).status).toBe(200);
 db.sqlite.prepare("UPDATE game_waitlist SET created_at=? WHERE game_id=? AND player_id='admin'").run(Date.now()-1000,id);
 expect((await nativeGameCall(id,'join-waitlist','outsider',{})).status).toBe(200);
 expect(await(await nativeGameCall(id,'participation','admin')).json()).toMatchObject({waitlist:{status:'waiting',position:1}});
 expect(await(await nativeGameCall(id,'participation','outsider')).json()).toMatchObject({waitlist:{status:'waiting',position:2}});
 expect((await nativeGameCall(id,'leave','member',{})).status).toBe(200);
 expect(await(await nativeGameCall(id,'participation','admin')).json()).toMatchObject({availablePlaces:0,waitlist:{status:'offered'}});
 expect((await nativeGameCall(id,'join','member',{})).status).toBe(409);
 const queue=await(await nativeGameCall(id,'waitlist','outsider')).json();expect(queue.players).toEqual([expect.objectContaining({id:'admin',status:'offered'}),expect.objectContaining({id:'outsider',status:'waiting'})]);
 db.sqlite.prepare("UPDATE game_waitlist SET offer_expires_at=? WHERE game_id=? AND player_id='admin'").run(Date.now()-1,id);
 expect((await nativeGameCall(id,'accept-waitlist','admin',{})).status).toBe(409);
 expect(await(await nativeGameCall(id,'participation','outsider')).json()).toMatchObject({waitlist:{status:'offered'}});
 expect((await nativeGameCall(id,'accept-waitlist','outsider',{})).status).toBe(200);
 expect(await(await nativeGameCall(id,'participation','outsider')).json()).toMatchObject({joined:true,waitlist:null});
 expect((await nativeGameCall(id,'join-waitlist','admin',{})).status).toBe(200);
 expect((await nativeGameCall(id,'leave-waitlist','admin',{})).status).toBe(200);
 expect(await(await nativeGameCall(id,'participation','admin')).json()).toMatchObject({waitlist:null});
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE group_id=? AND player_id='admin'").run(groupId);
 expect((await nativeGameCall(id,'waitlist','admin')).status).toBe(404);
 expect((await nativeGameCall(id,'join-waitlist','admin',{})).status).toBe(404);
});


it.each(['public','private'])('native Owner archives %s groups and immediately revokes member access',async visibility=>{
 const id=await create({...input(),visibility});await member(id,'member');await member(id,'admin');
 await call(id,'role',{playerId:'admin',role:'coowner'});
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGroupCall(id,'archive','admin',{})).status).toBe(403);
 expect((await nativeGroupCall(id,'archive','member',{})).status).toBe(403);
 expect((await nativeGroupCall(id,'archive','owner',{},'wrong')).status).toBe(403);
 expect((await(await nativeGroupCall(id,'','member')).json()).content.description).toBe('PRIVATE-CONTENT-SENTINEL');
 expect((await nativeGroupCall(id,'archive','owner',{})).status).toBe(200);
 for(const actor of ['owner','admin','member']){
  const detail=await(await nativeGroupCall(id,'',actor)).json();
  expect(detail.archived).toBe(true);expect(detail.content).toBeUndefined();expect(detail.discussionCount).toBeUndefined();expect(detail.membership.role).toBeNull();
  expect((await nativeGroupCall(id,'members',actor)).status).toBe(403);
  expect((await nativeGroupCall(id,'requests',actor)).status).toBe(403);
  expect((await nativeGroupCall(id,'invitations',actor)).status).toBe(403);
 }
 expect((await nativeGroupCall(id,'request','outsider',{})).status).toBe(409);
 expect((await(await handleGroups(req(),env)).json()).groups).toHaveLength(0);
 expect(db.sqlite.prepare('SELECT status FROM tennis_groups WHERE id=?').get(id).status).toBe('archived');
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM group_memberships WHERE group_id=?').get(id).n).toBe(3);
});

function nativeCoverRequest(id:string,who:string,method='PUT',body:BodyInit|null='native-image',type='image/png',csrf='csrf'){
 return new Request(origin+'/api/media/group/'+id,{method,headers:{Origin:origin,Authorization:'Bearer '+tokens[who],'X-CSRF-Token':csrf,'Content-Type':type},...(body===null?{}:{body})});
}
function nativeCoverEnvironment(process?:()=>void){
 const objects=new Map<string,ArrayBuffer>();
 const mediaEnv:MediaEnv={...env,MEDIA_UPLOADS_ENABLED:'true',PLAY_TOGETHER_MEDIA:{put:async(k,v)=>{objects.set(k,v);},get:async k=>objects.has(k)?{body:new Blob([objects.get(k)!]).stream()}:null,delete:async k=>{objects.delete(k);}},PLAY_TOGETHER_IMAGE_PROCESSOR:{fetch:async request=>{expect(request.headers.get('Content-Type')).toBe('image/png');expect(await request.text()).toBe('native-image');process?.();return new Response(webp());}}};
 return {objects,mediaEnv};
}
for(const visibility of ['public','private'])it.each(['owner','coowner','admin','organizer','member'])('native '+visibility+' cover mutations enforce %s authority while reads stay public',async role=>{
 const id=await create({...input(),visibility});await member(id,'member');
 if(role!=='owner')db.sqlite.prepare('UPDATE group_memberships SET role=?,assigned_role=? WHERE group_id=? AND player_id=?').run(role==='admin'?'admin':'member',role==='admin'?null:role,id,'member');
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const {objects,mediaEnv}=nativeCoverEnvironment();
 const first=await handleMedia(nativeCoverRequest(id,'owner'),mediaEnv);expect(first.status).toBe(200);const firstURL=(await first.json()).url;
 const actor=role==='owner'?'owner':'member',allowed=['owner','coowner'].includes(role);
 const replace=await handleMedia(nativeCoverRequest(id,actor),mediaEnv);expect(replace.status).toBe(allowed?200:404);
 const url=allowed?(await replace.json()).url:firstURL;
 const read=await handleMedia(new Request(origin+url),mediaEnv);expect(read.status).toBe(200);expect(read.headers.get('Cache-Control')).toBe('public, max-age=3600');expect(read.headers.get('Content-Type')).toBe('image/webp');
 expect(objects.size).toBe(1);
 expect((await handleMedia(nativeCoverRequest(id,actor,'DELETE',null),mediaEnv)).status).toBe(allowed?200:404);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM media_assets WHERE kind='group' AND subject_id=?").get(id).n).toBe(allowed?0:1);
 expect(objects.size).toBe(allowed?0:1);
});

it.each(['demotion','removal','archive','session'] as const)('native cover %s during processing preserves existing cover and cleans uncommitted bytes',async change=>{
 const id=await create();await member(id,'member');await call(id,'role',{playerId:'member',role:'coowner'});
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const {objects,mediaEnv}=nativeCoverEnvironment();expect((await handleMedia(nativeCoverRequest(id,'owner'),mediaEnv)).status).toBe(200);
 const before=db.sqlite.prepare("SELECT * FROM media_assets WHERE kind='group' AND subject_id=?").get(id);
 mediaEnv.PLAY_TOGETHER_IMAGE_PROCESSOR={fetch:async()=>{
  if(change==='demotion')db.sqlite.prepare("UPDATE group_memberships SET assigned_role='member' WHERE group_id=? AND player_id='member'").run(id);
  if(change==='removal')db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE group_id=? AND player_id='member'").run(id);
  if(change==='archive')db.sqlite.prepare("UPDATE tennis_groups SET status='archived' WHERE id=?").run(id);
  if(change==='session')db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=? WHERE player_id='member'").run(Date.now());
  return new Response(webp());
 }};
 expect((await handleMedia(nativeCoverRequest(id,'member'),mediaEnv)).status).toBe(409);
 expect(db.sqlite.prepare("SELECT * FROM media_assets WHERE kind='group' AND subject_id=?").get(id)).toEqual(before);expect(objects.size).toBe(1);
});

it('native cover uploads reject CSRF, unsupported formats, oversize input and disabled storage without mutation',async()=>{
 const id=await create();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();const {objects,mediaEnv}=nativeCoverEnvironment();
 expect((await handleMedia(nativeCoverRequest(id,'owner','PUT','native-image','image/png','wrong'),mediaEnv)).status).toBe(403);
 expect((await handleMedia(nativeCoverRequest(id,'owner','PUT','native-image','image/heic'),mediaEnv)).status).toBe(415);
 expect((await handleMedia(nativeCoverRequest(id,'owner','PUT',new Uint8Array(5*1024*1024+1)),mediaEnv)).status).toBe(413);
 expect((await handleMedia(nativeCoverRequest(id,'owner'),{...mediaEnv,MEDIA_UPLOADS_ENABLED:'false'})).status).toBe(503);
 expect(objects.size).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM media_assets').get().n).toBe(0);
});

for(const visibility of ['public','private'])it.each(['owner','coowner','organizer','admin','member'])('native '+visibility+' game review enforces current %s management independently of host identity',async role=>{
 const {id,groupId}=await waitGame();db.sqlite.prepare('UPDATE tennis_groups SET visibility=? WHERE id=?').run(visibility,groupId);
 let actor='member';
 if(role==='owner')actor='owner';
 if(role==='coowner'){actor='admin';await call(groupId,'role',{playerId:'admin',role:'coowner'});}
 if(role==='organizer'){await call(groupId,'role',{playerId:'member',role:'organizer'});db.sqlite.prepare("UPDATE games SET organizer_id='member' WHERE id=?").run(id);}
 if(role==='admin'){actor='admin';db.sqlite.prepare("UPDATE group_memberships SET role='admin',assigned_role=NULL WHERE group_id=? AND player_id='admin'").run(groupId);}
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const state=await(await nativeGameCall(id,'participation',actor)).json();const allowed=['owner','coowner','organizer'].includes(role);
 expect(state.isOrganizer).toBe(allowed);expect(state.isGameOrganizer).toBe(['owner','organizer'].includes(role));
 const body={title:'Permission preview',notes:'',format:'singles',courtCount:1,capacity:2,fillWaiting:false,version:state.version};
 expect((await nativeGameCall(id,'edit-preview',actor,body)).status).toBe(allowed?200:403);
 if(role==='organizer'){
  db.sqlite.prepare("UPDATE games SET organizer_id='owner' WHERE id=?").run(id);
  expect(await(await nativeGameCall(id,'participation',actor)).json()).toMatchObject({isOrganizer:false,isGameOrganizer:false,isGroupMember:true,joined:true});
  expect((await nativeGameCall(id,'edit-preview',actor,body)).status).toBe(403);
  expect((await nativeGameCall(id,'cancel',actor,{})).status).toBe(403);
 }
 expect(db.sqlite.prepare('SELECT title,status FROM games WHERE id=?').get(id)).toMatchObject({title:'Waitlist test',status:'scheduled'});
});

it.each(['demotion','leave','removal'] as const)('native Organizer %s transfers management without giving the Owner a playing place',async change=>{
 const {id,groupId}=await waitGame();await call(groupId,'role',{playerId:'member',role:'organizer'});
 db.sqlite.prepare("UPDATE games SET organizer_id='member' WHERE id=?").run(id);
 db.sqlite.prepare("DELETE FROM game_participants WHERE game_id=? AND player_id='owner'").run(id);
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect(await(await nativeGameCall(id,'participation','member')).json()).toMatchObject({isOrganizer:true,isGameOrganizer:true,joined:true});
 if(change==='demotion')expect((await nativeGroupCall(groupId,'role','owner',{playerId:'member',role:'member'})).status).toBe(200);
 if(change==='leave')expect((await nativeGroupCall(groupId,'leave','member',{})).status).toBe(200);
 if(change==='removal')expect((await nativeGroupCall(groupId,'remove','owner',{playerId:'member'})).status).toBe(200);
 expect(db.sqlite.prepare('SELECT organizer_id,status FROM games WHERE id=?').get(id)).toMatchObject({organizer_id:'owner',status:'scheduled'});
 const owner=await(await nativeGameCall(id,'participation','owner')).json();expect(owner).toMatchObject({isOrganizer:true,isGameOrganizer:true,joined:false});
 const body={title:'Owner review',notes:'',format:'singles',courtCount:1,capacity:2,fillWaiting:false,version:owner.version};
 expect((await nativeGameCall(id,'edit-preview','owner',body)).status).toBe(200);
 expect((await nativeGameCall(id,'edit','member',body)).status).toBe(change==='demotion'?403:404);
 const former=await nativeGameCall(id,'participation','member');expect(former.status).toBe(change==='demotion'?200:404);
 if(change==='demotion')expect(await former.json()).toMatchObject({isOrganizer:false,isGameOrganizer:false,joined:true});
 expect(db.sqlite.prepare('SELECT title FROM games WHERE id=?').get(id).title).toBe('Waitlist test');
});

for(const [from,to] of [['public','private'],['private','public']] as const)it.each(['none','pending','rejected','removed'])('native '+from+' → '+to+' preserves member-only games for %s outsiders',async status=>{
 const {id,groupId}=await waitGame();db.sqlite.prepare('UPDATE tennis_groups SET visibility=? WHERE id=?').run(from,groupId);
 db.sqlite.prepare("UPDATE games SET notes='PRIVATE-EVENT-SENTINEL' WHERE id=?").run(id);
 db.sqlite.prepare("INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,places_released,created_at) VALUES (?,?,'outsider','owner','approved',0,?)").run(crypto.randomUUID(),id,Date.now());
 if(status==='none')db.sqlite.prepare("DELETE FROM group_memberships WHERE group_id=? AND player_id='outsider'").run(groupId);
 else db.sqlite.prepare("UPDATE group_memberships SET status=? WHERE group_id=? AND player_id='outsider'").run(status,groupId);
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const read=(path:string,who='outsider')=>handleGames(new Request(origin+'/api/games'+path,{headers:who?{Authorization:'Bearer '+tokens[who]}:{}}),env);
 expect((await read('/'+id)).status).toBe(404);
 const before=await(await nativeGroupCall(groupId,'','owner')).json();const {requestId,...fields}=input();
 expect((await nativeGroupCall(groupId,'edit','owner',{...fields,visibility:to,version:before.content.version})).status).toBe(200);
 for(const actor of ['outsider','']){
  for(const path of ['/'+id,'/'+id+'/participation','/'+id+'/participants','/'+id+'/guests','/'+id+'/waitlist','/feed?groupId='+groupId]){
   expect((await read(path,actor)).status).toBe(actor?404:([ '/'+id, '/feed?groupId='+groupId ].includes(path)?404:401));
  }
  for(const path of ['', '/feed'])expect(JSON.stringify(await(await read(path,actor)).json())).not.toMatch(/Waitlist test|PRIVATE-EVENT-SENTINEL/);
 }
 for(const path of ['/mine?view=upcoming','/mine?view=requests','/notifications'])expect(JSON.stringify(await(await read(path)).json())).not.toMatch(/Waitlist test|PRIVATE-EVENT-SENTINEL/);
 expect((await nativeGameCall(id,'join','outsider',{})).status).toBe(404);
 expect((await nativeGameCall(id,'accept-waitlist','outsider',{})).status).toBe(404);
 const preview=await(await nativeGroupCall(groupId,'','outsider')).json();expect(preview.group.visibility).toBe(to);expect(preview.content).toBeUndefined();expect(preview.discussionCount).toBeUndefined();expect(JSON.stringify(preview)).not.toContain('PRIVATE-CONTENT-SENTINEL');
 const approved=await read('/'+id,'member');expect(approved.status).toBe(200);expect((await approved.json()).game.groupVisibility).toBe(to);
 const memberFeed=await read('/feed?groupId='+groupId,'member');expect(memberFeed.status).toBe(200);expect((await memberFeed.json()).games.map((g:any)=>g.id)).toContain(id);
 expect((await(await nativeGameCall(id,'participation','member')).json()).joined).toBe(true);
});

it.each(['organizer','member'])('native %s cannot change group visibility',async role=>{
 const {id,groupId}=await waitGame();if(role==='organizer')await call(groupId,'role',{playerId:'member',role});
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();const detail=await(await nativeGroupCall(groupId,'','owner')).json();const {requestId,...fields}=input();
 expect((await nativeGroupCall(groupId,'edit','member',{...fields,visibility:'public',version:detail.content.version})).status).toBe(403);
 expect(db.sqlite.prepare('SELECT visibility FROM tennis_groups WHERE id=?').get(groupId).visibility).toBe('private');
 expect(db.sqlite.prepare('SELECT status FROM games WHERE id=?').get(id).status).toBe('scheduled');
});

it('native visibility edits reject stale confirmation versions without changing membership or exposing games',async()=>{
 const {id,groupId}=await waitGame();db.sqlite.prepare("UPDATE group_memberships SET status='pending' WHERE group_id=? AND player_id='outsider'").run(groupId);
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();const version=(await(await nativeGroupCall(groupId,'','owner')).json()).content.version;const {requestId,...fields}=input();
 expect((await nativeGroupCall(groupId,'edit','owner',{...fields,visibility:'public',version})).status).toBe(200);
 expect((await nativeGroupCall(groupId,'edit','owner',{...fields,visibility:'private',version})).status).toBe(409);
 expect(db.sqlite.prepare('SELECT visibility FROM tennis_groups WHERE id=?').get(groupId).visibility).toBe('public');
 expect((await nativeGameCall(id,'participation','outsider')).status).toBe(404);
 expect((await(await nativeGameCall(id,'participation','member')).json()).joined).toBe(true);
});

async function nativeSeriesFixture(visibility:'public'|'private'='private'){
 const fixture=await nativeCreateFixture(visibility);fixture.payload.repeatWeeks=3;
 const response=await fixture.submit();expect(response.status).toBe(201);const id=(await response.json()).game.id;
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const ids=db.sqlite.prepare('SELECT id FROM games WHERE series_id=? ORDER BY series_week').all(id).map((r:any)=>r.id) as string[];
 const request=(anchor=id,suffix='',actor='owner',body?:unknown)=>nativeGameCall(anchor,'series'+suffix,actor,body);
 const wall=(anchor:string,shift=3600000)=>new Date(Number(db.sqlite.prepare('SELECT starts_at FROM games WHERE id=?').get(anchor).starts_at)+shift).toISOString().slice(0,16);
 const draft=(anchor=id,extra:Record<string,unknown>={})=>({scope:'single',operation:'reschedule',preserveExceptions:true,startLocal:wall(anchor),...extra});
 const preview=async(anchor=id,body:Record<string,unknown>=draft(anchor),actor='owner')=>{const r=await request(anchor,'/preview',actor,body);expect(r.status).toBe(200);return {body,plan:await r.json()};};
 const apply=(anchor:string,review:{body:unknown;plan:any},requestId=crypto.randomUUID(),actor='owner')=>request(anchor,'/apply',actor,{...(review.body as object),planHash:review.plan.planHash,requestId});
 return {...fixture,id,ids,request,wall,draft,preview,apply};
}

it.each(['public','private'] as const)('native %s series lists ISO dates and applies millisecond plans exactly once',async visibility=>{
 const f=await nativeSeriesFixture(visibility);const list=await(await f.request()).json();expect(list.seriesId).toBe(f.id);expect(list.games).toHaveLength(3);
 for(const game of list.games){expect(game.startsAt).toMatch(/Z$/);expect(game.startLocal).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);expect(game.capacity).toBe(4);expect(game.editable).toBe(true);expect(game.exception).toBe(false);}
 const before=db.sqlite.prepare('SELECT id,starts_at,version FROM games ORDER BY id').all();const attendance=db.sqlite.prepare('SELECT * FROM game_participants ORDER BY game_id,player_id').all();
 const review=await f.preview();expect(review.plan.affected).toHaveLength(1);expect(typeof review.plan.affected[0].oldStart).toBe('number');expect(review.plan.affected[0].oldStart).toBeGreaterThan(1000000000000);
 expect(db.sqlite.prepare('SELECT id,starts_at,version FROM games ORDER BY id').all()).toEqual(before);
 const requestId=crypto.randomUUID();expect((await f.apply(f.id,review,requestId)).status).toBe(200);expect((await f.apply(f.id,review,requestId)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_series_changes').get().n).toBe(1);
 expect(db.sqlite.prepare('SELECT starts_at,series_exception FROM games WHERE id=?').get(f.id)).toMatchObject({starts_at:review.plan.affected[0].newStart,series_exception:1});
 expect(db.sqlite.prepare('SELECT * FROM game_participants ORDER BY game_id,player_id').all()).toEqual(attendance);
 expect(db.sqlite.prepare('SELECT id FROM games WHERE series_id=? ORDER BY series_week').all(f.id).map((r:any)=>r.id)).toEqual(f.ids);
});

it('native future rescheduling preserves exceptions and future cancellation includes them',async()=>{
 const f=await nativeSeriesFixture();let review=await f.preview(f.ids[1],f.draft(f.ids[1],{startLocal:f.wall(f.ids[1],7200000)}));expect((await f.apply(f.ids[1],review)).status).toBe(200);
 review=await f.preview(f.id,f.draft(f.id,{scope:'future'}));expect(review.plan.affected).toHaveLength(2);expect(review.plan.skipped).toContainEqual(expect.objectContaining({id:f.ids[1],reason:'Individual exception preserved'}));
 expect((await f.apply(f.id,review)).status).toBe(200);
 review=await f.preview(f.id,{scope:'future',operation:'cancel',preserveExceptions:false});expect(review.plan.affected).toHaveLength(3);
 expect((await f.apply(f.id,review)).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM games WHERE series_id=?').get(f.id).n).toBe(3);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM games WHERE series_id=? AND status='scheduled'").get(f.id).n).toBe(0);
});

it.each(['owner','coowner','organizer','admin','member'])('native series management respects %s scope per occurrence',async role=>{
 const f=await nativeSeriesFixture();let actor='owner';if(role!=='owner'){
  actor='member';db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at,assigned_role) VALUES (?,'member',?,'active',?,?,?)").run(f.groupId,role==='admin'?'admin':'member',Date.now(),Date.now(),role==='admin'?null:role);
  db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios' WHERE player_id='member'").run();
 }
 if(role==='organizer')db.sqlite.prepare("UPDATE games SET organizer_id='member' WHERE id=?").run(f.id);
 const allowed=['owner','coowner','organizer'].includes(role);const list=await f.request(f.id,'',actor);expect(list.status).toBe(allowed?200:404);
 if(allowed){expect((await list.json()).games).toHaveLength(role==='organizer'?1:3);const review=await f.preview(f.id,f.draft(f.id,{scope:'future'}),actor);expect(review.plan.affected).toHaveLength(role==='organizer'?1:3);if(role==='organizer')expect(review.plan.skipped.every((r:any)=>r.reason==='No management permission')).toBe(true);}
 else expect((await f.request(f.id,'/preview',actor,f.draft())).status).toBe(404);
});

it.each(['version','role','archive'] as const)('native series apply rejects %s changes after preview without partial scheduling',async change=>{
 const f=await nativeSeriesFixture();const review=await f.preview(f.id,f.draft(f.id,{scope:'future'}));
 if(change==='version')db.sqlite.prepare('UPDATE games SET version=version+1 WHERE id=?').run(f.ids[1]);
 if(change==='role'){
  db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES (?,'member','member','active',?,?)").run(f.groupId,Date.now(),Date.now());
  db.sqlite.prepare("UPDATE tennis_groups SET owner_id='member' WHERE id=?").run(f.groupId);db.sqlite.prepare("UPDATE group_memberships SET assigned_role='member' WHERE group_id=? AND player_id='owner'").run(f.groupId);
 }
 if(change==='archive')db.sqlite.prepare("UPDATE tennis_groups SET status='archived' WHERE id=?").run(f.groupId);
 const before=db.sqlite.prepare('SELECT id,starts_at,ends_at,version,status FROM games ORDER BY id').all();expect((await f.apply(f.id,review)).status).toBe(change==='version'?409:404);
 expect(db.sqlite.prepare('SELECT id,starts_at,ends_at,version,status FROM games ORDER BY id').all()).toEqual(before);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_series_changes').get().n).toBe(0);
});

it('native series confirmation binds CSRF, request ID and actor',async()=>{
 const f=await nativeSeriesFixture();const review=await f.preview();const requestId=crypto.randomUUID();
 const body={...review.body,planHash:review.plan.planHash,requestId};
 const bad=new Request(origin+'/api/games/'+f.id+'/series/apply',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+tokens.owner,'X-CSRF-Token':'wrong','Content-Type':'application/json'},body:JSON.stringify(body)});
 expect((await handleGames(bad,env)).status).toBe(403);expect((await f.apply(f.id,review,requestId)).status).toBe(200);
 db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at,assigned_role) VALUES (?,'member','member','active',?,?,'coowner')").run(f.groupId,Date.now(),Date.now());db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios' WHERE player_id='member'").run();
 expect((await f.apply(f.id,review,requestId,'member')).status).toBe(409);
 expect((await f.request(f.id,'/apply','owner',{...body,planHash:'wrong'})).status).toBe(409);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_series_changes').get().n).toBe(1);
});

it('native future schedule preview rejects a daylight-saving gap in a later occurrence',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2027-02-14T12:00:00Z'));
 try{
  db.sqlite.prepare('UPDATE auth_sessions SET expires_at=?').run(Date.now()+86400000);
  const f=await nativeCreateFixture('private');f.payload.repeatWeeks=3;f.payload.startLocal='2027-03-07T10:00';f.payload.timeZone='America/New_York';
  const response=await f.submit();expect(response.status).toBe(201);const id=(await response.json()).game.id;const before=db.sqlite.prepare('SELECT starts_at,version FROM games ORDER BY id').all();
  const review=await nativeGameCall(id,'series/preview','owner',{scope:'future',operation:'reschedule',preserveExceptions:true,startLocal:'2027-03-07T02:30'});expect(review.status).toBe(400);
  expect(db.sqlite.prepare('SELECT starts_at,version FROM games ORDER BY id').all()).toEqual(before);
 }finally{vi.useRealTimers();}
});

it.each(['public','unlisted'])('native standalone %s games use the same authorized schedule contract',async visibility=>{
 const f=await nativeSeriesFixture();db.sqlite.prepare('UPDATE games SET visibility=?,group_id=NULL WHERE series_id=?').run(visibility,f.id);
 expect((await f.request()).status).toBe(200);const review=await f.preview(f.id,f.draft(f.id,{scope:'future'}));expect(review.plan.affected).toHaveLength(3);expect((await f.apply(f.id,review)).status).toBe(200);
 expect((await f.request(f.id,'','outsider')).status).toBe(404);
});

it.each(['private','discovery','group','blocked-viewer','blocked-subject','removed','anonymous'])('native shared avatar access: %s',async mode=>{
 const id=await create();await member(id,'member');db.sqlite.exec(readFileSync('functions/db/migrations/0032_group_discussions.sql','utf8'));
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();const {mediaEnv}=nativeCoverEnvironment();
 const req=(who:string,method='GET',suffix='',body?:string)=>new Request(origin+'/api/media/player/owner'+suffix,{method,headers:{Origin:origin,Authorization:'Bearer '+tokens[who],'X-CSRF-Token':'csrf','Content-Type':'image/png'},...(body===undefined?{}:{body})});
 expect((await handleMedia(req('owner','PUT','','native-image'),mediaEnv)).status).toBe(200);
 expect(await(await handleMedia(req('owner','GET','/visibility'),mediaEnv)).json()).toEqual({shared:false,hasPhoto:true});
 db.sqlite.prepare('INSERT INTO player_photo_preferences(player_id,shared,updated_at) VALUES (?,?,?) ON CONFLICT(player_id) DO UPDATE SET shared=excluded.shared').run('owner',mode==='private'?0:1,Date.now());
 db.sqlite.prepare("UPDATE players SET discoverable=? WHERE id='owner'").run(mode==='discovery'?1:0);
 if(mode==='discovery'||mode==='removed')db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='member'").run();
 if(mode.startsWith('blocked'))db.sqlite.prepare('INSERT INTO player_blocks VALUES (?,?,?)').run(mode==='blocked-viewer'?'member':'owner',mode==='blocked-viewer'?'owner':'member',Date.now());
 const read=await handleMedia(mode==='anonymous'?new Request(origin+'/api/media/player/owner'):req('member'),mediaEnv);
 expect(read.status).toBe(['discovery','group'].includes(mode)?200:404);
 if(read.status===200){expect(read.headers.get('Cache-Control')).toBe('private, no-store');expect(read.headers.get('Content-Type')).toBe('image/webp');expect(read.headers.get('Location')).toBeNull();}
 expect((await handleMedia(req('owner'),mediaEnv)).status).toBe(200);
 expect((await handleMedia(req('member','DELETE'),mediaEnv)).status).toBe(404);
 expect((await handleMedia(req('owner','PUT','','native-image'),mediaEnv)).status).toBe(200);
 expect((await handleMedia(req('owner','DELETE'),mediaEnv)).status).toBe(200);
 expect(await(await handleMedia(req('owner','GET','/visibility'),mediaEnv)).json()).toEqual({shared:false,hasPhoto:false});
});
it('native game-context avatar requires live shared chat access for both players',async()=>{
 const {id}=await waitGame();db.sqlite.exec(readFileSync('functions/db/migrations/0032_group_discussions.sql','utf8'));
 db.sqlite.prepare("UPDATE games SET visibility='public',group_id=NULL WHERE id=?").run(id);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='member'").run();
 db.sqlite.prepare("UPDATE players SET discoverable=0 WHERE id='owner'").run();
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();const {mediaEnv}=nativeCoverEnvironment();
 const request=(query='',method='GET',body?:string)=>new Request(origin+'/api/media/player/owner'+query,{method,headers:{Origin:origin,Authorization:'Bearer '+tokens[method==='PUT'?'owner':'member'],'X-CSRF-Token':'csrf','Content-Type':'image/png'},...(body===undefined?{}:{body})});
 expect((await handleMedia(request('','PUT','native-image'),mediaEnv)).status).toBe(200);
 db.sqlite.prepare("INSERT INTO player_photo_preferences VALUES ('owner',1,?)").run(Date.now());
 db.sqlite.prepare('INSERT INTO game_chat_rooms(game_id,expires_at) VALUES (?,?) ON CONFLICT(game_id) DO UPDATE SET expires_at=excluded.expires_at').run(id,Date.now()+86400000);
 expect((await handleMedia(request(),mediaEnv)).status).toBe(404);
 expect((await handleMedia(request('?gameId='+id),mediaEnv)).status).toBe(200);
 db.sqlite.prepare('DELETE FROM game_participants WHERE game_id=? AND player_id=?').run(id,'member');
 expect((await handleMedia(request('?gameId='+id),mediaEnv)).status).toBe(404);
 expect((await handleMedia(request('?gameId=invalid'),mediaEnv)).status).toBe(404);
});

it('native photo visibility requires a saved asset and rejects CSRF and another account',async()=>{
 db.sqlite.exec(readFileSync('functions/db/migrations/0032_group_discussions.sql','utf8'));db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const {mediaEnv}=nativeCoverEnvironment();
 const share=(who='owner',csrf='csrf')=>new Request(origin+'/api/media/player/owner/visibility',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+tokens[who],'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:JSON.stringify({shared:true})});
 expect((await handleMedia(share(),mediaEnv)).status).toBe(409);
 expect((await handleMedia(share('owner','wrong'),mediaEnv)).status).toBe(403);
 expect((await handleMedia(share('member'),mediaEnv)).status).toBe(404);
 const put=new Request(origin+'/api/media/player/owner',{method:'PUT',headers:{Origin:origin,Authorization:'Bearer '+tokens.owner,'X-CSRF-Token':'csrf','Content-Type':'image/png'},body:'native-image'});
 expect((await handleMedia(put,mediaEnv)).status).toBe(200);
 expect((await handleMedia(share(),mediaEnv)).status).toBe(200);
 expect(db.sqlite.prepare("SELECT shared FROM player_photo_preferences WHERE player_id='owner'").get().shared).toBe(1);
});
it('native photo upload revalidates its session after processing and cleans an uncommitted object',async()=>{
 db.sqlite.exec(readFileSync('functions/db/migrations/0032_group_discussions.sql','utf8'));db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const {mediaEnv,objects}=nativeCoverEnvironment(()=>{db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=? WHERE player_id='owner'").run(Date.now());});
 const request=new Request(origin+'/api/media/player/owner',{method:'PUT',headers:{Origin:origin,Authorization:'Bearer '+tokens.owner,'X-CSRF-Token':'csrf','Content-Type':'image/png'},body:'native-image'});
 expect((await handleMedia(request,mediaEnv)).status).toBe(409);
 expect(objects.size).toBe(0);expect(db.sqlite.prepare("SELECT * FROM media_assets WHERE subject_id='owner'").get()).toBeUndefined();
});

it('native chat reader returns chronological pages and current audience without marking messages read',async()=>{
 const {id}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 for(let i=0;i<52;i++)db.sqlite.prepare('INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(),id,'member','message '+i,crypto.randomUUID(),Date.now()+i);
 const response=await nativeGameCall(id,'chat','owner');expect(response.status).toBe(200);const page=await response.json();
 expect(page.available).toBe(true);expect(page.viewerId).toBe('owner');expect(page.roomId).toBe(id);expect(page.series).toBe(false);expect(page.messages).toHaveLength(50);expect(page.hasOlder).toBe(true);expect(page.messages[0].body).toBe('message 2');expect(page.messages[49].body).toBe('message 51');
 expect(page.audience.map((p:any)=>p.id).sort()).toEqual(['member','owner']);expect(page.unread).toBe(52);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_chat_reads').get().n).toBe(0);
});
it('native chat reader clears denied group access and filters blocked and moderated bodies',async()=>{
 const {id}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const message=crypto.randomUUID();db.sqlite.prepare('INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at,hidden_at) VALUES (?,?,?,?,?,?,?)').run(message,id,'member','HIDDEN-SENTINEL',crypto.randomUUID(),Date.now(),Date.now());
 let page=await(await nativeGameCall(id,'chat','owner')).json();expect(page.messages.find((m:any)=>m.id===message).body).toBe('');expect(page.messages.find((m:any)=>m.id===message).hiddenAt).toBeTypeOf('number');
 db.sqlite.prepare('INSERT INTO player_blocks VALUES (?,?,?)').run('owner','member',Date.now());
 page=await(await nativeGameCall(id,'chat','owner')).json();expect(page.messages.some((m:any)=>m.authorId==='member')).toBe(false);
 expect((await nativeGameCall(id,'chat','member')).status).toBe(404);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='owner'").run();
 expect((await nativeGameCall(id,'chat','owner')).status).toBe(404);
});
it('native public chat outsiders receive only an unavailable notice',async()=>{
 const {id}=await waitGame();db.sqlite.prepare("UPDATE games SET visibility='public',group_id=NULL WHERE id=?").run(id);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const page=await(await nativeGameCall(id,'chat','outsider')).json();expect(page.available).toBe(false);expect(page.messages).toBeUndefined();expect(page.audience).toBeUndefined();expect(page.viewerId).toBeUndefined();
});
it('native group-series dates open the same authorized conversation',async()=>{
 const f=await nativeSeriesFixture();const pages=[];
 for(const id of f.ids){const response=await nativeGameCall(id,'chat','owner');expect(response.status).toBe(200);pages.push(await response.json());}
 expect(pages.every(p=>p.available&&p.series&&p.viewerId==='owner')).toBe(true);
 expect(new Set(pages.map(p=>p.roomId))).toEqual(new Set(['series:'+f.id]));
 expect(pages.map(p=>p.messages.map((m:any)=>m.id))).toEqual([pages[0].messages.map((m:any)=>m.id),pages[0].messages.map((m:any)=>m.id),pages[0].messages.map((m:any)=>m.id)]);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='owner' AND group_id=?").run(f.groupId);
 expect((await nativeGameCall(f.ids[0],'chat','owner')).status).toBe(404);
});
it('native chat history cursors reconstruct retained pages without duplicates and revalidate final access',async()=>{
 const {id}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 for(let i=0;i<105;i++)db.sqlite.prepare('INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(),id,'member','history '+i,crypto.randomUUID(),Date.now()+i);
 const latest=await(await nativeGameCall(id,'chat','owner')).json();let rows=latest.messages,more=latest.hasOlder;
 while(more){const cursor=rows[0].seq;const response=await nativeGameCall(id,'chat?before='+cursor,'owner');expect(response.status).toBe(200);const earlier=await response.json();expect(earlier.viewerId).toBe(latest.viewerId);expect(earlier.roomId).toBe(latest.roomId);expect(earlier.messages.every((m:any)=>m.seq<cursor)).toBe(true);rows=[...earlier.messages,...rows];more=earlier.hasOlder;}
 expect(new Set(rows.map((m:any)=>m.id)).size).toBe(rows.length);expect(rows.filter((m:any)=>m.body.startsWith('history '))).toHaveLength(105);
 const state=await(await nativeGameCall(id,'chat?state=1','owner')).json();expect(state.viewerId).toBe('owner');expect(state.roomId).toBe(id);expect(state.messages).toEqual([]);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='owner'").run();expect((await nativeGameCall(id,'chat?state=1','owner')).status).toBe(404);
});
it('native earlier chat pages redact fresh moderation and block decisions instead of returning cached bodies',async()=>{
 const {id}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();let target='';
 for(let i=0;i<60;i++){const key=crypto.randomUUID();if(i===0)target=key;db.sqlite.prepare('INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at) VALUES (?,?,?,?,?,?)').run(key,id,'member','PRIVATE-HISTORY-'+i,crypto.randomUUID(),Date.now()+i);}
 const latest=await(await nativeGameCall(id,'chat','owner')).json();const cursor=latest.messages[0].seq;
 db.sqlite.prepare('UPDATE game_chat_messages SET hidden_at=? WHERE id=?').run(Date.now(),target);
 const earlier=await(await nativeGameCall(id,'chat?before='+cursor,'owner')).json();expect(earlier.messages.find((m:any)=>m.id===target).body).toBe('');
 db.sqlite.prepare('INSERT INTO player_blocks VALUES (?,?,?)').run('owner','member',Date.now());
 const blocked=await(await nativeGameCall(id,'chat?before='+cursor,'owner')).json();expect(JSON.stringify(blocked.messages)).not.toContain('PRIVATE-HISTORY');
});
it('native chat send retries preserve one message and reject changed request reuse',async()=>{
 const {id}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();const body={body:'Native retry message',clientId:crypto.randomUUID()};
 const first=await nativeGameCall(id,'chat','owner',body);expect(first.status).toBe(201);const saved=await first.json();
 const retry=await nativeGameCall(id,'chat','owner',body);expect(retry.status).toBe(200);expect(await retry.json()).toEqual(saved);
 expect((await nativeGameCall(id,'chat','owner',{...body,body:'Changed retry'})).status).toBe(409);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE game_id=? AND client_id=?").get(id,body.clientId).n).toBe(1);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='owner'").run();expect((await nativeGameCall(id,'chat','owner',body)).status).toBe(404);
});
it('native chat send enforces UTF16 limits and rate limits without duplicate writes',async()=>{
 const {id}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 for(const text of [' ',String.fromCharCode(1), '😀'.repeat(1001)])expect((await nativeGameCall(id,'chat','owner',{body:text,clientId:crypto.randomUUID()})).status).toBe(400);
 expect((await nativeGameCall(id,'chat','owner',{body:'😀'.repeat(1000),clientId:crypto.randomUUID()})).status).toBe(201);
 for(let i=0;i<9;i++)expect((await nativeGameCall(id,'chat','owner',{body:'Rate '+i,clientId:crypto.randomUUID()})).status).toBe(201);
 expect((await nativeGameCall(id,'chat','owner',{body:'Too many',clientId:crypto.randomUUID()})).status).toBe(429);
});


it('native chat read cursor is monotonic and mute preserves unread messages',async()=>{
 const {id}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 for(let i=0;i<3;i++)expect((await nativeGameCall(id,'chat','member',{body:'Unread '+i,clientId:crypto.randomUUID()})).status).toBe(201);
 const before=await(await nativeGameCall(id,'chat','owner')).json();expect(before.unread).toBe(3);const seq=before.messages.at(-1).seq;
 expect((await nativeGameCall(id,'chat/mute','owner',{muted:true})).status).toBe(200);
 expect(await(await nativeGameCall(id,'chat','owner')).json()).toMatchObject({muted:true,unread:3});
 expect((await nativeGameCall(id,'chat/read','owner',{throughSeq:seq})).status).toBe(200);
 expect((await nativeGameCall(id,'chat/read','owner',{throughSeq:0})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT last_seq,muted FROM game_chat_reads WHERE game_id=? AND player_id='owner'").get(id)).toMatchObject({last_seq:seq,muted:1});
 expect(await(await nativeGameCall(id,'chat','owner')).json()).toMatchObject({muted:true,unread:0});
 expect((await nativeGameCall(id,'chat/mute','owner',{muted:false})).status).toBe(200);
 expect(await(await nativeGameCall(id,'chat','owner')).json()).toMatchObject({muted:false,unread:0});
});
it('native chat preferences reject invalid payloads, CSRF and removed membership',async()=>{
 const {id,groupId}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await nativeGameCall(id,'chat/read','owner',{throughSeq:-1})).status).toBe(400);
 expect((await nativeGameCall(id,'chat/read','owner',{throughSeq:1.5})).status).toBe(400);
 expect((await nativeGameCall(id,'chat/mute','owner',{muted:'true'})).status).toBe(400);
 const bad=new Request(origin+'/api/games/'+id+'/chat/mute',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+tokens.owner,'X-CSRF-Token':'wrong','Content-Type':'application/json'},body:JSON.stringify({muted:true})});
 expect((await handleGames(bad,env)).status).toBe(403);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE group_id=? AND player_id='owner'").run(groupId);
 expect((await nativeGameCall(id,'chat/read','owner',{throughSeq:1})).status).toBe(404);
 expect((await nativeGameCall(id,'chat/mute','owner',{muted:true})).status).toBe(404);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_reads WHERE player_id='owner'").get().n).toBe(0);
});
it('native series chat shares read and mute state between occurrence routes',async()=>{
 const f=await nativeSeriesFixture();
 expect((await nativeGameCall(f.ids[0],'chat','owner',{body:'Shared cursor',clientId:crypto.randomUUID()})).status).toBe(201);
 const page=await(await nativeGameCall(f.ids[1],'chat','owner')).json();const seq=page.messages.at(-1).seq;
 expect((await nativeGameCall(f.ids[0],'chat/mute','owner',{muted:true})).status).toBe(200);
 expect((await nativeGameCall(f.ids[1],'chat/read','owner',{throughSeq:seq})).status).toBe(200);
 const other=await(await nativeGameCall(f.ids[2],'chat','owner')).json();expect(other).toMatchObject({roomId:'series:'+f.id,muted:true,unread:0});
 expect(db.sqlite.prepare("SELECT last_seq,muted FROM game_chat_reads WHERE game_id=? AND player_id='owner'").get('series:'+f.id)).toMatchObject({last_seq:seq,muted:1});
});


it('native chat reports retain authorized evidence in read-only chat without removing the message',async()=>{
 const {id}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const sent=await(await nativeGameCall(id,'chat','member',{body:'Report target',clientId:crypto.randomUUID()})).json();
 db.sqlite.prepare('UPDATE games SET starts_at=?,ends_at=? WHERE id=?').run(Date.now()-3*86400000,Date.now()-2*86400000,id);
 expect((await(await nativeGameCall(id,'chat','owner')).json()).canSend).toBe(false);
 const body={messageId:sent.id,category:'privacy',details:'Please review this message.'};
 expect((await nativeGameCall(id,'chat/report','owner',body)).status).toBe(201);
 const report=db.sqlite.prepare('SELECT * FROM game_chat_reports WHERE message_id=?').get(sent.id);
 expect(report).toMatchObject({reporter_id:'owner',author_id:'member',category:'privacy',details:body.details,status:'open'});
 expect(JSON.parse(report.context_json).some((m:any)=>m.id===sent.id&&m.body==='Report target')).toBe(true);
 expect(db.sqlite.prepare('SELECT hidden_at FROM game_chat_messages WHERE id=?').get(sent.id).hidden_at).toBeNull();
 expect((await nativeGameCall(id,'chat/report','owner',body)).status).toBe(409);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_chat_reports WHERE message_id=?').get(sent.id).n).toBe(1);
});
it('native chat reports reject own, system, hidden and blocked messages and invalid details',async()=>{
 const {id}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const own=await(await nativeGameCall(id,'chat','owner',{body:'Own message',clientId:crypto.randomUUID()})).json();
 const other=await(await nativeGameCall(id,'chat','member',{body:'Other message',clientId:crypto.randomUUID()})).json();
 const report=(messageId:string,extra={})=>nativeGameCall(id,'chat/report','owner',{messageId,category:'other',details:'Review this content.',...extra});
 expect((await report(own.id)).status).toBe(404);
 const page=await(await nativeGameCall(id,'chat','owner')).json();const notice=page.messages.find((m:any)=>m.kind!=='message');expect(notice).toBeDefined();
 expect((await report(notice.id)).status).toBe(404);
 for(const details of [' ',String.fromCharCode(1),'😀'.repeat(501)])expect((await report(other.id,{details})).status).toBe(400);
 expect((await report(other.id,{category:'invalid'})).status).toBe(400);
 db.sqlite.prepare('UPDATE game_chat_messages SET hidden_at=? WHERE id=?').run(Date.now(),other.id);expect((await report(other.id)).status).toBe(404);
 db.sqlite.prepare('UPDATE game_chat_messages SET hidden_at=NULL WHERE id=?').run(other.id);
 db.sqlite.prepare("INSERT INTO player_blocks(blocker_id,blocked_id,created_at) VALUES ('owner','member',?)").run(Date.now());expect((await report(other.id)).status).toBe(404);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_chat_reports').get().n).toBe(0);
});
it('native chat reports enforce CSRF, five-per-hour limit and membership revocation',async()=>{
 const {id,groupId}=await waitGame();db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();const ids=[];
 for(let i=0;i<6;i++)ids.push((await(await nativeGameCall(id,'chat','member',{body:'Target '+i,clientId:crypto.randomUUID()})).json()).id);
 const body=(messageId:string)=>({messageId,category:'spam',details:'Repeated unsolicited content.'});
 const bad=new Request(origin+'/api/games/'+id+'/chat/report',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+tokens.owner,'X-CSRF-Token':'wrong','Content-Type':'application/json'},body:JSON.stringify(body(ids[0]))});
 expect((await handleGames(bad,env)).status).toBe(403);
 for(const messageId of ids.slice(0,5))expect((await nativeGameCall(id,'chat/report','owner',body(messageId))).status).toBe(201);
 expect((await nativeGameCall(id,'chat/report','owner',body(ids[5]))).status).toBe(409);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_chat_reports').get().n).toBe(5);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE group_id=? AND player_id='owner'").run(groupId);
 expect((await nativeGameCall(id,'chat/report','owner',body(ids[5]))).status).toBe(404);
});
it('native series message reports share the canonical room across occurrence routes',async()=>{
 const f=await nativeSeriesFixture();const first=await(await nativeGameCall(f.ids[0],'chat','owner')).json();
 const messageId=crypto.randomUUID();db.sqlite.prepare('INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at) VALUES (?,?,?,?,?,?)').run(messageId,first.roomId,'member','Series report target',crypto.randomUUID(),Date.now());
 const body={messageId,category:'unsafe',details:'Please review this series message.'};
 expect((await nativeGameCall(f.ids[1],'chat/report','owner',body)).status).toBe(201);
 expect((await nativeGameCall(f.ids[2],'chat/report','owner',body)).status).toBe(409);
 expect(db.sqlite.prepare('SELECT game_id FROM game_chat_reports WHERE message_id=?').get(messageId).game_id).toBe('series:'+f.id);
});
