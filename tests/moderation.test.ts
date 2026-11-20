import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readdirSync,readFileSync} from 'node:fs';
import {handleAuth,hashToken,type AuthDatabase,type AuthStatement,type AuthEnv} from '../functions/lib/auth';
import {handlePlayers} from '../functions/lib/players';
import {handleGames} from '../functions/lib/games';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite');
class DB implements AuthDatabase{
 sqlite=new DatabaseSync(':memory:');
 constructor(){this.sqlite.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('functions/db/migrations').filter(f=>f.endsWith('.sql')).sort())this.sqlite.exec(readFileSync('functions/db/migrations/'+f,'utf8'));}
 prepare(sql:string):AuthStatement{let args:unknown[]=[];const s:AuthStatement={bind(...v){args=v;return s;},first:async<T>()=>(this.sqlite.prepare(sql).get(...args)??null) as T|null,all:async<T>()=>({results:this.sqlite.prepare(sql).all(...args) as T[]}),run:async()=>({meta:{changes:Number(this.sqlite.prepare(sql).run(...args).changes)}})};return s;}
 async batch(statements:AuthStatement[]){this.sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());this.sqlite.exec('COMMIT');return results;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const origin='http://127.0.0.1:8788';let db:DB,env:AuthEnv&{MODERATOR_PLAYER_IDS?:string};const tokens:Record<string,string>={};
