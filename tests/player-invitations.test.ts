import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readdirSync,readFileSync} from 'node:fs';
import {hashToken,type AuthDatabase,type AuthStatement,type AuthEnv} from '../functions/lib/auth';
import {handlePlayers} from '../functions/lib/players';
import {handleGames} from '../functions/lib/games';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite');
class DB implements AuthDatabase{
 sqlite=new DatabaseSync(':memory:');
 constructor(){this.sqlite.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('functions/db/migrations').filter(f=>f.endsWith('.sql')).sort())this.sqlite.exec(readFileSync('functions/db/migrations/'+f,'utf8'));}
 prepare(sql:string):AuthStatement{let args:unknown[]=[];const s:AuthStatement={bind(...v){args=v;return s;},first:async<T>()=>(this.sqlite.prepare(sql).get(...args)??null) as T|null,all:async<T>()=>({results:this.sqlite.prepare(sql).all(...args) as T[]}),run:async()=>({meta:{changes:Number(this.sqlite.prepare(sql).run(...args).changes)}})};return s;}
 async batch(statements:AuthStatement[]){this.sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());this.sqlite.exec('COMMIT');return results;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const origin='http://127.0.0.1:8788';let db:DB,env:AuthEnv;const tokens:Record<string,string>={};
beforeEach(async()=>{db=new DB();env={COURTS_DB:db,AUTH_ORIGIN:origin,PLAY_TOGETHER_ENABLED:'true'};for(const id of ['host','other','target','hidden']){const token='synthetic-session-token-for-'+id+'-with-enough-entropy';tokens[id]=token;db.sqlite.prepare('INSERT INTO players(id,display_name,discoverable,created_at,updated_at) VALUES (?,?,?, ?,?)').run(id,'QA '+id,id==='hidden'?0:1,Date.now(),Date.now());db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run(id,id,await hashToken(token),'csrf',Date.now(),Date.now()+30*86400000);}});
afterEach(()=>{db.sqlite.close();vi.restoreAllMocks();});
function request(path:string,who='host',method='GET',body?:unknown,csrf='csrf'){
 return new Request(origin+'/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(who?{Cookie:'oc_session='+tokens[who],'X-CSRF-Token':csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
function game(visibility='public',owner='host',offset=86400000){const id=crypto.randomUUID(),now=Date.now();if(visibility==='group'){db.sqlite.prepare("INSERT OR IGNORE INTO tennis_groups(id,owner_id,visibility,name,general_location,request_id,created_at,updated_at) VALUES ('private-group',?,'private','Private QA','Fairfax','qa',?,?)").run(owner,now,now);db.sqlite.prepare("INSERT OR IGNORE INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES ('private-group',?,'member','active',?,?)").run(owner,now,now);}db.sqlite.prepare(`INSERT INTO games(id,organizer_id,visibility,group_id,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,request_id,request_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,owner,visibility,visibility==='group'?'private-group':null,'QA '+visibility,'court','Court',38,-77,'public',now+offset,now+offset+3600000,'UTC','doubles',4,id,'hash',now,now);db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,owner,now);return id;}
const send=(id:string,target='target',who='host',csrf='csrf')=>handlePlayers(request('players/invite-game',who,'POST',{gameId:id,playerId:target},csrf),env);
const inbox=async(who='target')=>(await(await handleGames(request('games/notifications',who),env)).json()).notifications;

it('excludes the signed-in account from discovery and explains rejected self-invitations',async()=>{
 const id=game();const search=await handlePlayers(request('players?q=QA'),env);const data=await search.json();expect(data.viewerId).toBe('host');expect(data.players.some((p:{id:string})=>p.id==='host')).toBe(false);
 const choices=await handlePlayers(request('players/invitable-games?playerId=host'),env);expect((await choices.json()).games).toEqual([]);
 const rejected=await send(id,'host');expect(rejected.status).toBe(400);expect((await rejected.json()).error).toContain('cannot invite yourself');expect(db.sqlite.prepare('SELECT COUNT(*) n FROM player_game_invitations').get().n).toBe(0);
});
it('offers only the current host\'s eligible upcoming public games without private metadata',async()=>{
 const id=game();game('group');game('unlisted');game('public','other');game('public','host',-86400000);
 const r=await handlePlayers(request('players/invitable-games?playerId=target'),env);expect(r.status).toBe(200);const data=await r.json();expect(data.games).toHaveLength(1);expect(data.games[0].id).toBe(id);expect(JSON.stringify(data)).not.toContain('private-group');expect(data.games[0]).not.toHaveProperty('court_lat');
});
it('sends one private inbox invitation, deduplicates, and does not reserve a place',async()=>{
 const id=game();expect((await send(id)).status).toBe(200);expect((await send(id)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM player_game_invitations').get().n).toBe(1);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants').get().n).toBe(1);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_join_requests').get().n).toBe(0);
 const notes=await inbox();expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject({gameId:id,kind:'game_invited',invitationStatus:'available',displayName:'QA host'});expect(notes[0]).not.toHaveProperty('recipient_id');expect(await inbox('other')).toHaveLength(0);
});
it('acceptance uses the existing request and approval path and capacity accounting',async()=>{
 const id=game();await send(id);
 expect((await handleGames(request('games/'+id+'/join','target','POST',{}),env)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants').get().n).toBe(1);expect((await inbox())[0].invitationStatus).toBe('requested');
 expect((await inbox('host')).some((n:{kind:string})=>n.kind==='requested')).toBe(true);
 expect((await handleGames(request('games/'+id+'/approve','host','POST',{playerId:'target'}),env)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants').get().n).toBe(2);expect((await inbox()).find((n:{kind:string})=>n.kind==='game_invited').invitationStatus).toBe('joined');
});
it('rejects self invitations, other hosts and group games server-side',async()=>{
 for(const id of [game('group'),game('public','other')])expect((await send(id)).status).toBe(404);
 expect((await send(game(),'host')).status).toBe(400);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM player_game_invitations').get().n).toBe(0);
});
it('rejects opt-out, inactive players, both block directions and changes after listing',async()=>{
 const id=game();expect((await send(id,'hidden')).status).toBe(404);
 for(const [a,b] of [['host','target'],['target','host']]){db.sqlite.prepare('INSERT INTO player_blocks VALUES (?,?,?)').run(a,b,Date.now());expect((await send(id)).status).toBe(404);db.sqlite.prepare('DELETE FROM player_blocks').run();}
 db.sqlite.prepare("UPDATE players SET discoverable=0 WHERE id='target'").run();expect((await send(id)).status).toBe(404);
 db.sqlite.prepare("UPDATE players SET discoverable=1,status='disabled' WHERE id='target'").run();expect((await send(id)).status).toBe(404);
});
it('hides invitations after blocking or a visibility/organizer change',async()=>{
 const id=game();await send(id);db.sqlite.prepare('INSERT INTO player_blocks VALUES (?,?,?)').run('target','host',Date.now());expect(await inbox()).toHaveLength(0);db.sqlite.prepare('DELETE FROM player_blocks').run();
 db.sqlite.prepare("UPDATE games SET visibility='unlisted' WHERE id=?").run(id);expect(await inbox()).toHaveLength(0);
 db.sqlite.prepare("UPDATE games SET visibility='public',organizer_id='other' WHERE id=?").run(id);expect(await inbox()).toHaveLength(0);
});
it('rejects closed/full games and existing requests or participants',async()=>{
 const closed=game();db.sqlite.prepare("UPDATE games SET status='cancelled' WHERE id=?").run(closed);expect((await send(closed)).status).toBe(404);expect((await send(game('public','host',-86400000))).status).toBe(404);
 const full=game();db.sqlite.prepare('UPDATE game_participants SET guest_count=3 WHERE game_id=?').run(full);expect((await send(full)).status).toBe(404);
 const joined=game();db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(joined,'target',Date.now());expect((await send(joined)).status).toBe(404);
 const pending=game();await handleGames(request('games/'+pending+'/join','target','POST',{}),env);expect((await send(pending)).status).toBe(404);
});
it('rechecks fullness at acceptance without overbooking and marks closed invitations',async()=>{
 const id=game();await send(id);db.sqlite.prepare('UPDATE game_participants SET guest_count=3 WHERE game_id=?').run(id);expect((await inbox())[0].invitationStatus).toBe('closed');await handleGames(request('games/'+id+'/join','target','POST',{}),env);expect((await handleGames(request('games/'+id+'/approve','host','POST',{playerId:'target'}),env)).status).not.toBe(200);expect(db.sqlite.prepare('SELECT SUM(1+guest_count) n FROM game_participants WHERE game_id=?').get(id).n).toBe(4);
});
it('enforces session, CSRF, production guard and recipient-only read updates',async()=>{
 const id=game();expect((await send(id,'target','')).status).toBe(401);expect((await send(id,'target','host','wrong')).status).toBe(403);expect((await handlePlayers(request('players/invitable-games?playerId=target'),{...env,CF_PAGES_BRANCH:'main'})).status).toBe(404);
 await send(id);const note=(await inbox())[0];await handleGames(request('games/notifications/read','other','POST',{id:note.id}),env);expect((await inbox())[0].readAt).toBeNull();await handleGames(request('games/notifications/read','target','POST',{id:note.id}),env);expect((await inbox())[0].readAt).toBeTypeOf('number');
});
it('atomically caps each game at ten distinct invitees and keeps repeat sends idempotent',async()=>{
 const id=game();
 for(let i=0;i<9;i++){const p='invitee-'+i;db.sqlite.prepare('INSERT INTO players(id,display_name,discoverable,created_at,updated_at) VALUES (?,?,1,?,?)').run(p,p,Date.now(),Date.now());db.sqlite.prepare('INSERT INTO player_game_invitations VALUES (?,?,?,?,?,NULL)').run(crypto.randomUUID(),id,'host',p,Date.now());}
 const results=await Promise.all([send(id,'target'),send(id,'other')]);expect(results.map(r=>r.status).sort()).toEqual([200,429]);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM player_game_invitations WHERE game_id=?').get(id).n).toBe(10);
 const recipient=db.sqlite.prepare("SELECT recipient_id FROM player_game_invitations WHERE game_id=? AND recipient_id IN ('target','other')").get(id).recipient_id;
 expect((await send(id,recipient)).status).toBe(200);
 const excluded=recipient==='target'?'other':'target';const choices=await handlePlayers(request('players/invitable-games?playerId='+excluded),env);expect((await choices.json()).games).toHaveLength(0);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(1);
});
it('limits new invitations per host while repeated sends remain deduplicated',async()=>{
 const first=game();await send(first);for(let i=0;i<19;i++)expect((await send(game())).status).toBe(200);expect((await send(game())).status).toBe(429);expect((await send(first)).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM player_game_invitations').get().n).toBe(20);
});

it('caps incoming invitations and deduplicates concurrent sends',async()=>{
 const id=game();await Promise.all([send(id),send(id)]);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM player_game_invitations WHERE game_id=?').get(id).n).toBe(1);
 for(let i=0;i<29;i++){const g=game('public','other');db.sqlite.prepare('INSERT INTO player_game_invitations(id,game_id,sender_id,recipient_id,created_at) VALUES (?,?,?,?,?)').run(crypto.randomUUID(),g,'other','target',Date.now());}
 expect((await send(game())).status).toBe(429);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM player_game_invitations').get().n).toBe(30);
});

it('archives an unanswered invitation at game start without deleting or marking it read',async()=>{
 const id=game('public','host',3600000);await send(id);const start=db.sqlite.prepare('SELECT starts_at FROM games WHERE id=?').get(id).starts_at;
 vi.spyOn(Date,'now').mockReturnValue(start);const n=(await inbox())[0];expect(n).toMatchObject({invitationStatus:'expired',archived:true,readAt:null});expect(db.sqlite.prepare('SELECT COUNT(*) n FROM player_game_invitations').get().n).toBe(1);
});
it('a three-day-old pending invitation expires instead of awaiting approval forever',async()=>{
 const id=game('public','host',3600000);await send(id);await handleGames(request('games/'+id+'/join','target','POST',{}),env);
 vi.spyOn(Date,'now').mockReturnValue(Date.now()+3*86400000);expect((await inbox()).find((n:{kind:string})=>n.kind==='game_invited')).toMatchObject({invitationStatus:'expired',archived:true});
});
it('joined games become completed at end time while cancellations take priority',async()=>{
 const id=game('public','host',3600000);await send(id);await handleGames(request('games/'+id+'/join','target','POST',{}),env);await handleGames(request('games/'+id+'/approve','host','POST',{playerId:'target'}),env);
 const end=db.sqlite.prepare('SELECT ends_at FROM games WHERE id=?').get(id).ends_at;const clock=vi.spyOn(Date,'now').mockReturnValue(end-1);expect((await inbox()).find((n:{kind:string})=>n.kind==='game_invited')).toMatchObject({invitationStatus:'joined',archived:false});clock.mockReturnValue(end);expect((await inbox()).find((n:{kind:string})=>n.kind==='game_invited')).toMatchObject({invitationStatus:'completed',archived:true});
 db.sqlite.prepare("UPDATE games SET status='cancelled' WHERE id=?").run(id);expect((await inbox()).find((n:{kind:string})=>n.kind==='game_invited')).toMatchObject({invitationStatus:'cancelled',archived:true});
});

it('invites to unlisted games with recipient-only revocable access and approval',async()=>{
 const id=game('unlisted');expect((await send(id)).status).toBe(200);
 expect((await handleGames(request('games/'+id,'target'),env)).status).toBe(200);
 expect((await handleGames(request('games/'+id,'other'),env)).status).toBe(404);
 expect((await inbox())[0].gameId).toBe(id);
 expect((await handleGames(request('games/'+id+'/join','target','POST',{}),env)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(1);
 db.sqlite.prepare('UPDATE game_invitation_links SET revoked_at=? WHERE game_id=?').run(Date.now(),id);
 expect((await handleGames(request('games/'+id,'target'),env)).status).toBe(404);
 expect((await inbox()).some((n:{kind:string})=>n.kind==='game_invited')).toBe(false);
});
it('scopes inline player searches to the host and excludes self, opt-outs and participants',async()=>{
 const id=game('unlisted');const path='players/game-invitees?gameId='+id;
 expect((await handlePlayers(request(path,'other'),env)).status).toBe(404);
 const data=await(await handlePlayers(request(path),env)).json();expect(data.players.map((p:{id:string})=>p.id).sort()).toEqual(['other','target']);
 await send(id);const updated=await(await handlePlayers(request(path),env)).json();expect(updated.invitationCount).toBe(1);expect(updated.players.find((p:{id:string})=>p.id==='target').invited).toBe(1);
});

it('inline invite searches accept expanded general locality terms instead of an exact ZIP string',async()=>{
 const {gameInvitees}=await import('../functions/lib/player-game-invitations');const id=game();db.sqlite.prepare("UPDATE players SET general_location='Fairfax' WHERE id='target'").run();
 const data=await gameInvitees(db,'host',id,'22033',['22033','Fairfax']);expect(data.players.map((p:any)=>p.id)).toContain('target');
});

it('public group hosts can invite outsiders without granting membership or private access',async()=>{
 const id=game('group');db.sqlite.prepare("UPDATE tennis_groups SET visibility='public' WHERE id='private-group'").run();
 expect((await send(id)).status).toBe(200);expect((await inbox()).some((n:any)=>n.gameId===id)).toBe(true);
 expect((await handleGames(request('games/'+id+'/join','target','POST',{}),env)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT 1 FROM group_memberships WHERE player_id=?').get('target')).toBeUndefined();
 db.sqlite.prepare("UPDATE tennis_groups SET visibility='private' WHERE id='private-group'").run();expect((await inbox()).some((n:any)=>n.gameId===id)).toBe(false);expect((await handleGames(request('games/'+id,'target'),env)).status).toBe(404);
});
