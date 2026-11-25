import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readdirSync,readFileSync} from 'node:fs';
import {handleAuth,hashToken,type AuthDatabase,type AuthStatement,type AuthEnv} from '../functions/lib/auth';
import {handlePlayers} from '../functions/lib/players';
import {handleGames} from '../functions/lib/games';
import {containsBlockedContent} from '../functions/lib/content-moderation';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite');
class DB implements AuthDatabase{
 sqlite=new DatabaseSync(':memory:');
 constructor(through='9999'){this.sqlite.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('functions/db/migrations').filter(f=>f.endsWith('.sql')&&f<=through).sort())this.sqlite.exec(readFileSync('functions/db/migrations/'+f,'utf8'));}
 prepare(sql:string):AuthStatement{let args:unknown[]=[];const s:AuthStatement={bind(...v){args=v;return s;},first:async<T>()=>(this.sqlite.prepare(sql).get(...args)??null) as T|null,all:async<T>()=>({results:this.sqlite.prepare(sql).all(...args) as T[]}),run:async()=>({meta:{changes:Number(this.sqlite.prepare(sql).run(...args).changes)}})};return s;}
 async batch(statements:AuthStatement[]){this.sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());this.sqlite.exec('COMMIT');return results;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const origin='http://127.0.0.1:8788';let db:DB,env:AuthEnv&{MODERATOR_PLAYER_IDS?:string};const tokens:Record<string,string>={};
