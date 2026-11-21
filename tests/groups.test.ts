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
 constructor(){this.sqlite.exec('PRAGMA foreign_keys=ON');for(const f of ['0001_create_tennis_courts.sql','0002_player_auth.sql','0003_public_games.sql','0004_game_participation.sql','0005_game_cancellations.sql','0006_host_notifications.sql','0007_request_notifications.sql','0008_player_notifications.sql','0009_tennis_groups.sql','0010_group_notifications.sql','0011_group_roles.sql','0012_media_assets.sql','0013_group_invitations.sql','0014_group_games.sql','0015_group_game_lifecycle.sql','0016_game_guests.sql','0017_sharing_safety.sql','0018_player_game_invitations.sql','0019_multi_court_events.sql','0020_weekly_game_series.sql','0021_group_game_waitlist.sql','0022_public_group_events.sql','0023_series_management.sql','0024_notification_delivery.sql','0025_notification_action_actor.sql','0026_account_moderation.sql','0027_game_chat.sql','0028_series_chat.sql','0029_series_chat_staff.sql','0030_chat_lifecycle_notices.sql','0031_game_capacity_edit.sql'])this.sqlite.exec(readFileSync('functions/db/migrations/'+f,'utf8'));}
 prepare(sql:string):AuthStatement{let args:unknown[]=[];const s:AuthStatement={bind(...v){args=v;return s;},first:async<T>()=>(this.sqlite.prepare(sql).get(...args)??null) as T|null,all:async<T>()=>({results:this.sqlite.prepare(sql).all(...args) as T[]}),run:async()=>({meta:{changes:Number(this.sqlite.prepare(sql).run(...args).changes)}})};return s;}
 async batch(statements:AuthStatement[]){this.sqlite.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());this.sqlite.exec('COMMIT');return r;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const origin='http://127.0.0.1:8788';let db:DB,env:AuthEnv;const tokens:Record<string,string>={};
beforeEach(async()=>{db=new DB();env={COURTS_DB:db,PLAY_TOGETHER_ENABLED:'true',AUTH_ORIGIN:origin};for(const id of ['owner','admin','member','outsider']){const token='test-session-for-'+id+'-with-more-than-32-characters';tokens[id]=token;db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run(id,'Name '+id,Date.now(),Date.now());db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run(id,id,await hashToken(token),'csrf',Date.now(),Date.now()+86400000);}});
afterEach(()=>db.sqlite.close());
function req(path='',method='GET',body?:unknown,who='owner',extra:Record<string,string>={}){return new Request(origin+'/api/groups'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(who?{Cookie:'oc_session='+tokens[who],'X-CSRF-Token':'csrf'}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});}
const input=()=>({name:'Fairfax Tennis',publicDescription:'Public preview',description:'PRIVATE-CONTENT-SENTINEL',generalLocation:'Fairfax, VA',skillPreference:'advanced',visibility:'private',requestId:crypto.randomUUID()});
async function create(body=input()){const r=await handleGroups(req('','POST',body),env);expect(r.status).toBe(201);return (await r.json()).id as string;}
async function call(path:string,action:string,body={},who='owner'){return handleGroups(req('/'+path+'/'+action,'POST',body,who),env);}
async function member(id:string,who:string){expect((await call(id,'request',{},who)).status).toBe(200);expect((await call(id,'approve',{playerId:who})).status).toBe(200);}
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
it('only primary Owner assigns roles and controls archive',async()=>{const id=await create();await member(id,'admin');await member(id,'member');await call(id,'role',{playerId:'admin',role:'coowner'});expect((await call(id,'role',{playerId:'member',role:'organizer'},'admin')).status).toBe(403);expect((await call(id,'role',{playerId:'member',role:'organizer'})).status).toBe(200);expect((await call(id,'role',{playerId:'member',role:'coowner'},'admin')).status).toBe(403);expect((await call(id,'archive',{},'admin')).status).toBe(403);expect((await call(id,'transfer',{playerId:'member'},'admin')).status).toBe(403);expect((await call(id,'request',{},'outsider')).status).toBe(200);expect((await call(id,'approve',{playerId:'outsider'},'member')).status).toBe(403);expect((await call(id,'role',{playerId:'admin',role:'member'},'admin')).status).toBe(400);});

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

it('public group events are visible without membership but outsiders require approval',async()=>{
 const {id,groupId}=await waitGame();db.sqlite.prepare("UPDATE tennis_groups SET visibility='public' WHERE id=?").run(groupId);
 db.sqlite.prepare("DELETE FROM group_memberships WHERE group_id=? AND player_id='outsider'").run(groupId);db.sqlite.prepare("UPDATE games SET event_capacity=4 WHERE id=?").run(id);
 const get=async(path:string,who='outsider')=>handleGames(new Request(origin+'/api/games'+path,{headers:who?{Cookie:'oc_session='+tokens[who]}:{}}),env);
 expect((await get('/'+id,'')).status).toBe(200);expect((await(await get('','')).json()).games.some((g:any)=>g.id===id)).toBe(true);
 expect((await(await get('/feed','')).json()).games.some((g:any)=>g.id===id)).toBe(true);expect((await(await get('/feed')).json()).games.some((g:any)=>g.id===id)).toBe(true);
 expect((await(await get('/feed?filter=groups')).json()).games.some((g:any)=>g.id===id)).toBe(false);
 const state=await(await get('/'+id+'/participation')).json();expect(state).toMatchObject({joinPolicy:'approval',isGroupMember:false});
 expect((await waitCall(id,'join','outsider')).status).toBe(200);expect(db.sqlite.prepare('SELECT status FROM game_join_requests WHERE game_id=? AND player_id=?').get(id,'outsider').status).toBe('pending');
 expect(db.sqlite.prepare('SELECT 1 FROM game_participants WHERE game_id=? AND player_id=?').get(id,'outsider')).toBeUndefined();
 expect((await waitCall(id,'approve','owner',{playerId:'outsider'})).status).toBe(200);expect((await waitCall(id,'join','admin')).status).toBe(200);
 expect((await get('/'+id+'/participants')).status).toBe(403);expect((await handleGroups(req('/'+groupId+'/members','GET',undefined,'outsider'),env)).status).toBe(403);
 expect((await waitCall(id,'join-waitlist','outsider')).status).toBe(403);
 expect((await waitCall(id,'leave','outsider')).status).toBe(200);
});
it('switching a group to private immediately hides events from nonmembers everywhere',async()=>{
 const {id,groupId}=await waitGame();db.sqlite.prepare("UPDATE tennis_groups SET visibility='public' WHERE id=?").run(groupId);db.sqlite.prepare("DELETE FROM group_memberships WHERE group_id=? AND player_id='outsider'").run(groupId);
 expect((await waitCall(id,'join','outsider')).status).toBe(200);
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
