import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {hashToken,type AuthEnv,type AuthDatabase,type AuthStatement} from '../functions/lib/auth';
import {handleDiscussions,discussionPushTarget,discussionInbox,cleanupDiscussions,announcementInbox,announcementPushTarget} from '../functions/lib/group-discussions';
import {handleGames} from '../functions/lib/games';
import {eventStillVisible} from '../functions/lib/push-delivery';
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
beforeEach(async()=>{db=new DB();env={COURTS_DB:db,AUTH_ORIGIN:origin,PLAY_TOGETHER_ENABLED:'true',OPENAI_API_KEY:'test-key'};const originalFetch=globalThis.fetch;vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>new URL(typeof input==='string'?input:input instanceof URL?input:input.url).hostname==='api.openai.com'?Response.json({results:[{flagged:false}]}):originalFetch(input,init));const now=Date.now();for(const who of ['owner','coowner','organizer','member','second','outsider','removed','pending']){tokens[who]='synthetic-discussion-session-'+who+'-long-enough';db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES(?,?,?,?)').run(who,'Sample '+who,now,now);db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES(?,?,?,?,?,?)').run(who,who,await hashToken(tokens[who]),'csrf',now,now+86400000);}
db.sqlite.prepare("INSERT INTO tennis_groups(id,owner_id,visibility,name,general_location,request_id,created_at,updated_at) VALUES(?,'owner','public','Tennis friends','Fairfax',?,?,?)").run(group,group,now,now);
for(const who of ['owner','coowner','organizer','member','second','removed','pending'])db.sqlite.prepare('INSERT INTO group_memberships(group_id,player_id,role,assigned_role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(group,who,'member',['coowner','organizer'].includes(who)?who:'member',['removed','pending'].includes(who)?who:'active',now,now);
});
afterEach(()=>{db.sqlite.close();vi.restoreAllMocks();vi.unstubAllGlobals();});
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
it('moderates discussion titles, comments and edited content before saving',async()=>{
 const postPayload={title:'Weekend tennis',body:'Who wants to play doubles?',clientId:crypto.randomUUID()};vi.stubGlobal('fetch',async()=>Response.json({results:[{flagged:true}]}));expect((await call('','member','POST',{...postPayload,body:'Abusive post text'})).status).toBe(422);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_posts').get().n).toBe(0);
 vi.stubGlobal('fetch',async()=>Response.json({results:[{flagged:false}]}));const created=await call('','member','POST',postPayload);expect(created.status).toBe(201);const id=(await created.json() as {id:string}).id;
 vi.stubGlobal('fetch',async()=>Response.json({results:[{flagged:true}]}));
 expect((await call('/'+id+'/comment','second','POST',{body:'Clearly abusive reply',clientId:crypto.randomUUID()})).status).toBe(422);
 expect((await call('/'+id+'/edit','member','POST',{title:'Changed',body:'Abusive edited text',version:1})).status).toBe(422);
 expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_comments').get().n).toBe(0);expect(db.sqlite.prepare('SELECT body,version FROM group_discussion_posts WHERE id=?').get(id)).toMatchObject({body:'Who wants to play doubles?',version:1});
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

it('labels current staff authors and comments without assigning staff labels to members',async()=>{
 for(const who of ['owner','coowner','organizer','member']){const id=await create(who);await comment(id,who);const data=await(await call('/'+id)).json() as any;expect(data.post.authorRole).toBe(who==='member'?'member':who);expect(data.comments[0].authorRole).toBe(who==='member'?'member':who);}
});
it('staff posts alert active members once, excluding the author, blocks, pending and removed members',async()=>{
 db.sqlite.prepare("INSERT INTO player_blocks VALUES('second','owner',?)").run(Date.now());const payload={title:'Club update',body:'New group update.',clientId:crypto.randomUUID()};const first=await(await call('','owner','POST',payload)).json() as any;await call('','owner','POST',payload);const notes=db.sqlite.prepare('SELECT * FROM group_discussion_announcements WHERE post_id=?').all(first.id);expect(notes.map((n:any)=>n.recipient_id).sort()).toEqual(['coowner','member','organizer']);expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM notification_events WHERE source='discussion_announcements'").get().n).toBe(3);expect(notes.every((n:any)=>n.recipient_id!==n.actor_id)).toBe(true);
 const before=db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_announcements').get().n;await create('member');expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_announcements').get().n).toBe(before);
 for(const who of ['coowner','organizer']){const id=await create(who);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_announcements WHERE post_id=?').get(id).n).toBeGreaterThan(0);}
});
it('rechecks staff-post notification access, read state, blocks and post deletion at delivery',async()=>{
 const id=await create('owner'),note=db.sqlite.prepare("SELECT * FROM group_discussion_announcements WHERE post_id=? AND recipient_id='member'").get(id);expect(await announcementPushTarget(db,note.id,'member',Date.now())).toMatchObject({groupId:group,postId:id});const inbox=await announcementInbox(db,'member');expect(inbox[0]).toMatchObject({id:'announcement:'+note.id,kind:'discussion_post',postId:id});
 const delivery={source:'discussion_announcements',source_id:note.id,recipient_id:'member',expires_at:Date.now()+100000} as any;expect(await eventStillVisible(db,delivery,Date.now())).toBe(true);expect(delivery.discussionPostId).toBe(id);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='member'").run();expect(await announcementPushTarget(db,note.id,'member',Date.now())).toBeNull();expect(await announcementInbox(db,'member')).toEqual([]);db.sqlite.prepare("UPDATE group_memberships SET status='active' WHERE player_id='member'").run();
 db.sqlite.prepare("INSERT INTO player_blocks VALUES('member','owner',?)").run(Date.now());expect(await eventStillVisible(db,delivery,Date.now())).toBe(false);db.sqlite.prepare("DELETE FROM player_blocks").run();
 const read=await handleGames(req('games/notifications/read','member','POST',{id:'announcement:'+note.id}),env);expect(read.status).toBe(200);expect(await eventStillVisible(db,delivery,Date.now())).toBe(false);await call('/'+id+'/delete','owner','POST',{});expect(await announcementInbox(db,'member')).toEqual([]);
});
it('migration 33 preserves existing posts and does not notify retrospectively',async()=>{
 const old=new DB('0032_zz');try{old.sqlite.prepare("INSERT INTO players(id,display_name,created_at,updated_at) VALUES('existing','Existing',1,1)").run();old.sqlite.prepare("INSERT INTO tennis_groups(id,owner_id,visibility,name,general_location,request_id,created_at,updated_at) VALUES(?,'existing','public','Existing group','Area',?,1,1)").run(group,group);old.sqlite.prepare("INSERT INTO group_discussion_posts VALUES(?,?,'existing','Old','Old post',?,1,1,1,0,NULL)").run(crypto.randomUUID(),group,crypto.randomUUID());old.sqlite.exec(readFileSync('functions/db/migrations/0033_discussion_announcements.sql','utf8'));expect(old.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_posts').get().n).toBe(1);expect(old.sqlite.prepare('SELECT COUNT(*) AS n FROM group_discussion_announcements').get().n).toBe(0);expect(old.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);}finally{old.sqlite.close();}
});

it('staff announcements use the existing account Groups push preference without a new setting',async()=>{
 const now=Date.now()-1000;for(const [who,groups] of [['member',0],['second',1]] as const){db.sqlite.prepare('INSERT INTO notification_preferences(player_id,push_enabled,games,groups,updated_at) VALUES(?,1,1,?,?)').run(who,groups,now);db.sqlite.prepare("INSERT INTO notification_devices(id,player_id,session_id,transport,endpoint_hash,endpoint,p256dh,auth,key_id,created_at,updated_at) VALUES(?,?,?,'webpush',?,'https://push.example.invalid/test','p','a','key',?,?)").run(who,who,who,who,now,now);}await create('organizer');expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM notification_deliveries WHERE device_id='member'").get().n).toBe(0);expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM notification_deliveries WHERE device_id='second'").get().n).toBe(1);expect((await announcementInbox(db,'member')).length).toBe(1);
});
it('uses the same sharing choice for discoverable player photos and rechecks search visibility and blocks',async()=>{
 let reads=0;const mediaEnv:MediaEnv={...env,PLAY_TOGETHER_MEDIA:{get:async()=>{reads++;return {body:new ReadableStream({start(c){c.close();}})};},put:async()=>{},delete:async()=>{}}};db.sqlite.prepare("INSERT INTO media_assets VALUES('player','owner','synthetic-object','v',?)").run(Date.now());const photo=(who:string)=>handleMedia(req('media/player/owner',who),mediaEnv);
 db.sqlite.prepare("UPDATE players SET discoverable=1 WHERE id='owner'").run();expect((await photo('outsider')).status).toBe(404);expect(reads).toBe(0);
 expect((await handleMedia(req('media/player/owner/visibility','owner','POST',{shared:true}),mediaEnv)).status).toBe(200);const shown=await photo('outsider');expect(shown.status).toBe(200);expect(shown.headers.get('Cache-Control')).toBe('private, no-store');expect((await photo('')).status).toBe(404);
 db.sqlite.prepare("INSERT INTO player_blocks VALUES('outsider','owner',?)").run(Date.now());expect((await photo('outsider')).status).toBe(404);db.sqlite.prepare('DELETE FROM player_blocks').run();db.sqlite.prepare("INSERT INTO player_blocks VALUES('owner','outsider',?)").run(Date.now());expect((await photo('outsider')).status).toBe(404);db.sqlite.prepare('DELETE FROM player_blocks').run();
 db.sqlite.prepare("UPDATE players SET discoverable=0 WHERE id='owner'").run();expect((await photo('outsider')).status).toBe(404);expect((await photo('member')).status).toBe(200);
 db.sqlite.prepare("UPDATE players SET discoverable=1 WHERE id='owner'").run();await handleMedia(req('media/player/owner/visibility','owner','POST',{shared:false}),mediaEnv);expect((await photo('outsider')).status).toBe(404);expect((await photo('member')).status).toBe(404);expect((await photo('owner')).status).toBe(200);

});

it('requires a saved photo before enabling sharing, while allowing sharing to be turned off',async()=>{
 const visibility=(method='GET',body?:unknown)=>handleMedia(req('media/player/owner/visibility','owner',method,body),env);expect(await(await visibility()).json()).toEqual({shared:false,hasPhoto:false});const denied=await visibility('POST',{shared:true});expect(denied.status).toBe(409);expect(await denied.json()).toMatchObject({code:'photo_required'});expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM player_photo_preferences WHERE player_id='owner'").get().n).toBe(0);expect((await visibility('POST',{shared:false})).status).toBe(200);
 db.sqlite.prepare("INSERT INTO media_assets VALUES('player','owner','saved-object','v',?)").run(Date.now());expect((await visibility('POST',{shared:true})).status).toBe(200);expect(await(await visibility()).json()).toEqual({shared:true,hasPhoto:true});
});
it('removing a profile photo clears its sharing preference atomically',async()=>{
 const now=Date.now();db.sqlite.prepare("INSERT INTO media_assets VALUES('player','owner','saved-object','v',?)").run(now);db.sqlite.prepare("INSERT INTO player_photo_preferences VALUES('owner',1,?)").run(now);const mediaEnv:MediaEnv={...env,MEDIA_UPLOADS_ENABLED:'true',PLAY_TOGETHER_MEDIA:{get:async()=>null,put:async()=>{},delete:async()=>{}},PLAY_TOGETHER_IMAGE_PROCESSOR:{fetch:async()=>new Response('unused')}};const response=await handleMedia(req('media/player/owner','owner','DELETE'),mediaEnv);expect(response.status).toBe(200);expect(db.sqlite.prepare("SELECT shared FROM player_photo_preferences WHERE player_id='owner'").get().shared).toBe(0);expect(await(await handleMedia(req('media/player/owner/visibility','owner'),mediaEnv)).json()).toEqual({shared:false,hasPhoto:false});
});


function nativeDiscussionRead(path='',who='member'){
 return handleDiscussions(new Request(origin+'/api/discussions/'+group+path,{headers:{Origin:origin,Authorization:'Bearer '+tokens[who]}}),env);
}
function seedNativeDiscussionPosts(count:number){
 const now=Date.now(),ids=[];
 for(let i=0;i<count;i++){const id=crypto.randomUUID();ids.push(id);db.sqlite.prepare('INSERT INTO group_discussion_posts(id,group_id,author_id,title,body,client_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(id,group,['owner','coowner','organizer'][i%3],'Post '+i,'Full body '+i,crypto.randomUUID(),now+i,now+i);}
 return ids;
}
it('native discussions list uses member-visible totals, roles and descending cursor pages',async()=>{
 const ids=seedNativeDiscussionPosts(23);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const first=await(await nativeDiscussionRead()).json();expect(first).toMatchObject({available:true,viewerId:'member',canManage:false,total:23});expect(first.posts).toHaveLength(20);expect(first.posts.map((p:any)=>p.id)).toEqual(ids.slice(3).reverse());
 expect(new Set(first.posts.map((p:any)=>p.authorRole))).toEqual(new Set(['owner','coowner','organizer']));
 const earlier=await(await nativeDiscussionRead('?before='+encodeURIComponent(first.next))).json();expect(earlier.posts.map((p:any)=>p.id)).toEqual(ids.slice(0,3).reverse());expect(earlier.next).toBeNull();
 db.sqlite.prepare("INSERT INTO player_blocks(blocker_id,blocked_id,created_at) VALUES ('member','owner',?)").run(Date.now());
 const blocked=await(await nativeDiscussionRead()).json();expect(blocked.total).toBe(15);expect(blocked.posts.every((p:any)=>p.authorId!=='owner')).toBe(true);
 expect((await nativeDiscussionRead('/'+ids[0])).status).toBe(404);
});
it('native discussion reader loads latest fifty replies chronologically and rebuilds earlier history',async()=>{
 const [id]=seedNativeDiscussionPosts(1);const ids=[],now=Date.now();
 for(let i=0;i<105;i++){const cid=crypto.randomUUID();ids.push(cid);db.sqlite.prepare('INSERT INTO group_discussion_comments(id,post_id,author_id,body,client_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(cid,id,'second','Reply '+i,crypto.randomUUID(),now+i,now+i);}
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const latest=await(await nativeDiscussionRead('/'+id)).json();expect(latest.post).toMatchObject({id,body:'Full body 0',commentCount:105});expect(latest.comments.map((c:any)=>c.id)).toEqual(ids.slice(55));
 const earlier=await(await nativeDiscussionRead('/'+id+'?before='+encodeURIComponent(latest.next))).json();expect(earlier.comments.map((c:any)=>c.id)).toEqual(ids.slice(5,55));
 const oldest=await(await nativeDiscussionRead('/'+id+'?before='+encodeURIComponent(earlier.next))).json();expect(oldest.comments.map((c:any)=>c.id)).toEqual(ids.slice(0,5));expect(oldest.next).toBeNull();
 db.sqlite.prepare('DELETE FROM group_discussion_comments WHERE id=?').run(ids[104]);
 const refreshed=await(await nativeDiscussionRead('/'+id)).json();expect(refreshed.post.commentCount).toBe(104);expect(refreshed.comments.some((c:any)=>c.id===ids[104])).toBe(false);
 db.sqlite.prepare("INSERT INTO player_blocks(blocker_id,blocked_id,created_at) VALUES ('second','member',?)").run(Date.now());
 const blocked=await(await nativeDiscussionRead('/'+id)).json();expect(blocked.comments).toEqual([]);expect(blocked.post.commentCount).toBe(0);
});
it('native discussion URLs deny outsiders, pending and removed members, archive and revoked sessions',async()=>{
 const [id]=seedNativeDiscussionPosts(1);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 for(const visibility of ['public','private']){
  db.sqlite.prepare('UPDATE tennis_groups SET visibility=?').run(visibility);
  for(const who of ['outsider','pending','removed'])for(const path of ['', '/'+id]){const r=await nativeDiscussionRead(path,who);expect(r.status).toBe(404);const data=await r.json();expect(data.posts).toBeUndefined();expect(data.total).toBeUndefined();}
 }
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='member'").run();expect((await nativeDiscussionRead('/'+id)).status).toBe(404);
 db.sqlite.prepare("UPDATE group_memberships SET status='active' WHERE player_id='member'").run();db.sqlite.prepare("UPDATE tennis_groups SET status='archived'").run();expect((await nativeDiscussionRead()).status).toBe(404);
 db.sqlite.prepare("UPDATE tennis_groups SET status='active'").run();db.sqlite.prepare("UPDATE auth_sessions SET revoked_at=? WHERE player_id='member'").run(Date.now());expect((await nativeDiscussionRead('/'+id)).status).toBe(401);
});


function nativeDiscussionMutation(path:string,who:string,body:unknown){
 return handleDiscussions(new Request(origin+'/api/discussions/'+group+path,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+tokens[who],'X-CSRF-Token':'csrf','Content-Type':'application/json'},body:JSON.stringify(body)}),env);
}
it('native discussion creation retries keep one post, content and subscription',async()=>{
 db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();const payload={title:'Weekend plans',body:'Who can play?',clientId:crypto.randomUUID()};
 const first=await nativeDiscussionMutation('','member',payload);expect(first.status).toBe(201);const saved=await first.json();
 const retry=await nativeDiscussionMutation('','member',payload);expect(retry.status).toBe(200);expect(await retry.json()).toEqual(saved);
 // Existing server contract returns the original ID; clients must preserve exact retry bytes.
 expect(await(await nativeDiscussionMutation('','member',{...payload,body:'Changed body'})).json()).toEqual(saved);
 expect(db.sqlite.prepare('SELECT body FROM group_discussion_posts WHERE id=?').get(saved.id).body).toBe(payload.body);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM group_discussion_posts WHERE client_id=?').get(payload.clientId).n).toBe(1);
 expect(db.sqlite.prepare("SELECT muted FROM group_discussion_subscriptions WHERE post_id=? AND player_id='member'").get(saved.id).muted).toBe(0);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='member'").run();expect((await nativeDiscussionMutation('','member',payload)).status).toBe(404);
});
it('native discussion replies retry exactly once and recheck locks, blocking and membership',async()=>{
 const [id]=seedNativeDiscussionPosts(1);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();const payload={body:'Saturday works.',clientId:crypto.randomUUID()};
 const first=await nativeDiscussionMutation('/'+id+'/comment','member',payload);expect(first.status).toBe(201);const saved=await first.json();
 expect(await(await nativeDiscussionMutation('/'+id+'/comment','member',payload)).json()).toEqual(saved);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM group_discussion_comments WHERE client_id=?').get(payload.clientId).n).toBe(1);
 expect((await nativeDiscussionMutation('/'+id+'/lock','coowner',{locked:true})).status).toBe(200);
 expect((await nativeDiscussionMutation('/'+id+'/comment','member',payload)).status).toBe(409);
 await nativeDiscussionMutation('/'+id+'/lock','coowner',{locked:false});
 db.sqlite.prepare("INSERT INTO player_blocks(blocker_id,blocked_id,created_at) VALUES ('owner','member',?)").run(Date.now());expect((await nativeDiscussionMutation('/'+id+'/comment','member',payload)).status).toBe(404);
 db.sqlite.prepare('DELETE FROM player_blocks').run();db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='member'").run();expect((await nativeDiscussionMutation('/'+id+'/comment','member',payload)).status).toBe(404);
});
it('native discussion composers enforce UTF16 text and title bounds and bounded posting rates',async()=>{
 const [id]=seedNativeDiscussionPosts(1);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const post=(body:string,title='Title')=>nativeDiscussionMutation('','member',{title,body,clientId:crypto.randomUUID()});
 expect((await post('😀'.repeat(2000),'😀'.repeat(60))).status).toBe(201);
 expect((await post('😀'.repeat(2001))).status).toBe(400);expect((await post('Body','😀'.repeat(61))).status).toBe(400);
 expect((await post(String.fromCharCode(1))).status).toBe(400);
 for(let i=0;i<4;i++)expect((await post('Post '+i)).status).toBe(201);expect((await post('Rate limited')).status).toBe(429);
 const reply=(body:string)=>nativeDiscussionMutation('/'+id+'/comment','second',{body,clientId:crypto.randomUUID()});
 expect((await reply('😀'.repeat(1001))).status).toBe(400);expect((await reply('😀'.repeat(1000))).status).toBe(201);
 for(let i=0;i<9;i++)expect((await reply('Reply '+i)).status).toBe(201);expect((await reply('Rate limited')).status).toBe(409);
 db.sqlite.prepare("UPDATE tennis_groups SET status='archived'").run();expect((await post('Archived')).status).toBe(404);
});

it('native own discussion edits preserve versions and reject stale or foreign edits',async()=>{
 const [id]=seedNativeDiscussionPosts(1);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const edit=(who:string,version:number)=>nativeDiscussionMutation('/'+id+'/edit',who,{title:'Revised',body:'Updated body',version});
 expect((await edit('member',1)).status).toBe(403);expect((await edit('owner',1)).status).toBe(200);expect((await edit('owner',1)).status).toBe(409);
 const page=await(await nativeDiscussionRead('/'+id,'owner')).json();expect(page.post).toMatchObject({version:2,title:'Revised',body:'Updated body'});
 const reply=await(await nativeDiscussionMutation('/'+id+'/comment','member',{body:'Original reply',clientId:crypto.randomUUID()})).json();
 expect((await nativeDiscussionMutation('/'+id+'/edit','member',{commentId:reply.id,body:'Revised reply',version:1})).status).toBe(200);
 expect((await nativeDiscussionMutation('/'+id+'/edit','member',{commentId:reply.id,body:'Stale reply',version:1})).status).toBe(409);
 const refreshed=await(await nativeDiscussionRead('/'+id)).json();expect(refreshed.comments[0]).toMatchObject({body:'Revised reply',version:2});expect(refreshed.post.version).toBe(2);
});
it('native own deletion allows locked reply removal and rechecks membership',async()=>{
 const [id]=seedNativeDiscussionPosts(1);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const reply=await(await nativeDiscussionMutation('/'+id+'/comment','member',{body:'My reply',clientId:crypto.randomUUID()})).json();
 expect((await nativeDiscussionMutation('/'+id+'/lock','coowner',{locked:true})).status).toBe(200);
 expect((await nativeDiscussionMutation('/'+id+'/edit','member',{commentId:reply.id,body:'Locked edit',version:1})).status).toBe(409);
 expect((await nativeDiscussionMutation('/'+id+'/delete','second',{commentId:reply.id})).status).toBe(403);
 expect((await nativeDiscussionMutation('/'+id+'/delete','member',{commentId:reply.id})).status).toBe(200);
 expect((await nativeDiscussionRead('/'+id)).status).toBe(200);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='owner'").run();expect((await nativeDiscussionMutation('/'+id+'/delete','owner',{})).status).toBe(404);
 db.sqlite.prepare("UPDATE group_memberships SET status='active' WHERE player_id='owner'").run();expect((await nativeDiscussionMutation('/'+id+'/delete','owner',{})).status).toBe(200);
 expect((await nativeDiscussionRead('/'+id)).status).toBe(404);
});

it('native explicit likes are idempotent for posts and replies and reject locked changes',async()=>{
 const [id]=seedNativeDiscussionPosts(1);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const reply=await(await nativeDiscussionMutation('/'+id+'/comment','member',{body:'Reply',clientId:crypto.randomUUID()})).json();
 for(const commentId of [undefined,reply.id]){
  const like=(liked:boolean)=>nativeDiscussionMutation('/'+id+'/like','second',{liked,commentId});
  expect((await like(true)).status).toBe(200);expect((await like(true)).status).toBe(200);
  expect(db.sqlite.prepare("SELECT COUNT(*) n FROM group_discussion_likes WHERE post_id=? AND comment_id=? AND player_id='second'").get(id,commentId??'').n).toBe(1);
  expect((await like(false)).status).toBe(200);expect((await like(false)).status).toBe(200);
  expect(db.sqlite.prepare("SELECT COUNT(*) n FROM group_discussion_likes WHERE post_id=? AND comment_id=? AND player_id='second'").get(id,commentId??'').n).toBe(0);
 }
 await nativeDiscussionMutation('/'+id+'/lock','owner',{locked:true});
 for(const liked of [true,false])expect((await nativeDiscussionMutation('/'+id+'/like','second',{liked})).status).toBe(409);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='second'").run();expect((await nativeDiscussionMutation('/'+id+'/like','second',{liked:true})).status).toBe(404);
});
it('native following maps explicit mute states and remains available on locked threads',async()=>{
 const [id]=seedNativeDiscussionPosts(1);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 expect((await(await nativeDiscussionRead('/'+id)).json()).post.muted).toBe(1);
 for(const muted of [false,false,true,true]){
  expect((await nativeDiscussionMutation('/'+id+'/mute','member',{muted})).status).toBe(200);
  expect((await(await nativeDiscussionRead('/'+id)).json()).post.muted).toBe(muted?1:0);
 }
 // First reply follows by default; replying again never overrides an explicit mute.
 expect((await nativeDiscussionMutation('/'+id+'/comment','second',{body:'Following by replying',clientId:crypto.randomUUID()})).status).toBe(201);
 expect((await(await nativeDiscussionRead('/'+id,'second')).json()).post.muted).toBe(0);
 expect((await nativeDiscussionMutation('/'+id+'/comment','member',{body:'Keep muted',clientId:crypto.randomUUID()})).status).toBe(201);
 expect((await(await nativeDiscussionRead('/'+id)).json()).post.muted).toBe(1);
 await nativeDiscussionMutation('/'+id+'/lock','owner',{locked:true});expect((await nativeDiscussionMutation('/'+id+'/mute','member',{muted:false})).status).toBe(200);
 db.sqlite.prepare("INSERT INTO player_blocks(blocker_id,blocked_id,created_at) VALUES ('owner','member',?)").run(Date.now());
 expect((await nativeDiscussionMutation('/'+id+'/mute','member',{muted:true})).status).toBe(404);
});

it('native managers lock threads and delete foreign replies while organizers cannot',async()=>{
 const [id]=seedNativeDiscussionPosts(1);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const reply=await(await nativeDiscussionMutation('/'+id+'/comment','member',{body:'Review this reply',clientId:crypto.randomUUID()})).json();
 for(const who of ['organizer','member']){
  expect((await nativeDiscussionMutation('/'+id+'/lock',who,{locked:true})).status).toBe(403);
  expect((await nativeDiscussionMutation('/'+id+'/delete',who,{commentId:reply.id})).status).toBe(who==='member'?200:403);
 }
 const other=await(await nativeDiscussionMutation('/'+id+'/comment','second',{body:'Other reply',clientId:crypto.randomUUID()})).json();
 expect((await nativeDiscussionMutation('/'+id+'/lock','coowner',{locked:true})).status).toBe(200);
 expect((await(await nativeDiscussionRead('/'+id,'coowner')).json()).post).toMatchObject({locked:1,version:2});
 expect((await nativeDiscussionMutation('/'+id+'/edit','coowner',{body:'Not my content',version:1,commentId:other.id})).status).toBe(403);
 expect((await nativeDiscussionMutation('/'+id+'/delete','coowner',{commentId:other.id})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT actor_id FROM group_discussion_actions WHERE content_id=? AND action='delete_comment'").get(other.id).actor_id).toBe('coowner');
 expect((await nativeDiscussionMutation('/'+id+'/lock','owner',{locked:false})).status).toBe(200);
 expect((await(await nativeDiscussionRead('/'+id)).json()).post).toMatchObject({locked:0,version:3});
 expect((await nativeDiscussionMutation('/'+id+'/delete','coowner',{})).status).toBe(200);
 expect(db.sqlite.prepare("SELECT actor_id FROM group_discussion_actions WHERE content_id=? AND action='delete_post'").get(id).actor_id).toBe('coowner');
 expect((await nativeDiscussionRead('/'+id)).status).toBe(404);
});
it('native discussion management rechecks demotion, blocking and archive',async()=>{
 const [id]=seedNativeDiscussionPosts(1);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 db.sqlite.prepare("UPDATE group_memberships SET assigned_role='member' WHERE player_id='coowner'").run();
 expect((await nativeDiscussionMutation('/'+id+'/lock','coowner',{locked:true})).status).toBe(403);
 expect((await nativeDiscussionMutation('/'+id+'/delete','coowner',{})).status).toBe(403);
 db.sqlite.prepare("UPDATE group_memberships SET assigned_role='coowner' WHERE player_id='coowner'").run();
 db.sqlite.prepare("INSERT INTO player_blocks(blocker_id,blocked_id,created_at) VALUES ('owner','coowner',?)").run(Date.now());
 expect((await nativeDiscussionMutation('/'+id+'/delete','coowner',{})).status).toBe(404);
 db.sqlite.prepare('DELETE FROM player_blocks').run();db.sqlite.prepare("UPDATE tennis_groups SET status='archived'").run();
 expect((await nativeDiscussionMutation('/'+id+'/lock','coowner',{locked:true})).status).toBe(404);
 expect((await nativeDiscussionMutation('/'+id+'/delete','coowner',{})).status).toBe(404);
});

it('native discussion reports snapshot post/reply evidence and reject duplicate or own reports',async()=>{
 const [id]=seedNativeDiscussionPosts(1);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const reply=await(await nativeDiscussionMutation('/'+id+'/comment','second',{body:'Reply evidence',clientId:crypto.randomUUID()})).json();
 for(const [subjectType,subjectId] of [['post',id],['comment',reply.id]]){
  const body={subjectType,subjectId,category:'harassment',details:'Explanation for site moderators.'};
  expect((await nativeDiscussionMutation('/report','member',body)).status).toBe(201);
  expect((await nativeDiscussionMutation('/report','member',body)).status).toBe(429);
  const saved=db.sqlite.prepare('SELECT * FROM group_discussion_reports WHERE content_id=?').get(subjectId);
  expect(saved.reporter_id).toBe('member');expect(JSON.parse(saved.snapshot).body).toBe(subjectType==='post'?'Full body 0':'Reply evidence');
  expect((await nativeDiscussionMutation('/report',subjectType==='post'?'owner':'second',body)).status).toBe(404);
 }
 await nativeDiscussionMutation('/'+id+'/delete','owner',{});
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM group_discussion_reports').get().n).toBe(2);
});
it('native reporting validates explanations, rates and live access even on locked threads',async()=>{
 const ids=seedNativeDiscussionPosts(6);db.sqlite.prepare("UPDATE auth_sessions SET client_type='ios'").run();
 const report=(subjectId:string,details:string)=>nativeDiscussionMutation('/report','member',{subjectType:'post',subjectId,category:'other',details});
 for(const details of ['',String.fromCharCode(1),'😀'.repeat(501)])expect((await report(ids[0],details)).status).toBe(400);
 await nativeDiscussionMutation('/'+ids[0]+'/lock','owner',{locked:true});expect((await report(ids[0],'😀'.repeat(500))).status).toBe(201);
 for(const id of ids.slice(1,5))expect((await report(id,'Required explanation')).status).toBe(201);
 expect((await report(ids[5],'Rate limited')).status).toBe(429);
 db.sqlite.prepare("UPDATE group_memberships SET status='removed' WHERE player_id='member'").run();expect((await report(ids[5],'Removed')).status).toBe(404);
 db.sqlite.prepare("UPDATE group_memberships SET status='active' WHERE player_id='member'").run();
 db.sqlite.prepare("INSERT INTO player_blocks(blocker_id,blocked_id,created_at) VALUES ('owner','member',?)").run(Date.now());expect((await report(ids[0],'Blocked')).status).toBe(404);
});
