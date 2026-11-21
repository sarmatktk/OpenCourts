import {beforeEach,afterEach,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {hashToken,type AuthEnv,type AuthDatabase,type AuthStatement} from '../functions/lib/auth';
import {handleDiscussions,discussionPushTarget,discussionInbox,cleanupDiscussions} from '../functions/lib/group-discussions';
import {handlePlayers} from '../functions/lib/players';
import {handleMedia,type MediaEnv} from '../functions/lib/media';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite');
class DB implements AuthDatabase{
 sqlite=new DatabaseSync(':memory:');lastError='';
 constructor(through='9999'){this.sqlite.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('functions/db/migrations').filter(f=>f.endsWith('.sql')&&f<=through).sort())this.sqlite.exec(readFileSync('functions/db/migrations/'+f,'utf8'));}
 prepare(sql:string):AuthStatement{let args:unknown[]=[];const run=(mode:string)=>{try{return this.sqlite.prepare(sql)[mode](...args);}catch(e){this.lastError=(e as Error).message+' SQL: '+sql;throw e;}};const s:AuthStatement={bind(...v){args=v;return s;},first:async<T>()=>(run('get')??null) as T|null,all:async<T>()=>({results:run('all') as T[]}),run:async()=>({meta:{changes:Number(run('run').changes)}})};return s;}
 async batch(ss:AuthStatement[]){this.sqlite.exec('BEGIN');try{const r=[];for(const s of ss)r.push(await s.run());this.sqlite.exec('COMMIT');return r;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const origin='http://127.0.0.1:8788',group=crypto.randomUUID();let db:DB,env:AuthEnv;const tokens:Record<string,string>={};
beforeEach(async()=>{db=new DB();env={COURTS_DB:db,AUTH_ORIGIN:origin,PLAY_TOGETHER_ENABLED:'true'};const now=Date.now();for(const who of ['owner','coowner','organizer','member','second','outsider','removed','pending']){tokens[who]='synthetic-discussion-session-'+who+'-long-enough';db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES(?,?,?,?)').run(who,'Sample '+who,now,now);db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES(?,?,?,?,?,?)').run(who,who,await hashToken(tokens[who]),'csrf',now,now+86400000);}
db.sqlite.prepare("INSERT INTO tennis_groups(id,owner_id,visibility,name,general_location,request_id,created_at,updated_at) VALUES(?,'owner','public','Tennis friends','Fairfax',?,?,?)").run(group,group,now,now);
for(const who of ['owner','coowner','organizer','member','second','removed','pending'])db.sqlite.prepare('INSERT INTO group_memberships(group_id,player_id,role,assigned_role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(group,who,'member',['coowner','organizer'].includes(who)?who:'member',['removed','pending'].includes(who)?who:'active',now,now);
});
afterEach(()=>db.sqlite.close());
function req(path:string,who='member',method='GET',body?:unknown,csrf='csrf'){return new Request(origin+'/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(who?{Cookie:'oc_session='+tokens[who],'X-CSRF-Token':csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function call(path='',who='member',method='GET',body?:unknown,csrf='csrf'){const r=await handleDiscussions(req('discussions/'+group+path,who,method,body,csrf),env);if(r.status===503&&db.lastError)throw Error(db.lastError);return r;}
async function create(who='owner'){const r=await call('',who,'POST',{title:'Weekend tennis',body:'Who is up for doubles?',clientId:crypto.randomUUID()});expect(r.status).toBe(201);return (await r.json() as {id:string}).id;}
async function comment(id:string,who='member'){const r=await call('/'+id+'/comment',who,'POST',{body:'I can play on Saturday.',clientId:crypto.randomUUID()});expect(r.status).toBe(201);return (await r.json() as {id:string}).id;}
it('keeps public and private group discussions member-only, including direct URLs',async()=>{
 const id=await create();for(const visibility of ['public','private']){db.sqlite.prepare('UPDATE tennis_groups SET visibility=?').run(visibility);for(const who of ['outsider','removed','pending']){expect((await call('',who)).status).toBe(404);expect((await call('/'+id,who)).status).toBe(404);}expect((await call('/'+id,'member')).status).toBe(200);}expect((await call('','')).status).toBe(401);
 db.sqlite.prepare("UPDATE tennis_groups SET status='archived'").run();expect((await call('/'+id)).status).toBe(404);
});
it('validates text, CSRF, idempotency and bounded posting rates',async()=>{
 expect((await call('','member','POST',{title:'x',body:'x',clientId:crypto.randomUUID()},'wrong')).status).toBe(403);
 expect((await call('','member','POST',{title:' ',body:'text',clientId:crypto.randomUUID()})).status).toBe(400);
 const payload={title:'A hitting partner?',body:'<script>alert(1)</script>',clientId:crypto.randomUUID()};const a=await(await call('','member','POST',payload)).json();expect(await(await call('','member','POST',payload)).json()).toEqual(a);
 for(let i=0;i<4;i++)await create('member');expect((await call('','member','POST',{...payload,clientId:crypto.randomUUID()})).status).toBe(429);
});
it('supports idempotent likes on posts and comments without notification spam',async()=>{
 const id=await create(),c=await comment(id);for(const commentId of ['',c]){for(let i=0;i<2;i++)expect((await call('/'+id+'/like','second','POST',{commentId,liked:true})).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_likes WHERE comment_id=?').get(commentId).n).toBe(1);await call('/'+id+'/like','second','POST',{commentId,liked:false});expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_likes WHERE comment_id=?').get(commentId).n).toBe(0);}
 expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_notifications').get().n).toBe(1);
});
it('allows author edits with version checks and owner/co-owner removal, but not organizer removal',async()=>{
 const id=await create('member'),c=await comment(id,'second');expect((await call('/'+id+'/edit','second','POST',{title:'bad',body:'bad',version:1})).status).toBe(403);
 expect((await call('/'+id+'/edit','member','POST',{title:'Updated',body:'New body',version:1})).status).toBe(200);expect((await call('/'+id+'/edit','member','POST',{title:'Stale',body:'Stale',version:1})).status).toBe(409);
 expect((await call('/'+id+'/delete','organizer','POST',{commentId:c})).status).toBe(403);expect((await call('/'+id+'/delete','coowner','POST',{commentId:c})).status).toBe(200);expect((await call('/'+id+'/delete','owner','POST',{})).status).toBe(200);expect((await call('/'+id)).status).toBe(404);
});
it('locks discussion replies, edits and likes while preserving read access',async()=>{
 const id=await create('member');expect((await call('/'+id+'/lock','organizer','POST',{locked:true})).status).toBe(403);expect((await call('/'+id+'/lock','coowner','POST',{locked:true})).status).toBe(200);
 expect((await call('/'+id+'/comment','member','POST',{body:'No',clientId:crypto.randomUUID()})).status).toBe(409);expect((await call('/'+id+'/edit','member','POST',{title:'No',body:'No',version:2})).status).toBe(409);expect((await call('/'+id+'/like','member','POST',{liked:true})).status).toBe(409);expect((await call('/'+id)).status).toBe(200);await call('/'+id+'/lock','owner','POST',{locked:false});await comment(id);
});
it('notifies the author and participants, never the sender, and respects mute, blocking and membership changes',async()=>{
 const id=await create();await comment(id,'member');await comment(id,'second');const rows=db.sqlite.prepare('SELECT * FROM group_discussion_notifications ORDER BY created_at').all();expect(rows.some((n:any)=>n.recipient_id===n.actor_id)).toBe(false);expect(rows).toHaveLength(3);
 const note=rows.find((n:any)=>n.recipient_id==='owner');expect(await discussionPushTarget(db,note.id,'owner',Date.now())).toMatchObject({groupId:group,postId:id});await call('/'+id+'/mute','owner','POST',{muted:true});expect(await discussionPushTarget(db,note.id,'owner',Date.now())).toBeNull();const prior=rows.length;await comment(id,'member');expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM group_discussion_notifications WHERE recipient_id='owner'").get().n).toBe(2);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='second'").run();expect(await discussionInbox(db,'second')).toEqual([]);expect((await call('/'+id,'second')).status).toBe(404);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM notification_events WHERE source=\'discussion_notifications\'').get().n).toBeGreaterThanOrEqual(prior);
});
it('hides blocked authors and prevents cross-thread comment likes',async()=>{
 const id=await create(),other=await create('second'),c=await comment(other,'second');expect((await call('/'+id+'/like','member','POST',{commentId:c,liked:true})).status).toBe(404);
 db.sqlite.prepare("INSERT INTO player_blocks VALUES('member','owner',?)").run(Date.now());expect((await call('/'+id)).status).toBe(404);expect((await(await call()).json() as any).posts).toHaveLength(1);
});
it('preserves private reported evidence and exposes moderation only to site moderators',async()=>{
 const id=await create();const report={subjectType:'post',subjectId:id,category:'unsafe',details:'Concern about this post.'};expect((await call('/report','outsider','POST',report)).status).toBe(404);expect((await call('/report','member','POST',{...report,details:' '})).status).toBe(400);expect((await call('/report','member','POST',report)).status).toBe(201);expect((await call('/report','member','POST',report)).status).toBe(429);
 const staffEnv={...env,MODERATOR_PLAYER_IDS:'coowner'};const queue=await handlePlayers(req('players/reports','coowner'),staffEnv);const row=(await queue.json() as any).reports.find((r:any)=>r.subjectType==='discussion');expect(JSON.parse(row.snapshot).body).toBe('Who is up for doubles?');expect((await handlePlayers(req('players/moderation/discussion-remove','member','POST',{id:row.id}),staffEnv)).status).toBe(403);
 expect((await handlePlayers(req('players/moderation/discussion-remove','coowner','POST',{id:row.id}),staffEnv)).status).toBe(200);expect((await call('/'+id)).status).toBe(404);expect(db.sqlite.prepare('SELECT snapshot FROM group_discussion_reports').get().snapshot).toContain('Who is up for doubles?');
});
it('cascades account and group deletion without orphaned likes or posts',async()=>{
 const id=await create('member');await comment(id,'second');await call('/'+id+'/like','second','POST',{liked:true});db.sqlite.prepare("DELETE FROM players WHERE id='member'").run();expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_posts').get().n).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_comments').get().n).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_likes').get().n).toBe(0);expect(db.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
});
it('keeps existing photos private until opt-in, and rechecks membership and blocks on each photo read',async()=>{
 let reads=0;const mediaEnv:MediaEnv={...env,PLAY_TOGETHER_MEDIA:{get:async()=>{reads++;return {body:new ReadableStream({start(c){c.close();}})};},put:async()=>{},delete:async()=>{}}};
 db.sqlite.prepare("INSERT INTO media_assets VALUES('player','owner','private-object','version',?)").run(Date.now());
 const photo=(who:string)=>handleMedia(req('media/player/owner',who),mediaEnv);
 expect((await photo('member')).status).toBe(404);expect(reads).toBe(0);
 expect((await handleMedia(req('media/player/owner/visibility','member','POST',{shared:true}),mediaEnv)).status).toBe(404);
 expect((await handleMedia(req('media/player/owner/visibility','owner','POST',{shared:true},'wrong'),mediaEnv)).status).toBe(403);
 expect((await handleMedia(req('media/player/owner/visibility','owner','POST',{shared:true}),mediaEnv)).status).toBe(200);
 const shown=await photo('member');expect(shown.status).toBe(200);expect(shown.headers.get('Cache-Control')).toBe('private, no-store');expect(reads).toBe(1);
 expect((await photo('outsider')).status).toBe(404);expect((await photo('removed')).status).toBe(404);expect((await photo('')).status).toBe(404);
 db.sqlite.prepare("INSERT INTO player_blocks VALUES('member','owner',?)").run(Date.now());expect((await photo('member')).status).toBe(404);expect((await photo('owner')).status).toBe(200);
 await handleMedia(req('media/player/owner/visibility','owner','POST',{shared:false}),mediaEnv);expect((await photo('second')).status).toBe(404);
});
it('returns latest comments chronologically and paginates earlier replies without duplicates',async()=>{
 const id=await create(),base=Date.now()-1000;for(let i=0;i<60;i++)db.sqlite.prepare('INSERT INTO group_discussion_comments(id,post_id,author_id,body,client_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(crypto.randomUUID(),id,'member','Reply '+i,crypto.randomUUID(),base+i,base+i);
 const recent=await(await call('/'+id)).json() as any;expect(recent.comments).toHaveLength(50);expect(recent.comments[0].body).toBe('Reply 10');expect(recent.comments.at(-1).body).toBe('Reply 59');const older=await(await call('/'+id+'?before='+encodeURIComponent(recent.next))).json() as any;expect(older.comments).toHaveLength(10);expect(older.comments[0].body).toBe('Reply 0');expect(older.next).toBeNull();expect(new Set([...older.comments,...recent.comments].map((c:any)=>c.id)).size).toBe(60);
});
it('retains ordinary discussion history but cleans resolved evidence after 90 days unless held',async()=>{
 const id=await create(),report={subjectType:'post',subjectId:id,category:'unsafe',details:'Please review.'};await call('/report','member','POST',report);const row=db.sqlite.prepare('SELECT id FROM group_discussion_reports').get();const staff={...env,MODERATOR_PLAYER_IDS:'coowner'};
 await handlePlayers(req('players/moderation/discussion-hold','coowner','POST',{id:row.id,held:true}),staff);await handlePlayers(req('players/moderation/discussion-review','coowner','POST',{id:row.id}),staff);db.sqlite.prepare('UPDATE group_discussion_reports SET resolved_at=?').run(Date.now()-91*86400000);await cleanupDiscussions(db);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_reports').get().n).toBe(1);await handlePlayers(req('players/moderation/discussion-hold','coowner','POST',{id:row.id,held:false}),staff);await cleanupDiscussions(db);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_reports').get().n).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_posts').get().n).toBe(1);
});
it('shared photos in standalone game chat require current access for both participants',async()=>{
 const id=crypto.randomUUID(),now=Date.now();db.sqlite.prepare("INSERT INTO games(id,organizer_id,visibility,title,court_id,court_name,court_lat,court_lon,court_access,starts_at,ends_at,time_zone,format,capacity,request_id,request_hash,created_at,updated_at) VALUES(?,'owner','public','Friendly doubles','court','Park',38,-77,'public',?,?,'UTC','doubles',4,?,'hash',?,?)").run(id,now+86400000,now+90000000,id,now,now);for(const who of ['owner','outsider'])db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES(?,?,?)').run(id,who,now);db.sqlite.prepare('INSERT OR IGNORE INTO game_chat_rooms(game_id,expires_at) VALUES(?,?)').run(id,now+30*86400000);db.sqlite.prepare("INSERT INTO player_photo_preferences VALUES('owner',1,?)").run(now);db.sqlite.prepare("INSERT INTO media_assets VALUES('player','owner','object','v',?)").run(now);const mediaEnv:MediaEnv={...env,PLAY_TOGETHER_MEDIA:{get:async()=>({body:new ReadableStream({start(c){c.close();}})}),put:async()=>{},delete:async()=>{}}};expect((await handleMedia(req('media/player/owner?gameId='+id,'outsider'),mediaEnv)).status).toBe(200);db.sqlite.prepare("DELETE FROM game_participants WHERE player_id='outsider'").run();expect((await handleMedia(req('media/player/owner?gameId='+id,'outsider'),mediaEnv)).status).toBe(404);
});
it('adds the discussion schema to an existing 31-migration database without changing existing rows',()=>{
 const old=new DB('0031_zz');try{old.sqlite.prepare("INSERT INTO players(id,display_name,created_at,updated_at) VALUES('existing','Existing member',1,1)").run();old.sqlite.prepare("INSERT INTO media_assets VALUES('player','existing','private-avatar','v1',1)").run();old.sqlite.exec(readFileSync('functions/db/migrations/0032_group_discussions.sql','utf8'));expect(old.sqlite.prepare('SELECT display_name FROM players').get().display_name).toBe('Existing member');expect(old.sqlite.prepare('SELECT object_key FROM media_assets').get().object_key).toBe('private-avatar');expect(old.sqlite.prepare('SELECT COUNT(*) AS n FROM player_photo_preferences').get().n).toBe(0);expect(old.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);expect(old.sqlite.prepare('PRAGMA integrity_check').get().integrity_check).toBe('ok');}finally{old.sqlite.close();}
});