beforeEach(async()=>{db=new DB();env={COURTS_DB:db,AUTH_ORIGIN:origin,PLAY_TOGETHER_ENABLED:'true'};for(const id of ['host','other','target','hidden']){const token='synthetic-session-token-for-'+id+'-with-enough-entropy';tokens[id]=token;db.sqlite.prepare('INSERT INTO players(id,display_name,discoverable,created_at,updated_at) VALUES (?,?,?, ?,?)').run(id,'QA '+id,id==='hidden'?0:1,Date.now(),Date.now());db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run(id,id,await hashToken(token),'csrf',Date.now(),Date.now()+30*86400000);}});
afterEach(()=>{db.sqlite.close();vi.restoreAllMocks();});
function request(path:string,who='host',method='GET',body?:unknown,csrf='csrf'){
 return new Request(origin+'/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(who?{Cookie:'oc_session='+tokens[who],'X-CSRF-Token':csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
}

function game(visibility='public',owner='host',offset=86400000){const id=crypto.randomUUID(),now=Date.now();if(visibility==='group'){db.sqlite.prepare("INSERT OR IGNORE INTO tennis_groups(id,owner_id,visibility,name,general_location,request_id,created_at,updated_at) VALUES ('private-group',?,'private','Private QA','Fairfax','qa',?,?)").run(owner,now,now);db.sqlite.prepare("INSERT OR IGNORE INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES ('private-group',?,'member','active',?,?)").run(owner,now,now);}db.sqlite.prepare(`INSERT INTO games(id,organizer_id,visibility,group_id,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,request_id,request_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,owner,visibility,visibility==='group'?'private-group':null,'QA '+visibility,'court','Court',38,-77,'public',now+offset,now+offset+3600000,'UTC','doubles',4,id,'hash',now,now);db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,owner,now);return id;}
const staff=()=>{env.MODERATOR_PLAYER_IDS='host,other';};
const mod=(action:string,body:unknown,who='host',csrf='csrf')=>handlePlayers(request('players/moderation/'+action,who,'POST',body,csrf),env);
it('allows only active site moderators, requires CSRF and protects staff accounts',async()=>{
 staff();for(const path of ['accounts','history'])expect((await handlePlayers(request('players/moderation/'+path,'target'),env)).status).toBe(403);
 expect((await mod('suspend',{playerId:'hidden',reason:'Test'},'target')).status).toBe(403);expect((await mod('suspend',{playerId:'target',reason:'Test'},'host','wrong')).status).toBe(403);
 expect((await mod('suspend',{playerId:'host',reason:'Test'})).status).toBe(400);expect((await mod('suspend',{playerId:'other',reason:'Test'})).status).toBe(403);
 for(const reason of ['', '   ', 'x'.repeat(501)])expect((await mod('suspend',{playerId:'target',reason})).status).toBe(400);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM account_moderation_actions').get().n).toBe(0);
});
it('suspends atomically, revokes every session/device and preserves activity records',async()=>{
 staff();const gameId=game('public','target');const now=Date.now();db.sqlite.prepare("INSERT INTO auth_identities(id,player_id,provider,issuer,subject,created_at) VALUES ('identity','target','google','https://accounts.google.com','target-subject',?)").run(now);db.sqlite.prepare("INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at,revoked_at) VALUES ('second','target',?,'csrf',?,?,NULL)").run(await hashToken('second-valid-session-token'),now,now+86400000);
 db.sqlite.prepare("INSERT INTO notification_devices(id,player_id,session_id,transport,endpoint,endpoint_hash,p256dh,auth,key_id,created_at,updated_at) VALUES ('device','target','target','webpush','https://fcm.googleapis.com/fcm/send/test','hash','key','auth','key',?,?)").run(now,now);
 expect((await mod('suspend',{playerId:'target',reason:'Repeated harassment\nReviewed report.'})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT status FROM players WHERE id='target'").get().status).toBe('disabled');expect(db.sqlite.prepare("SELECT COUNT(*) n FROM auth_sessions WHERE player_id='target' AND revoked_at IS NULL").get().n).toBe(0);expect(db.sqlite.prepare("SELECT revoked_at FROM notification_devices WHERE id='device'").get().revoked_at).toBeTruthy();
 expect((await handlePlayers(request('players','target'),env)).status).toBe(401);expect((await(await handleAuth(request('auth/me','target'),env)).json()).player).toBeNull();
 expect(db.sqlite.prepare('SELECT player_id,moderator_id,action,reason FROM account_moderation_actions').get()).toMatchObject({player_id:'target',moderator_id:'host',action:'suspend',reason:'Repeated harassment\nReviewed report.'});
 expect((await mod('suspend',{playerId:'target',reason:'Duplicate stale action'})).status).toBe(409);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM account_moderation_actions').get().n).toBe(1);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM auth_identities WHERE player_id='target'").get().n).toBe(1);expect(db.sqlite.prepare('SELECT status FROM games WHERE id=?').get(gameId).status).toBe('scheduled');expect(db.sqlite.prepare('SELECT player_id FROM game_participants WHERE game_id=?').get(gameId).player_id).toBe('target');expect(db.sqlite.prepare("SELECT id FROM players WHERE id='target'").get()).toBeTruthy();
});
it('restores access without reviving old sessions and keeps an append-only decision history',async()=>{
 staff();await mod('suspend',{playerId:'target',reason:'Investigating complaint'});expect((await mod('restore',{playerId:'target',reason:'Review found a mistake'})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT status FROM players WHERE id='target'").get().status).toBe('active');expect((await handlePlayers(request('players','target'),env)).status).toBe(401);
 const history=await(await handlePlayers(request('players/moderation/history'),env)).json();expect(history.actions).toHaveLength(2);expect(history.actions.every((a:any)=>a.moderatorName==='QA host'&&a.createdAt>0)).toBe(true);
 expect((await mod('restore',{playerId:'target',reason:'Stale restore'})).status).toBe(409);
});
it('requires an explanation for player, group and game reports and retains multiline reasons',async()=>{
 for(const details of [undefined,'','   ','x'.repeat(1001)])expect((await handlePlayers(request('players/report','host','POST',{subjectType:'player',subjectId:'target',category:'harassment',details}),env)).status).toBe(400);
 expect((await handlePlayers(request('players/report','host','POST',{subjectType:'player',subjectId:'target',category:'harassment',details:'Threatening behavior\nAt a public game.'}),env)).status).toBe(201);
 staff();const reports=await(await handlePlayers(request('players/reports'),env)).json();expect(reports.reports[0]).toMatchObject({subjectName:'QA target',playerStatus:'active',details:'Threatening behavior\nAt a public game.'});
});
it('does not allow a revoked moderator session to create a decision',async()=>{
 staff();db.sqlite.exec("UPDATE auth_sessions SET revoked_at=1 WHERE player_id='host'");expect((await mod('suspend',{playerId:'target',reason:'Not allowed'})).status).toBe(401);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM account_moderation_actions').get().n).toBe(0);
});

it('rechecks the moderator session inside the atomic decision batch',async()=>{
 staff();const batch=db.batch.bind(db);vi.spyOn(db,'batch').mockImplementationOnce(async ops=>{db.sqlite.exec("UPDATE auth_sessions SET revoked_at=1 WHERE player_id='host'");return batch(ops);});
 expect((await mod('suspend',{playerId:'target',reason:'Stale permission'})).status).toBe(409);expect(db.sqlite.prepare("SELECT status FROM players WHERE id='target'").get().status).toBe('active');expect(db.sqlite.prepare('SELECT COUNT(*) n FROM account_moderation_actions').get().n).toBe(0);
});

it('does not expose private game titles to report moderators without activity access',async()=>{
 const id=game('group','target');db.sqlite.prepare("UPDATE games SET title='Private confidential match' WHERE id=?").run(id);
 expect((await handlePlayers(request('players/report','target','POST',{subjectType:'game',subjectId:id,category:'unsafe',details:'Please review this event.'}),env)).status).toBe(201);
 staff();const r=await handlePlayers(request('players/reports'),env);expect(r.status).toBe(200);expect(await r.text()).not.toContain('Private confidential match');
});

it('allows reporting a shared-game player without making unrelated hidden accounts reportable',async()=>{
 const report=(id:string)=>handlePlayers(request('players/report','host','POST',{subjectType:'player',subjectId:id,category:'unsafe',details:'Behavior during our shared game.'}),env);
 expect((await report('hidden')).status).toBe(404);const id=game('public','hidden');db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,'host',Date.now());expect((await report('hidden')).status).toBe(201);
});