beforeEach(async()=>{db=new DB();env={COURTS_DB:db,AUTH_ORIGIN:origin,PLAY_TOGETHER_ENABLED:'true',OPENAI_API_KEY:'test-key'};const originalFetch=globalThis.fetch;vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>new URL(typeof input==='string'?input:input instanceof URL?input:input.url).hostname==='api.openai.com'?Response.json({results:[{flagged:false}]}):originalFetch(input,init));for(const id of ['host','other','target','hidden']){const token='synthetic-session-token-for-'+id+'-with-enough-entropy';tokens[id]=token;db.sqlite.prepare('INSERT INTO players(id,display_name,discoverable,created_at,updated_at) VALUES (?,?,?, ?,?)').run(id,'QA '+id,id==='hidden'?0:1,Date.now(),Date.now());db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run(id,id,await hashToken(token),'csrf',Date.now(),Date.now()+30*86400000);}});
afterEach(()=>{db.sqlite.close();vi.restoreAllMocks();vi.unstubAllGlobals();});
function request(path:string,who='host',method='GET',body?:unknown,csrf='csrf'){
 return new Request(origin+'/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(who?{Cookie:'oc_session='+tokens[who],'X-CSRF-Token':csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
}

function game(visibility='public',owner='host',offset=86400000){const id=crypto.randomUUID(),now=Date.now();if(visibility==='group'){db.sqlite.prepare("INSERT OR IGNORE INTO tennis_groups(id,owner_id,visibility,name,general_location,request_id,created_at,updated_at) VALUES ('private-group',?,'private','Private QA','Fairfax','qa',?,?)").run(owner,now,now);db.sqlite.prepare("INSERT OR IGNORE INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES ('private-group',?,'member','active',?,?)").run(owner,now,now);}db.sqlite.prepare(`INSERT INTO games(id,organizer_id,visibility,group_id,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,request_id,request_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,owner,visibility,visibility==='group'?'private-group':null,'QA '+visibility,'court','Court',38,-77,'public',now+offset,now+offset+3600000,'UTC','doubles',4,id,'hash',now,now);db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,owner,now);return id;}
const staff=()=>{env.MODERATOR_PLAYER_IDS='host,other';};
const mod=(action:string,body:unknown,who='host',csrf='csrf')=>handlePlayers(request('players/moderation/'+action,who,'POST',body,csrf),env);

const chat=(id:string,who='host',method='GET',body?:unknown,suffix='',csrf='csrf')=>handleGames(request('games/'+id+'/chat'+suffix,who,method,body,csrf),env);
const send=(id:string,who='host',body='Meet by court two',clientId=crypto.randomUUID())=>chat(id,who,'POST',{body,clientId});
function join(id:string,who='target'){db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,who,Date.now());}
it('restricts chat to current game participants and never exposes public chat to spectators',async()=>{
 const id=game();expect((await chat(id,'')).status).toBe(401);expect(await(await chat(id,'target')).json()).toMatchObject({available:false});expect((await send(id,'target')).status).toBe(403);join(id);expect((await send(id,'target')).status).toBe(201);const r=await chat(id);expect(r.status).toBe(200);expect((await r.json()).messages.find((m:any)=>m.kind==='message').body).toBe('Meet by court two');expect((await chat(id,'target','POST',{body:'Bad',clientId:crypto.randomUUID()},'','bad')).status).toBe(403);
 db.sqlite.prepare('DELETE FROM game_participants WHERE game_id=? AND player_id=?').run(id,'target');expect((await send(id,'target')).status).toBe(403);
});
it('enforces group membership, blocks, cancellation, and the follow-up window',async()=>{
 const id=game('group');expect((await chat(id,'target')).status).toBe(404);const now=Date.now();db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES ('private-group','target','member','active',?,?)").run(now,now);join(id);expect((await send(id,'target')).status).toBe(201);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='target'").run();expect((await chat(id,'target')).status).toBe(404);
 const pub=game();join(pub);db.sqlite.prepare("INSERT INTO player_blocks(blocker_id,blocked_id,created_at) VALUES ('host','target',?)").run(now);expect((await send(pub,'target')).status).toBe(403);db.sqlite.exec('DELETE FROM player_blocks');db.sqlite.prepare("UPDATE games SET status='cancelled',updated_at=? WHERE id=?").run(now,pub);expect((await send(pub)).status).toBe(409);expect((await(await chat(pub)).json()).canSend).toBe(false);
 const old=game('public','host',-3*86400000);expect((await send(old)).status).toBe(409);
});
it('validates messages, deduplicates retries, and limits rapid sending',async()=>{
 const id=game(),client=crypto.randomUUID();expect((await send(id,'host','',client)).status).toBe(400);expect((await send(id,'host','x'.repeat(2001))).status).toBe(400);expect((await send(id,'host','Hello',client)).status).toBe(201);expect((await send(id,'host','Hello',client)).status).toBe(200);expect((await send(id,'host','Changed',client)).status).toBe(409);
 for(let i=1;i<10;i++)expect((await send(id)).status).toBe(201);expect((await send(id)).status).toBe(429);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE kind='message'").get().n).toBe(10);
});
it('blocks disguised profanity before persistence while allowing ordinary tennis conversation',async()=>{
 const id=game();const originalFetch=globalThis.fetch;let calls=0;vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{if(new URL(typeof input==='string'?input:input instanceof URL?input:input.url).hostname==='api.openai.com'){calls++;return Response.json({results:[{flagged:false}]});}return originalFetch(input,init);});
 expect(containsBlockedContent('I will kill you')).toBe(true);expect(containsBlockedContent('n1gg3r')).toBe(true);expect(containsBlockedContent('That was fuxkinf awful')).toBe(true);expect(containsBlockedContent('Tennis balls, love-15, good serve, ace!')).toBe(false);
 expect((await send(id,'host','F.u.c.k this match')).status).toBe(422);expect((await send(id,'host','I love this court; great ace and serve, no fault. Doubles Saturday?')).status).toBe(201);expect(calls).toBe(1);expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM game_chat_messages WHERE kind='message'").get().n).toBe(1);
});
it('uses Workers AI only when OpenAI is unavailable and fails closed if both are unavailable',async()=>{
 const first=game(),second=game();const aiCalls:string[]=[];env.AI={run:async(model)=>{aiCalls.push(model);return {response:'SAFE'};}};vi.stubGlobal('fetch',async()=>new Response('rate limited',{status:429}));
 expect((await send(first,'host','Can anyone play doubles Saturday?')).status).toBe(201);expect(aiCalls).toEqual(['@cf/meta/llama-guard-3-8b']);
 env.AI={run:async()=>{throw new Error('Workers AI unavailable');}};expect((await send(second,'host','Meet at court three at six.')).status).toBe(503);expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM game_chat_messages WHERE kind='message'").get().n).toBe(1);
});
it('does not save or publish AI-flagged content and enforces concurrent daily reservations',async()=>{
 const flagged=game();vi.stubGlobal('fetch',async()=>Response.json({results:[{flagged:true}]}));expect((await send(flagged,'host','Threatening text')).status).toBe(422);expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM game_chat_messages WHERE kind='message'").get().n).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM notification_events').get().n).toBe(0);
 db.sqlite.prepare("DELETE FROM content_moderation_usage WHERE scope LIKE 'openai:%'").run();env.OPENAI_MODERATION_DAILY_LIMIT='1';vi.stubGlobal('fetch',async()=>Response.json({results:[{flagged:false}]}));const ids=[game(),game()];const results=await Promise.all(ids.map(id=>send(id,'host','Friendly tennis plan')));expect(results.map(r=>r.status).sort()).toEqual([201,503]);expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM game_chat_messages WHERE kind='message'").get().n).toBe(1);
});
it('keeps own sends out of unread, clamps read cursors, and respects message-author blocks',async()=>{
 const id=game();join(id);await send(id,'target');let data=await(await chat(id)).json();expect(data.unread).toBe(1);expect((await(await chat(id,'target')).json()).unread).toBe(0);await chat(id,'host','POST',{throughSeq:Number.MAX_SAFE_INTEGER},'/read');expect((await(await chat(id)).json()).unread).toBe(0);await send(id,'target','Second');expect((await(await chat(id)).json()).unread).toBe(1);
 db.sqlite.prepare("INSERT INTO player_blocks(blocker_id,blocked_id,created_at) VALUES ('host','target',?)").run(Date.now());data=await(await chat(id)).json();expect(data.messages.filter((m:any)=>m.kind==='message')).toHaveLength(0);expect(data.unread).toBe(0);
});
it('supports reported evidence, hides messages, holds and expires cases separately from routine chat',async()=>{
 const {cleanupChat}=await import('../functions/lib/game-chat');const id=game();join(id);const sent=await(await send(id,'target')).json();const report={messageId:sent.id,category:'unsafe',details:'Threatening message'};
 expect((await chat(id,'target','POST',report,'/report')).status).toBe(404);expect((await chat(id,'host','POST',report,'/report')).status).toBe(201);expect((await chat(id,'host','POST',report,'/report')).status).toBe(409);
 const caseId=db.sqlite.prepare('SELECT id FROM game_chat_reports').get().id;staff();const queue=await(await handlePlayers(request('players/reports'),env)).json();expect(queue.reports[0]).toMatchObject({subjectType:'message',reportedPlayerId:'target'});
 expect((await handlePlayers(request('players/moderation/chat-evidence?reportId='+caseId,'target'),env)).status).toBe(403);const ev=await(await handlePlayers(request('players/moderation/chat-evidence?reportId='+caseId),env)).json();expect(ev.messages[0].body).toBe('Meet by court two');
 expect((await mod('chat-hide',{id:caseId,reason:'Threat reviewed'})).status).toBe(200);expect((await(await chat(id)).json()).messages.find((m:any)=>m.kind==='message').body).toBe('');
 expect((await mod('chat-hold',{id:caseId,held:true,reason:'Preserve for unresolved safety appeal'})).status).toBe(200);expect((await mod('chat-review',{id:caseId})).status).toBe(200);
 db.sqlite.prepare('UPDATE games SET ends_at=?,starts_at=? WHERE id=?').run(Date.now()-31*86400000,Date.now()-32*86400000,id);await cleanupChat(db);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE kind='message'").get().n).toBe(1);expect((await(await chat(id)).json()).expired).toBe(true);expect((await send(id)).status).toBe(409);
 expect((await mod('chat-hold',{id:caseId,held:false,reason:'Appeal closed; no preservation duty remains'})).status).toBe(200);await cleanupChat(db);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE kind='message'").get().n).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_chat_reports').get().n).toBe(1);await cleanupChat(db,Date.now()+91*86400000);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_chat_reports').get().n).toBe(0);
});
it('rechecks send authorization atomically and revokes suspended sessions',async()=>{
 const id=game();join(id);const batch=db.batch.bind(db);vi.spyOn(db,'batch').mockImplementationOnce(async ops=>{db.sqlite.prepare('DELETE FROM game_participants WHERE game_id=? AND player_id=?').run(id,'target');return batch(ops);});expect((await send(id,'target')).status).toBe(429);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE kind='message'").get().n).toBe(0);db.sqlite.exec("UPDATE players SET status='disabled' WHERE id='host'");expect((await send(id)).status).toBe(401);
});

it('allows valid invitees, revokes expired/revoked invitations, and keeps confirmed access',async()=>{
 const id=game('unlisted'),inv=crypto.randomUUID(),now=Date.now();db.sqlite.prepare('INSERT INTO player_game_invitations(id,game_id,sender_id,recipient_id,created_at) VALUES (?,?,?,?,?)').run(inv,id,'host','target',now);db.sqlite.prepare('INSERT INTO game_invitation_links(id,game_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)').run(inv,id,'hash',now+86400000,now);
 expect((await send(id,'target')).status).toBe(201);db.sqlite.prepare('UPDATE game_invitation_links SET revoked_at=? WHERE id=?').run(now,inv);expect((await chat(id,'target')).status).toBe(404);join(id);expect((await send(id,'target')).status).toBe(201);db.sqlite.prepare('DELETE FROM game_participants WHERE game_id=? AND player_id=?').run(id,'target');expect((await chat(id,'target')).status).toBe(404);
});
it('creates only generic push routing for other opted-in players and rechecks mute/read/access',async()=>{
 const {chatInbox,chatPushVisible}=await import('../functions/lib/game-chat');const id=game();join(id);const now=Date.now();for(const who of ['host','target'])db.sqlite.prepare('INSERT INTO notification_preferences(player_id,push_enabled,updated_at) VALUES (?,1,?)').run(who,now);
 const sent=await(await send(id,'host','Secret message text')).json();const events=db.sqlite.prepare("SELECT * FROM notification_events WHERE source='game_chat_messages'").all();expect(events).toHaveLength(1);expect(events[0].recipient_id).toBe('target');expect(JSON.stringify(events)).not.toContain('Secret');expect(await chatInbox(db,'host')).toHaveLength(0);expect(await chatInbox(db,'target')).toHaveLength(1);expect(await chatPushVisible(db,sent.id,'target',now)).toBe(true);
 expect((await chat(id,'target','POST',{muted:true},'/mute')).status).toBe(200);expect(await chatPushVisible(db,sent.id,'target',now)).toBe(false);expect(await chatInbox(db,'target')).toHaveLength(1);await chat(id,'target','POST',{muted:false},'/mute');await chat(id,'target','POST',{throughSeq:sent.seq},'/read');expect(await chatPushVisible(db,sent.id,'target',now)).toBe(false);expect(await chatInbox(db,'target')).toHaveLength(0);
});
it('keeps case snapshots after deletion while deleting ordinary authored messages and held references',async()=>{
 const id=game();join(id);const sent=await(await send(id,'target')).json();await chat(id,'host','POST',{messageId:sent.id,category:'unsafe',details:'Review this message'},'/report');db.sqlite.prepare("DELETE FROM players WHERE id='target'").run();expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE kind='message'").get().n).toBe(0);expect(db.sqlite.prepare('SELECT author_id,context_json FROM game_chat_reports').get()).toMatchObject({author_id:null});expect(db.sqlite.prepare('PRAGMA foreign_key_check').all()).toHaveLength(0);db.sqlite.prepare('DELETE FROM games WHERE id=?').run(id);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_chat_rooms').get().n).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_chat_reports').get().n).toBe(1);
});

it('deduplicates concurrent same-client sends without duplicate push events',async()=>{
 const id=game(),client=crypto.randomUUID(),batch=db.batch.bind(db);vi.spyOn(db,'batch').mockImplementationOnce(async ops=>{expect((await send(id,'host','Same send',client)).status).toBe(201);return batch(ops);});expect((await send(id,'host','Same send',client)).status).toBe(200);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE kind='message'").get().n).toBe(1);
});
it('preserves held text through author and game deletion until explicit release and cleanup',async()=>{
 const {cleanupChat}=await import('../functions/lib/game-chat');const id=game();join(id);const sent=await(await send(id,'target')).json();await chat(id,'host','POST',{messageId:sent.id,category:'unsafe',details:'Review threat'},'/report');const caseId=db.sqlite.prepare('SELECT id FROM game_chat_reports').get().id;staff();await mod('chat-hold',{id:caseId,held:true,reason:'Pending legal preservation request'});db.sqlite.exec("DELETE FROM players WHERE id='target'");db.sqlite.prepare('DELETE FROM games WHERE id=?').run(id);expect(db.sqlite.prepare("SELECT body,author_id FROM game_chat_messages WHERE kind='message'").get()).toMatchObject({body:'Meet by court two',author_id:null});expect((await chat(id)).status).toBe(404);await cleanupChat(db,Date.now()+100*86400000);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE kind='message'").get().n).toBe(1);expect((await mod('chat-hold',{id:caseId,held:false,reason:'Preservation duty ended'})).status).toBe(200);await cleanupChat(db,Date.now()+100*86400000);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE kind='message'").get().n).toBe(0);expect(db.sqlite.prepare('PRAGMA foreign_key_check').all()).toHaveLength(0);
});

it('lists only current eligible chat readers with roles, without profile details or spectator access',async()=>{
 const id=game();join(id);const inv=crypto.randomUUID(),now=Date.now();db.sqlite.prepare('INSERT INTO player_game_invitations(id,game_id,sender_id,recipient_id,created_at) VALUES (?,?,?,?,?)').run(inv,id,'host','hidden',now);
 let data=await(await chat(id)).json();expect(data.audience).toEqual([{id:'host',displayName:'QA host',role:'organizer'},{id:'hidden',displayName:'QA hidden',role:'invitee'},{id:'target',displayName:'QA target',role:'player'}]);expect((await(await chat(id,'other')).json()).audience).toBeUndefined();
 db.sqlite.prepare('UPDATE player_game_invitations SET created_at=? WHERE id=?').run(now-8*86400000,inv);db.sqlite.prepare('DELETE FROM game_participants WHERE game_id=? AND player_id=?').run(id,'target');data=await(await chat(id)).json();expect(data.audience.map((p:any)=>p.id)).toEqual(['host']);
 db.sqlite.prepare('DELETE FROM game_participants WHERE game_id=? AND player_id=?').run(id,'host');expect((await(await chat(id)).json()).audience[0].role).toBe('organizer');
});

it('defaults new chat push to on and preserves an explicit mute when marking messages read',async()=>{
 const id=game();join(id);let state=await(await chat(id,'target')).json();expect(state.muted).toBe(false);const sent=await(await send(id,'host')).json();await chat(id,'target','POST',{throughSeq:sent.seq},'/read');expect(db.sqlite.prepare("SELECT muted FROM game_chat_reads WHERE game_id=? AND player_id='target'").get(id).muted).toBe(0);await chat(id,'target','POST',{muted:true},'/mute');await chat(id,'target','POST',{throughSeq:sent.seq},'/read');state=await(await chat(id,'target')).json();expect(state.muted).toBe(true);await chat(id,'target','POST',{muted:false},'/mute');expect((await(await chat(id,'target')).json()).muted).toBe(false);
});

const DAY=86400000;
function seriesGames(){
 const template=game('group'),series=crypto.randomUUID(),now=Date.now(),ids=[crypto.randomUUID(),crypto.randomUUID()];
 for(let i=0;i<ids.length;i++){
  db.sqlite.prepare(`INSERT INTO games(id,organizer_id,visibility,group_id,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,request_id,request_hash,created_at,updated_at,series_id,series_week,series_weeks)
   SELECT ?,organizer_id,visibility,group_id,title,court_id,court_name,court_lat,court_lon,court_access,?,?,time_zone,format,capacity,?,'hash',?,?,?, ?,2 FROM games WHERE id=?`).run(ids[i],now+(i+1)*7*DAY,now+(i+1)*7*DAY+3600000,ids[i],now,now,series,i+1,template);
  join(ids[i],'host');
 }
 db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES ('private-group','target','member','active',?,?)").run(now,now);
 return {ids,series,room:'series:'+series,now};
}
function staleMember(ids:string[],series:string,now:number){
 join(ids[0]);
 db.sqlite.prepare('UPDATE games SET starts_at=?,ends_at=? WHERE id=?').run(now-41*DAY,now-40*DAY,ids[0]);
 db.sqlite.prepare("UPDATE series_chat_members SET joined_at=?,last_message_at=0 WHERE series_id=? AND player_id='target'").run(now-40*DAY,series);
}
it('uses one series room across group dates with one audience, unread entry and mute setting',async()=>{
 const {ids,room}=seriesGames();join(ids[0]);
 const joined=await(await chat(ids[1],'target')).json();expect(joined.series).toBe(true);expect(joined.roomId).toBe(room);expect(joined.messages.filter((m:any)=>m.kind==='joined')).toHaveLength(2);expect(joined.unread).toBe(0);expect(joined.audience.map((p:any)=>p.id)).toEqual(['host','target']);
 const sent=await(await send(ids[0],'target','Across all dates')).json();const second=await(await chat(ids[1])).json();expect(second.messages.at(-1).id).toBe(sent.id);expect(second.unread).toBe(1);
 const {chatInbox}=await import('../functions/lib/game-chat');expect(await chatInbox(db,'host')).toHaveLength(1);
 await chat(ids[0],'host','POST',{muted:true},'/mute');expect((await(await chat(ids[1])).json()).muted).toBe(true);
 await chat(ids[1],'host','POST',{throughSeq:sent.seq},'/read');expect((await(await chat(ids[0])).json()).unread).toBe(0);
 join(ids[1]);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE game_id=? AND author_id='target' AND kind='joined'").get(room).n).toBe(1);
});
it('does not admit group-only members, pending requests, waitlisted players or series invitees',async()=>{
 const {ids}=seriesGames();db.sqlite.exec("UPDATE tennis_groups SET visibility='public' WHERE id='private-group'");
 expect((await chat(ids[0],'target')).status).toBe(404);
 db.sqlite.prepare("INSERT INTO game_join_requests VALUES (?,?,'pending',?,?)").run(ids[0],'target',Date.now(),Date.now());db.sqlite.prepare("INSERT INTO game_waitlist(game_id,player_id,status,created_at) VALUES (?,?,'waiting',?)").run(ids[0],'target',Date.now());expect((await chat(ids[1],'target')).status).toBe(404);
 db.sqlite.prepare('INSERT INTO player_game_invitations(id,game_id,sender_id,recipient_id,created_at) VALUES (?,?,?,?,?)').run(crypto.randomUUID(),ids[0],'host','target',Date.now());
 expect((await send(ids[0],'target')).status).toBe(404);
 expect((await chat(ids[0],'other')).status).toBe(404);join(ids[0]);expect((await send(ids[1],'target')).status).toBe(201);
});
it('expires only after both activities are old, denies stale writes, and records one quiet departure',async()=>{
 const {ids,series,room,now}=seriesGames();staleMember(ids,series,now);
 expect((await chat(ids[1],'target')).status).toBe(404);expect((await send(ids[1],'target')).status).toBe(404);
 await chat(ids[0]);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE game_id=? AND author_id='target' AND kind='inactive'").get(room).n).toBe(1);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM notification_events WHERE source='game_chat_messages'").get().n).toBe(0);
 const {chatInbox}=await import('../functions/lib/game-chat');expect(await chatInbox(db,'host')).toHaveLength(0);
 join(ids[1]);expect((await chat(ids[0],'target')).status).toBe(200);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE game_id=? AND author_id='target' AND kind='joined'").get(room).n).toBe(2);
});
it('retains recent messagers without a recent game and never renews membership for reading or muting',async()=>{
 const {ids,series,now}=seriesGames();staleMember(ids,series,now);
 db.sqlite.prepare("UPDATE series_chat_members SET last_message_at=? WHERE series_id=? AND player_id='target'").run(now-29*DAY,series);
 expect((await chat(ids[1],'target')).status).toBe(200);
 expect((await chat(ids[1],'target','POST',{muted:true},'/mute')).status).toBe(200);
 expect((await chat(ids[1],'target','POST',{throughSeq:99999},'/read')).status).toBe(200);
 expect(db.sqlite.prepare("SELECT last_message_at FROM series_chat_members WHERE series_id=? AND player_id='target'").get(series).last_message_at).toBe(now-29*DAY);
 expect((await send(ids[1],'target')).status).toBe(201);
 expect(db.sqlite.prepare("SELECT last_message_at FROM series_chat_members WHERE series_id=? AND player_id='target'").get(series).last_message_at).toBeGreaterThanOrEqual(now);
 db.sqlite.prepare("UPDATE series_chat_members SET last_message_at=? WHERE series_id=? AND player_id='target'").run(Date.now()-30*DAY,series);
 expect((await chat(ids[1],'target')).status).toBe(404);
});
it('retains upcoming confirmed players and expires them if the only future place is cancelled',async()=>{
 const {ids,series,now}=seriesGames();staleMember(ids,series,now);join(ids[1]);
 db.sqlite.prepare("UPDATE series_chat_members SET joined_at=? WHERE series_id=? AND player_id='target'").run(now-40*DAY,series);
 expect((await chat(ids[0],'target')).status).toBe(200);
 db.sqlite.prepare("UPDATE games SET status='cancelled',updated_at=? WHERE id=?").run(now,ids[1]);
 expect((await chat(ids[0],'target')).status).toBe(404);
});
it('retains recent confirmed games and the organizer without requiring messages',async()=>{
 const {ids,series,now}=seriesGames();staleMember(ids,series,now);
 db.sqlite.prepare('UPDATE games SET starts_at=?,ends_at=? WHERE id=?').run(now-20*DAY-3600000,now-20*DAY,ids[0]);
 expect((await chat(ids[1],'target')).status).toBe(200);
 db.sqlite.prepare("UPDATE series_chat_members SET joined_at=?,last_message_at=0 WHERE series_id=? AND player_id='host'").run(now-90*DAY,series);
 for(const id of ids)db.sqlite.prepare("DELETE FROM game_participants WHERE game_id=? AND player_id='host'").run(id);
 expect((await send(ids[0],'host')).status).toBe(201);join(ids[1],'host');expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE author_id='host' AND kind='inactive'").get().n).toBe(0);
});
it('ends series access immediately on group departure and requires a new confirmation after returning',async()=>{
 const {ids,now}=seriesGames();join(ids[0]);await send(ids[1],'target');
 db.sqlite.prepare("UPDATE group_memberships SET status='left',updated_at=? WHERE player_id='target'").run(now);
 expect((await chat(ids[1],'target')).status).toBe(404);
 db.sqlite.prepare("UPDATE group_memberships SET status='active',updated_at=? WHERE player_id='target'").run(now);
 expect((await chat(ids[1],'target')).status).toBe(404);join(ids[1]);expect((await chat(ids[0],'target')).status).toBe(200);
 db.sqlite.prepare("UPDATE tennis_groups SET status='archived',updated_at=? WHERE id='private-group'").run(now);expect((await chat(ids[0])).status).toBe(404);
});
it('does not turn organizer blocking into an inactivity departure or bypass blocks through another date',async()=>{
 const {ids,room}=seriesGames();join(ids[0]);db.sqlite.prepare("INSERT INTO player_blocks VALUES ('host','target',?)").run(Date.now());
 expect((await chat(ids[0],'target')).status).toBe(404);expect((await chat(ids[1],'target')).status).toBe(404);
 expect(db.sqlite.prepare("SELECT active FROM series_chat_members WHERE player_id='target'").get().active).toBe(1);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE game_id=? AND kind='inactive'").get(room).n).toBe(0);
});
it('queues one generic series push, omits system notices and rechecks canonical mute and membership',async()=>{
 const {ids,room,now}=seriesGames();for(const who of ['host','target'])db.sqlite.prepare('INSERT INTO notification_preferences(player_id,push_enabled,updated_at) VALUES (?,1,?)').run(who,now);
 join(ids[0]);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM notification_events WHERE source='game_chat_messages'").get().n).toBe(0);
 const sent=await(await send(ids[0],'host','Private series text')).json();const events=db.sqlite.prepare('SELECT * FROM notification_events').all();expect(events).toHaveLength(1);expect(events[0].recipient_id).toBe('target');expect(events[0].entity_id).toBe(ids[1]);expect(JSON.stringify(events)).not.toContain('Private series text');
 await send(ids[1],'host','Another date');expect(db.sqlite.prepare('SELECT COUNT(*) n FROM notification_events').get().n).toBe(1);
 const {chatPushVisible}=await import('../functions/lib/game-chat');expect(await chatPushVisible(db,sent.id,'target',now)).toBe(true);
 await chat(ids[1],'target','POST',{muted:true},'/mute');expect(await chatPushVisible(db,sent.id,'target',now)).toBe(false);
 expect(db.sqlite.prepare("SELECT muted FROM game_chat_reads WHERE game_id=? AND player_id='target'").get(room).muted).toBe(1);
});
it('expires series messages individually after 30 days while preserving held evidence without exposing it',async()=>{
 const {ids,room,now}=seriesGames();join(ids[0]);const sent=await(await send(ids[0],'target')).json();
 expect((await chat(ids[1],'host','POST',{messageId:sent.id,category:'unsafe',details:'Review this message'},'/report')).status).toBe(201);
 const report=db.sqlite.prepare('SELECT id,game_id FROM game_chat_reports').get();expect(report.game_id).toBe(room);staff();await mod('chat-hold',{id:report.id,held:true,reason:'Unresolved safety appeal'});
 db.sqlite.prepare('UPDATE game_chat_messages SET created_at=? WHERE id=?').run(now-31*DAY,sent.id);
 expect((await(await chat(ids[1])).json()).messages.some((m:any)=>m.id===sent.id)).toBe(false);
 expect(db.sqlite.prepare('SELECT id FROM game_chat_messages WHERE id=?').get(sent.id)).toBeTruthy();
 expect((await chat(ids[0],'host','POST',{messageId:sent.id,category:'unsafe',details:'Old message'},'/report')).status).toBe(404);
 await mod('chat-hold',{id:report.id,held:false,reason:'Review complete'});const {cleanupChat}=await import('../functions/lib/game-chat');await cleanupChat(db);
 expect(db.sqlite.prepare('SELECT id FROM game_chat_messages WHERE id=?').get(sent.id)).toBeUndefined();expect(db.sqlite.prepare('SELECT id FROM game_chat_reports WHERE id=?').get(report.id)).toBeTruthy();
});
it('rechecks series group access in the send transaction and cannot report a join notice',async()=>{
 const {ids}=seriesGames();join(ids[0]);const notices=(await(await chat(ids[0])).json()).messages;
 expect((await chat(ids[0],'host','POST',{messageId:notices.find((m:any)=>m.authorId==='target').id,category:'other',details:'System message'},'/report')).status).toBe(404);
 const batch=db.batch.bind(db);let calls=0;vi.spyOn(db,'batch').mockImplementation(async ops=>{if(++calls===2){db.sqlite.exec("UPDATE group_memberships SET status='removed' WHERE player_id='target'");}return batch(ops);});
 expect((await send(ids[1],'target')).status).toBe(429);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE kind='message'").get().n).toBe(0);
});
it('removes series author text and notices on account deletion without violating foreign keys',async()=>{
 const {ids,room}=seriesGames();join(ids[0]);await send(ids[1],'target');db.sqlite.exec("DELETE FROM players WHERE id='target'");
 expect(db.sqlite.prepare('SELECT body FROM game_chat_messages WHERE game_id=?').all(room).some((m:any)=>m.body.includes('target')||m.body.includes('Meet by'))).toBe(false);expect(db.sqlite.prepare('PRAGMA foreign_key_check').all()).toHaveLength(0);
});

it('migrates old occurrence rooms without losing messages, mute choices, reports or holds',async()=>{
 db.sqlite.close();db=new DB('0027_game_chat.sql');env.COURTS_DB=db;const now=Date.now();
 for(const who of ['host','target']){db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run(who,'QA '+who,now,now);db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run(who,who,await hashToken(tokens[who]),'csrf',now,now+30*DAY);}
 const a=game('group'),b=game('group'),series=crypto.randomUUID(),room='series:'+series,client=crypto.randomUUID();
 db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES ('private-group','target','member','active',?,?)").run(now,now);
 for(const [i,id] of [a,b].entries()){db.sqlite.prepare('UPDATE games SET series_id=?,series_week=?,series_weeks=2 WHERE id=?').run(series,i+1,id);join(id);db.sqlite.prepare('INSERT INTO game_chat_rooms(game_id,expires_at,legal_hold) VALUES (?,?,?)').run(id,now+40*DAY,i);db.sqlite.prepare('INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at) VALUES (?,?,?,?,?,?)').run('legacy-'+i,id,'target','Legacy '+i,client,now+i);db.sqlite.prepare('INSERT INTO game_chat_reads(game_id,player_id,last_seq,muted) VALUES (?,?,?,?)').run(id,'host',i+1,i);}
 db.sqlite.prepare("INSERT INTO game_chat_reports(id,game_id,message_id,reporter_id,author_id,category,details,context_json,created_at,legal_hold) VALUES ('legacy-case',?,'legacy-1','host','target','unsafe','Review','[]',?,1)").run(b,now);
 db.sqlite.exec(readFileSync('functions/db/migrations/0028_series_chat.sql','utf8'));
 expect(db.sqlite.prepare('SELECT id,game_id,body FROM game_chat_messages ORDER BY seq').all()).toEqual([{id:'legacy-0',game_id:room,body:'Legacy 0'},{id:'legacy-1',game_id:room,body:'Legacy 1'}]);
 expect(db.sqlite.prepare('SELECT muted,last_seq FROM game_chat_reads WHERE game_id=?').get(room)).toMatchObject({muted:1,last_seq:1});expect(db.sqlite.prepare('SELECT legal_hold FROM game_chat_rooms WHERE game_id=?').get(room).legal_hold).toBe(1);
 expect(db.sqlite.prepare("SELECT game_id FROM game_chat_reports WHERE id='legacy-case'").get().game_id).toBe(room);
 for(const migration of readdirSync('functions/db/migrations').filter(file=>file.endsWith('.sql')&&file>'0028_series_chat.sql').sort())db.sqlite.exec(readFileSync('functions/db/migrations/'+migration,'utf8'));
 expect(await(await chat(b)).json()).toMatchObject({series:true});db.sqlite.prepare('DELETE FROM games WHERE id=?').run(a);expect((await(await chat(b)).json()).messages).toHaveLength(2);expect(db.sqlite.prepare('PRAGMA foreign_key_check').all()).toHaveLength(0);
});

it('fails closed during the schema cutover without exposing old chat or breaking the rest of the inbox',async()=>{
 db.sqlite.close();db=new DB('0027_game_chat.sql');env.COURTS_DB=db;const now=Date.now();
 db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run('host','QA host',now,now);db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run('host','host',await hashToken(tokens.host),'csrf',now,now+DAY);
 const id=game();expect((await chat(id)).status).toBe(503);const {chatInbox}=await import('../functions/lib/game-chat');expect(await chatInbox(db,'host')).toEqual([]);
});

it('routes pending series pushes through a surviving date after another occurrence is deleted',async()=>{
 const {ids,now}=seriesGames();join(ids[0]);const sent=await(await send(ids[0],'host')).json();db.sqlite.prepare('DELETE FROM games WHERE id=?').run(ids[1]);
 const {eventStillVisible}=await import('../functions/lib/push-delivery');const delivery={source:'game_chat_messages',source_id:sent.id,recipient_id:'target',entity_id:ids[1],expires_at:now+DAY};
 expect(await eventStillVisible(db,delivery as any,now)).toBe(true);expect(delivery.entity_id).toBe(ids[0]);
});

function groupStaff(who:string,role:'organizer'|'coowner'){
 const now=Date.now();db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,assigned_role,status,created_at,updated_at) VALUES ('private-group',?,'member',?,'active',?,?) ON CONFLICT(group_id,player_id) DO UPDATE SET assigned_role=excluded.assigned_role,status='active'").run(who,role,now,now);
}
it('admits all current group staff without attendance or a chat membership record and names their roles',async()=>{
 const {ids}=seriesGames();groupStaff('target','coowner');groupStaff('other','organizer');
 db.sqlite.prepare("DELETE FROM game_participants WHERE player_id='host' AND game_id IN (?,?)").run(...ids);db.sqlite.exec("DELETE FROM series_chat_members WHERE player_id='host'");
 for(const who of ['host','target','other']){const response=await chat(ids[1],who);expect(response.status).toBe(200);expect((await response.json()).canSend).toBe(true);}
 const data=await(await chat(ids[0])).json();expect(data.audience.map((p:any)=>[p.id,p.role])).toEqual([['host','owner'],['other','organizer'],['target','coowner']]);
 expect((await chat(ids[0],'hidden')).status).toBe(404);
});
it('keeps owner and group staff access after a long-quiet series while retaining mute and deleting old text',async()=>{
 const {ids,series,room,now}=seriesGames();groupStaff('other','organizer');groupStaff('target','coowner');
 db.sqlite.prepare('UPDATE games SET organizer_id=?,starts_at=?,ends_at=? WHERE series_id=?').run('other',now-91*DAY,now-90*DAY,series);
 db.sqlite.prepare('DELETE FROM game_participants WHERE game_id IN (?,?)').run(...ids);db.sqlite.prepare('DELETE FROM series_chat_members WHERE series_id=?').run(series);
 db.sqlite.prepare('UPDATE series_chat_threads SET created_at=? WHERE id=?').run(now-90*DAY,series);
 db.sqlite.prepare('UPDATE game_chat_rooms SET expires_at=? WHERE game_id=?').run(now-60*DAY,room);
 db.sqlite.prepare('INSERT INTO game_chat_reads(game_id,player_id,muted) VALUES (?, ?,1)').run(room,'host');
 db.sqlite.prepare('INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at) VALUES (?,?,?,?,?,?)').run('old-staff-text',room,'host','Old staff message',crypto.randomUUID(),now-31*DAY);
 const {cleanupChat}=await import('../functions/lib/game-chat');await cleanupChat(db,now);
 expect(db.sqlite.prepare('SELECT id FROM game_chat_messages WHERE id=?').get('old-staff-text')).toBeUndefined();expect(db.sqlite.prepare('SELECT muted FROM game_chat_reads WHERE game_id=?').get(room).muted).toBe(1);
 for(const who of ['host','target','other']){const data=await(await chat(ids[0],who)).json();expect(data).toMatchObject({available:true,expired:false,canSend:true});expect((await send(ids[1],who)).status).toBe(201);}
});
it('does not expire staff or emit false inactivity notices when they join another occurrence',async()=>{
 const {ids,series,room,now}=seriesGames();staleMember(ids,series,now);groupStaff('target','coowner');
 const {cleanupChat}=await import('../functions/lib/game-chat');await cleanupChat(db,now);
 expect(db.sqlite.prepare("SELECT active FROM series_chat_members WHERE series_id=? AND player_id='target'").get(series).active).toBe(1);join(ids[1]);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE game_id=? AND author_id='target' AND kind='inactive'").get(room).n).toBe(0);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE game_id=? AND author_id='target' AND kind='joined'").get(room).n).toBe(1);
});
it('grants promotions immediately and removes the exemption on demotion without admitting legacy admins',async()=>{
 const {ids}=seriesGames();expect((await chat(ids[0],'target')).status).toBe(404);groupStaff('target','organizer');expect((await chat(ids[0],'target')).status).toBe(200);
 db.sqlite.exec("UPDATE group_memberships SET assigned_role='member' WHERE player_id='target'");expect((await chat(ids[0],'target')).status).toBe(404);
 db.sqlite.exec("UPDATE group_memberships SET assigned_role=NULL,role='admin' WHERE player_id='target'");expect((await chat(ids[0],'target')).status).toBe(404);
});
it('still revokes group staff after departure or archival and applies ordinary inactivity after demotion',async()=>{
 const {ids,series,now}=seriesGames();staleMember(ids,series,now);groupStaff('target','coowner');expect((await chat(ids[1],'target')).status).toBe(200);
 db.sqlite.exec("UPDATE group_memberships SET assigned_role='member' WHERE player_id='target'");expect((await chat(ids[1],'target')).status).toBe(404);
 groupStaff('target','coowner');expect((await chat(ids[1],'target')).status).toBe(200);db.sqlite.exec("UPDATE group_memberships SET status='removed' WHERE player_id='target'");expect((await chat(ids[1],'target')).status).toBe(404);
 db.sqlite.prepare("UPDATE tennis_groups SET status='archived',updated_at=? WHERE id='private-group'").run(now);expect((await chat(ids[0])).status).toBe(404);
});
it('includes staff in generic push recipients without enrolling them and rechecks role loss before delivery',async()=>{
 const {ids,now}=seriesGames();groupStaff('target','coowner');groupStaff('other','organizer');
 for(const who of ['host','target','other'])db.sqlite.prepare('INSERT INTO notification_preferences(player_id,push_enabled,updated_at) VALUES (?,1,?)').run(who,now);
 const sent=await(await send(ids[0],'host')).json();expect(db.sqlite.prepare("SELECT recipient_id FROM notification_events WHERE source='game_chat_messages' ORDER BY recipient_id").all()).toEqual([{recipient_id:'other'},{recipient_id:'target'}]);
 const {chatPushVisible}=await import('../functions/lib/game-chat');expect(await chatPushVisible(db,sent.id,'target',now)).toBe(true);db.sqlite.exec("UPDATE group_memberships SET assigned_role='member' WHERE player_id='target'");expect(await chatPushVisible(db,sent.id,'target',now)).toBe(false);
});

it('adds quiet standalone lifecycle notices and revokes removed players on every chat action',async()=>{
 const id=game();join(id);const added=await(await chat(id)).json();expect(added.messages.filter((m:any)=>m.kind==='joined').map((m:any)=>m.authorId)).toEqual(['host','target']);expect(added.unread).toBe(0);
 const sent=await(await send(id,'target')).json();db.sqlite.prepare("DELETE FROM game_participants WHERE game_id=? AND player_id='target'").run(id);
 const current=await(await chat(id)).json();expect(current.messages.filter((m:any)=>m.kind==='left')).toHaveLength(1);expect(current.audience.map((p:any)=>p.id)).toEqual(['host']);
 expect((await(await chat(id,'target')).json()).available).toBe(false);
 for(const [body,suffix] of [[{body:'No',clientId:crypto.randomUUID()},''],[{muted:true},'/mute'],[{throughSeq:sent.seq},'/read'],[{messageId:sent.id,category:'other',details:'No access'},'/report']] as const)expect((await chat(id,'target','POST',body,suffix)).status).toBe(403);
 const {chatInbox,chatPushVisible}=await import('../functions/lib/game-chat');expect(await chatInbox(db,'target')).toEqual([]);expect(await chatPushVisible(db,sent.id,'target',Date.now())).toBe(false);
});
it('announces group departure for staff with role-only access and avoids duplicates for enrolled staff',async()=>{
 const {ids,room,now}=seriesGames();groupStaff('target','coowner');db.sqlite.prepare("UPDATE group_memberships SET status='removed',updated_at=? WHERE player_id='target'").run(now);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE game_id=? AND author_id='target' AND kind='left'").get(room).n).toBe(1);
 groupStaff('target','coowner');join(ids[0]);db.sqlite.prepare("UPDATE group_memberships SET status='left',updated_at=? WHERE player_id='target'").run(now+10);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_chat_messages WHERE game_id=? AND author_id='target' AND kind='left'").get(room).n).toBe(2);
});
it('does not announce pending requests and keeps the nonplaying organizer in standalone chat',async()=>{
 const id=game();db.sqlite.prepare("INSERT INTO game_join_requests VALUES (?,?,'pending',?,?)").run(id,'target',Date.now(),Date.now());expect((await(await chat(id)).json()).messages.some((m:any)=>m.authorId==='target')).toBe(false);
 db.sqlite.prepare("DELETE FROM game_participants WHERE game_id=? AND player_id='host'").run(id);const state=await(await chat(id)).json();expect(state.available).toBe(true);expect(state.messages.some((m:any)=>m.kind==='left'&&m.authorId==='host')).toBe(false);
});
const edit=(id:string,body:Record<string,unknown>,who='host',preview=false)=>handleGames(request('games/'+id+(preview?'/edit-preview':'/edit'),who,'POST',body),env);
function pending(id:string,who:string,createdAt:number){db.sqlite.prepare("INSERT INTO game_join_requests VALUES (?,?,'pending',?,?)").run(id,who,createdAt,createdAt);}
function extra(who:string){db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run(who,'QA '+who,Date.now(),Date.now());}
it('increases standalone capacity without auto-approving pending requests',async()=>{
 const id=game();db.sqlite.prepare("UPDATE games SET format='singles',capacity=2 WHERE id=?").run(id);join(id);pending(id,'other',Date.now()-20);pending(id,'hidden',Date.now()-10);
 const input={title:'Expanded',notes:'Two more places',format:'doubles',courtCount:1,capacity:4,version:1,fillWaiting:true};const preview=await(await edit(id,input,'host',true)).json();expect(preview.candidates).toEqual([]);
 expect((await edit(id,input)).status).toBe(200);expect(db.sqlite.prepare('SELECT format,capacity,event_capacity,court_count,version FROM games WHERE id=?').get(id)).toMatchObject({format:'doubles',capacity:4,event_capacity:4,court_count:1,version:2});
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(2);expect(db.sqlite.prepare("SELECT status FROM game_join_requests WHERE game_id=? ORDER BY created_at").all(id).map((r:any)=>r.status)).toEqual(['pending','pending']);
 expect((await handleGames(request('games/'+id+'/approve','host','POST',{playerId:'other'}),env)).status).toBe(200);expect(db.sqlite.prepare("SELECT status FROM game_join_requests WHERE game_id=? AND player_id='other'").get(id).status).toBe('approved');expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(3);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_edit_jobs').get().n).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_capacity_fill').get().n).toBe(0);
});
it('keeps standalone requests pending after capacity increases until the host approves them',async()=>{
 const id=game();for(const who of ['target','other','hidden'])join(id,who);
 for(let i=0;i<6;i++){extra('queued-'+i);pending(id,'queued-'+i,Date.now()-100+i);}
 expect((await edit(id,{title:'Eight players',notes:'',capacity:8,courtCount:2,version:1,fillWaiting:true})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_join_requests WHERE game_id=? AND status='pending'").get(id).n).toBe(6);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(4);
 expect((await edit(id,{title:'Twelve players',notes:'',capacity:12,courtCount:3,version:2,fillWaiting:true})).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(4);
 expect((await handleGames(request('games/'+id+'/approve','host','POST',{playerId:'queued-0'}),env)).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(5);
});
it('can increase capacity without auto approval and then approve a pending guest in full',async()=>{
 const id=game();db.sqlite.prepare("UPDATE games SET format='singles',capacity=2 WHERE id=?").run(id);join(id);
 db.sqlite.prepare("INSERT INTO game_guest_requests(game_id,player_id,guest_count,status,created_at,updated_at) VALUES (?, 'target',1,'pending',?,?)").run(id,Date.now(),Date.now());
 expect((await handleGames(request('games/'+id+'/approve-guests','host','POST',{playerId:'target'}),env)).status).toBe(409);
 expect((await edit(id,{title:'Guest place',notes:'',capacity:3,version:1,fillWaiting:false})).status).toBe(200);expect(db.sqlite.prepare("SELECT status FROM game_guest_requests WHERE game_id=?").get(id).status).toBe('pending');
 expect((await handleGames(request('games/'+id+'/approve-guests','host','POST',{playerId:'target'}),env)).status).toBe(200);expect(db.sqlite.prepare("SELECT guest_count FROM game_participants WHERE game_id=? AND player_id='target'").get(id).guest_count).toBe(1);
});
it('fills group waitlist members in request order without requiring an approval toggle',async()=>{
 const id=game('group'),now=Date.now();for(const who of ['target','other','hidden'])db.sqlite.prepare("INSERT OR IGNORE INTO group_memberships(group_id,player_id,status,created_at,updated_at) VALUES ('private-group',?,'active',?,?)").run(who,now,now);join(id);
 pending(id,'other',now-50);pending(id,'hidden',now-30);db.sqlite.prepare("INSERT INTO game_waitlist(game_id,player_id,status,created_at,offer_expires_at) VALUES (?, 'other','offered',?,?)").run(id,now-40,now+60000);db.sqlite.prepare("INSERT INTO game_waitlist(game_id,player_id,status,created_at) VALUES (?, 'hidden','waiting',?)").run(id,now-20);
 const input={title:'More places',notes:'',capacity:8,courtCount:2,version:1,fillWaiting:false};const plan=await(await edit(id,input,'host',true)).json();expect(plan.candidates.map((p:any)=>p.playerId)).toEqual(['other','hidden']);
 expect((await edit(id,input)).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_waitlist WHERE game_id=?').get(id).n).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(4);
});
it('moves the latest standalone join to host approval and notifies again when approved',async()=>{
 const id=game();join(id,'other');join(id,'target');const now=Date.now();db.sqlite.prepare("UPDATE game_participants SET joined_at=CASE player_id WHEN 'host' THEN ? WHEN 'other' THEN ? ELSE ? END WHERE game_id=?").run(now-30,now-20,now-10,id);
 const reduced={title:'Singles',notes:'',format:'singles',courtCount:1,capacity:2,version:1};const preview=await(await edit(id,reduced,'host',true)).json();expect(preview.demoted).toMatchObject([{playerId:'target',partySize:1}]);
 expect((await edit(id,reduced)).status).toBe(200);expect(db.sqlite.prepare('SELECT player_id FROM game_participants WHERE game_id=? ORDER BY player_id').all(id).map((p:any)=>p.player_id)).toEqual(['host','other']);expect(db.sqlite.prepare("SELECT status FROM game_join_requests WHERE game_id=? AND player_id='target'").get(id).status).toBe('pending');expect(db.sqlite.prepare("SELECT kind FROM game_notifications WHERE recipient_id='target' ORDER BY created_at DESC LIMIT 1").get().kind).toBe('waitlisted');
 expect((await edit(id,{...reduced,title:'Capacity available',capacity:3,version:2})).status).toBe(200);expect(db.sqlite.prepare("SELECT status FROM game_join_requests WHERE game_id=? AND player_id='target'").get(id).status).toBe('pending');expect((await handleGames(request('games/'+id+'/approve','host','POST',{playerId:'target'}),env)).status).toBe(200);expect(db.sqlite.prepare("SELECT kind FROM game_notifications WHERE recipient_id='target' ORDER BY created_at DESC LIMIT 1").get().kind).toBe('approved');
});
it('moves the latest group join to the FIFO waitlist and sends a return confirmation',async()=>{
 const id=game('group'),now=Date.now();for(const who of ['other','target'])db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES ('private-group',?,'member','active',?,?)").run(who,now,now);join(id,'other');join(id,'target');db.sqlite.prepare("UPDATE game_participants SET joined_at=CASE player_id WHEN 'host' THEN ? WHEN 'other' THEN ? ELSE ? END WHERE game_id=?").run(now-30,now-20,now-10,id);
 const reduced={title:'Group singles',notes:'',format:'singles',courtCount:1,capacity:2,version:1};expect((await edit(id,reduced,'host',true)).status).toBe(200);expect((await edit(id,reduced)).status).toBe(200);expect(db.sqlite.prepare("SELECT status,created_at FROM game_waitlist WHERE game_id=? AND player_id='target'").get(id)).toMatchObject({status:'waiting'});expect(db.sqlite.prepare("SELECT created_at FROM game_waitlist WHERE game_id=? AND player_id='target'").get(id).created_at).toBeGreaterThanOrEqual(now-10);expect(db.sqlite.prepare("SELECT kind FROM game_notifications WHERE recipient_id='target' ORDER BY created_at DESC LIMIT 1").get().kind).toBe('waitlisted');
 expect((await edit(id,{...reduced,title:'Group doubles',format:'doubles',capacity:4,version:2})).status).toBe(200);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_participants WHERE game_id=? AND player_id='target'").get(id).n).toBe(1);expect(db.sqlite.prepare("SELECT kind FROM game_notifications WHERE recipient_id='target' ORDER BY created_at DESC LIMIT 1").get().kind).toBe('confirmed');
});
it('fills a place freed by a group capacity reduction with the earlier waiter before displaced players',async()=>{
 const id=game('group'),now=Date.now(),first='fifo-'+crypto.randomUUID();extra(first);for(const who of ['other','target',first])db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES ('private-group',?,'member','active',?,?)").run(who,now,now);join(id,'other');join(id,'target');db.sqlite.prepare("UPDATE game_participants SET guest_count=1,joined_at=? WHERE game_id=? AND player_id='target'").run(now-10,id);db.sqlite.prepare("UPDATE game_participants SET joined_at=? WHERE game_id=? AND player_id='other'").run(now-20,id);db.sqlite.prepare("INSERT INTO game_waitlist(game_id,player_id,status,created_at) VALUES (?,?,'waiting',?)").run(id,first,now-100);
 const reduced={title:'Capacity reduced',notes:'',format:'singles',courtCount:1,capacity:3,version:1};expect((await edit(id,reduced,'host',true)).status).toBe(200);const preview=await(await edit(id,reduced,'host',true)).json();expect(preview.demoted.map((p:any)=>p.playerId)).toEqual(['target']);expect((await edit(id,reduced)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT player_id FROM game_participants WHERE game_id=? ORDER BY player_id').all(id).map((p:any)=>p.player_id)).toEqual([first,'host','other']);expect(db.sqlite.prepare("SELECT status FROM game_waitlist WHERE game_id=? AND player_id='target'").get(id).status).toBe('waiting');expect(db.sqlite.prepare("SELECT kind FROM game_notifications WHERE recipient_id=? ORDER BY created_at DESC LIMIT 1").get(first).kind).toBe('confirmed');expect(db.sqlite.prepare("SELECT kind FROM game_notifications WHERE recipient_id='target' ORDER BY created_at DESC LIMIT 1").get().kind).toBe('waitlisted');
});
it('protects confirmed guests and offered places from capacity reductions and rejects stale edits',async()=>{
 const id=game('group'),now=Date.now();for(const who of ['target','other'])db.sqlite.prepare("INSERT OR IGNORE INTO group_memberships(group_id,player_id,status,created_at,updated_at) VALUES ('private-group',?,'active',?,?)").run(who,now,now);join(id);db.sqlite.prepare("UPDATE game_participants SET guest_count=1 WHERE game_id=? AND player_id='target'").run(id);db.sqlite.prepare("INSERT INTO game_waitlist(game_id,player_id,status,created_at,offer_expires_at) VALUES (?, 'other','offered',?,?)").run(id,now,now+60000);
 expect((await edit(id,{title:'Too small',notes:'',format:'singles',capacity:3,version:1})).status).toBe(409);
 expect((await edit(id,{title:'Okay',notes:'',capacity:8,version:1,fillWaiting:false})).status).toBe(200);expect((await edit(id,{title:'Stale',notes:'',capacity:12,version:1})).status).toBe(409);
});
it('does not auto-approve standalone requests even when some are blocked or inactive',async()=>{
 const id=game();pending(id,'target',Date.now()-30);pending(id,'other',Date.now()-20);pending(id,'hidden',Date.now()-10);db.sqlite.prepare("INSERT INTO player_blocks VALUES ('host','target',?)").run(Date.now());db.sqlite.exec("UPDATE players SET status='disabled' WHERE id='other'");
 expect((await edit(id,{title:'Larger',notes:'',capacity:8,version:1,fillWaiting:true})).status).toBe(200);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_join_requests WHERE game_id=? AND status='approved'").get(id).n).toBe(0);expect(db.sqlite.prepare("SELECT status FROM game_join_requests WHERE game_id=? AND player_id='hidden'").get(id).status).toBe('pending');
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_notifications WHERE game_id=? AND recipient_id='host' AND kind='approved'").get(id).n).toBe(0);
});
it('rolls back a capacity reduction cleanly if guest occupancy changes before the edit batch',async()=>{
 const id=game();db.sqlite.prepare('UPDATE games SET event_capacity=6 WHERE id=?').run(id);join(id);const batch=db.batch.bind(db);vi.spyOn(db,'batch').mockImplementationOnce(async ops=>{db.sqlite.prepare("UPDATE game_participants SET guest_count=3 WHERE game_id=? AND player_id='target'").run(id);return batch(ops);});
 expect((await edit(id,{title:'Must not save',notes:'',capacity:4,version:1})).status).toBe(409);expect(db.sqlite.prepare('SELECT title,event_capacity,version FROM games WHERE id=?').get(id)).toMatchObject({title:'QA public',event_capacity:6,version:1});expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_edit_jobs').get().n).toBe(0);
});
it('protects capacity editing and preview from nonmanagers, missing CSRF and invalid values',async()=>{
 const id=game(),input={title:'Edit',notes:'',capacity:8,version:1,fillWaiting:true};
 expect((await edit(id,input,'target')).status).toBe(403);expect((await edit(id,input,'target',true)).status).toBe(403);
 expect((await handleGames(request('games/'+id+'/edit','host','POST',input,'bad'),env)).status).toBe(403);
 for(const patch of [{format:'triples'},{courtCount:0},{courtCount:17},{capacity:129},{capacity:3,format:'doubles'},{fillWaiting:'yes'}])expect((await edit(id,{...input,...patch})).status).toBe(400);
 expect(db.sqlite.prepare('SELECT version FROM games WHERE id=?').get(id).version).toBe(1);
});
it('rechecks group management inside the atomic capacity batch after coowner demotion',async()=>{
 const id=game('group');groupStaff('target','coowner');pending(id,'other',Date.now());
 const batch=db.batch.bind(db);vi.spyOn(db,'batch').mockImplementationOnce(async ops=>{db.sqlite.exec("UPDATE group_memberships SET assigned_role='member' WHERE player_id='target'");return batch(ops);});
 expect((await edit(id,{title:'Forbidden',notes:'',capacity:8,version:1,fillWaiting:true},'target')).status).toBe(409);
 expect(db.sqlite.prepare('SELECT version,title FROM games WHERE id=?').get(id)).toMatchObject({version:1,title:'QA group'});expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_edit_jobs').get().n).toBe(0);
});
it('lets a public-game host add their own guests directly without self notifications',async()=>{
 const id=game();expect((await(await handleGames(request('games/'+id+'/guests'),env)).json()).canAddGuestsDirectly).toBe(true);
 expect((await handleGames(request('games/'+id+'/request-guests','host','POST',{guestCount:2}),env)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT guest_count FROM game_participants WHERE game_id=?').get(id).guest_count).toBe(2);
 expect(db.sqlite.prepare('SELECT status FROM game_guest_requests WHERE game_id=?').get(id).status).toBe('approved');
 expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_guest_notifications WHERE recipient_id='host'").get().n).toBe(0);
});
it('tells an open-game host when guest places do not fit',async()=>{
 const id=game();for(const who of ['other','target','hidden'])join(id,who);
 const response=await handleGames(request('games/'+id+'/request-guests','host','POST',{guestCount:1}),env);
 expect(response.status).toBe(409);expect(await response.json()).toMatchObject({error:'There are not enough available places for these guests.'});
 expect(db.sqlite.prepare('SELECT guest_count FROM game_participants WHERE game_id=? AND player_id=?').get(id,'host').guest_count).toBe(0);
});
it('lets group owners, coowners and assigned organizers add their own guests without approval',async()=>{
 for(const role of ['owner','coowner','organizer']){
  const id=game('group'),who=role==='owner'?'host':'target';if(role!=='owner'){groupStaff(who,role as 'coowner'|'organizer');join(id,who);}
  expect((await(await handleGames(request('games/'+id+'/guests',who),env)).json()).canAddGuestsDirectly).toBe(true);
  expect((await handleGames(request('games/'+id+'/request-guests',who,'POST',{guestCount:1}),env)).status).toBe(200);
  expect(db.sqlite.prepare('SELECT status FROM game_guest_requests WHERE game_id=? AND player_id=?').get(id,who).status).toBe('approved');
 }
});
it('lets group owners, coowners and organizers approve other members guest requests',async()=>{
 for(const role of ['owner','coowner','organizer']){
  const id=game('group'),manager=role==='owner'?'host':'target',now=Date.now();
  if(role!=='owner')groupStaff(manager,role as 'coowner'|'organizer');
  const permissions=await(await handleGames(request('games/'+id+'/participation',manager),env)).json();
  expect(permissions.canManageGuests).toBe(true);
  if(role==='organizer')expect(permissions.isOrganizer).toBe(false);
  db.sqlite.prepare("INSERT OR IGNORE INTO group_memberships(group_id,player_id,role,status,created_at,updated_at) VALUES ('private-group','other','member','active',?,?)").run(now,now);
  join(id,'other');
  expect((await handleGames(request('games/'+id+'/request-guests','other','POST',{guestCount:1}),env)).status).toBe(200);
  expect((await handleGames(request('games/'+id+'/approve-guests',manager,'POST',{playerId:'other'}),env)).status).toBe(200);
  expect(db.sqlite.prepare('SELECT guest_count FROM game_participants WHERE game_id=? AND player_id=?').get(id,'other').guest_count).toBe(1);
 }
});
it('keeps ordinary members pending and protects direct guests from overbooking or missing attendance',async()=>{
 const id=game('group'),now=Date.now();db.sqlite.prepare("INSERT INTO group_memberships(group_id,player_id,status,created_at,updated_at) VALUES ('private-group','target','active',?,?)").run(now,now);join(id);
 expect((await handleGames(request('games/'+id+'/request-guests','target','POST',{guestCount:1}),env)).status).toBe(200);expect(db.sqlite.prepare("SELECT status FROM game_guest_requests WHERE player_id='target'").get().status).toBe('pending');
 expect((await handleGames(request('games/'+id+'/request-guests','host','POST',{guestCount:3}),env)).status).toBe(409);expect(db.sqlite.prepare("SELECT guest_count FROM game_participants WHERE player_id='host'").get().guest_count).toBe(0);
 db.sqlite.prepare("DELETE FROM game_participants WHERE game_id=? AND player_id='host'").run(id);
 expect((await handleGames(request('games/'+id+'/request-guests','host','POST',{guestCount:1}),env)).status).toBe(409);
});
it('rechecks direct-guest privileges atomically after a group role is lost',async()=>{
 const id=game('group');groupStaff('target','organizer');join(id);const batch=db.batch.bind(db);
 vi.spyOn(db,'batch').mockImplementationOnce(async ops=>{db.sqlite.exec("UPDATE group_memberships SET assigned_role='member' WHERE player_id='target'");return batch(ops);});
 expect((await handleGames(request('games/'+id+'/request-guests','target','POST',{guestCount:1}),env)).status).toBe(409);expect(db.sqlite.prepare("SELECT guest_count FROM game_participants WHERE player_id='target'").get().guest_count).toBe(0);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_guest_requests WHERE player_id='target'").get().n).toBe(0);
});
it('does not let direct host guests consume a live waitlist reservation',async()=>{
 const id=game('group'),now=Date.now();for(const who of ['target','other'])db.sqlite.prepare("INSERT OR IGNORE INTO group_memberships(group_id,player_id,status,created_at,updated_at) VALUES ('private-group',?,'active',?,?)").run(who,now,now);join(id);
 db.sqlite.prepare("INSERT INTO game_waitlist(game_id,player_id,status,created_at,offer_expires_at) VALUES (?, 'other','offered',?,?)").run(id,now,now+60000);
 expect((await handleGames(request('games/'+id+'/request-guests','host','POST',{guestCount:2}),env)).status).toBe(409);expect(db.sqlite.prepare("SELECT guest_count FROM game_participants WHERE game_id=? AND player_id='host'").get(id).guest_count).toBe(0);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM game_guest_requests WHERE game_id=?").get(id).n).toBe(0);
});