it('uses the same sharing choice for discoverable player photos and rechecks search visibility and blocks',async()=>{
 let reads=0;const mediaEnv:MediaEnv={...env,PLAY_TOGETHER_MEDIA:{get:async()=>{reads++;return {body:new ReadableStream({start(c){c.close();}})};},put:async()=>{},delete:async()=>{}}};db.sqlite.prepare("INSERT INTO media_assets VALUES('player','owner','synthetic-object','v',?)").run(Date.now());const photo=(who:string)=>handleMedia(req('media/player/owner',who),mediaEnv);
 db.sqlite.prepare("UPDATE players SET discoverable=1 WHERE id='owner'").run();expect((await photo('outsider')).status).toBe(404);expect(reads).toBe(0);
 expect((await handleMedia(req('media/player/owner/visibility','owner','POST',{shared:true}),mediaEnv)).status).toBe(200);const shown=await photo('outsider');expect(shown.status).toBe(200);expect(shown.headers.get('Cache-Control')).toBe('private, no-store');expect((await photo('')).status).toBe(404);
 db.sqlite.prepare("INSERT INTO player_blocks VALUES('outsider','owner',?)").run(Date.now());expect((await photo('outsider')).status).toBe(404);db.sqlite.prepare('DELETE FROM player_blocks').run();db.sqlite.prepare("INSERT INTO player_blocks VALUES('owner','outsider',?)").run(Date.now());expect((await photo('outsider')).status).toBe(404);db.sqlite.prepare('DELETE FROM player_blocks').run();
 db.sqlite.prepare("UPDATE players SET discoverable=0 WHERE id='owner'").run();expect((await photo('outsider')).status).toBe(404);expect((await photo('member')).status).toBe(200);
 db.sqlite.prepare("UPDATE players SET discoverable=1 WHERE id='owner'").run();await handleMedia(req('media/player/owner/visibility','owner','POST',{shared:false}),mediaEnv);expect((await photo('outsider')).status).toBe(404);expect((await photo('member')).status).toBe(404);expect((await photo('owner')).status).toBe(200);
});
