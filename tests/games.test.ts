import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {SignJWT} from 'jose';
import {hashToken,type AuthDatabase,type AuthStatement} from '../functions/lib/auth';
import {handleGames,courtSelectionToken,type GamesEnv} from '../functions/lib/games';
import {gameStart} from '../functions/lib/game-time';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite');
class LocalDatabase implements AuthDatabase{
  sqlite=new DatabaseSync(':memory:');
  constructor(){this.sqlite.exec('PRAGMA foreign_keys=ON');for(const file of ['0001_create_tennis_courts.sql','0002_player_auth.sql','0003_public_games.sql','0004_game_participation.sql','0005_game_cancellations.sql','0006_host_notifications.sql','0007_request_notifications.sql','0008_player_notifications.sql','0009_tennis_groups.sql','0010_group_notifications.sql','0011_group_roles.sql','0014_group_games.sql','0015_group_game_lifecycle.sql','0016_game_guests.sql','0017_sharing_safety.sql','0018_player_game_invitations.sql','0019_multi_court_events.sql','0020_weekly_game_series.sql','0021_group_game_waitlist.sql','0022_public_group_events.sql','0023_series_management.sql'])this.sqlite.exec(readFileSync(`functions/db/migrations/${file}`,'utf8'));}
  prepare(sql:string):AuthStatement{let values:any[]=[];const statement:AuthStatement={bind(...args){values=args;return statement;},first:async<T>()=>(this.sqlite.prepare(sql).get(...values)??null) as T|null,all:async<T>()=>({results:this.sqlite.prepare(sql).all(...values) as T[]}),run:async()=>({meta:{changes:Number(this.sqlite.prepare(sql).run(...values).changes)}})};return statement;}
  async batch(statements:AuthStatement[]){this.sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());this.sqlite.exec('COMMIT');return results;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const origin='http://127.0.0.1:8788',token='local-session-token-with-at-least-32-characters',csrf='test-csrf';
const headers={Cookie:`oc_session=${token}`,'X-CSRF-Token':csrf};
const now=Date.UTC(2026,0,10);
const court={id:'osm-way-40881080',name:'Public Court',lat:48.84528395,lon:2.1901775,access:'public' as const};
let db:LocalDatabase,env:GamesEnv;
beforeEach(async()=>{
  vi.spyOn(Date,'now').mockReturnValue(now);db=new LocalDatabase();env={COURTS_DB:db,PLAY_TOGETHER_ENABLED:'true',AUTH_ORIGIN:origin};
  await db.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').bind('player-1','Tennis Friend',now,now).run();
  await db.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').bind('session-1','player-1',await hashToken(token),csrf,now,now+86400_000).run();
});
afterEach(()=>{db.sqlite.close();vi.restoreAllMocks();});
function req(path='',method='GET',body?:unknown,custom:Record<string,string>={}){return new Request(`${origin}/api/games${path}`,{method,headers:{Origin:origin,'Content-Type':'application/json',...headers,...custom},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function body(overrides:Record<string,unknown>={}){return{title:'Saturday doubles',courtToken:await courtSelectionToken(court,'player-1',env,origin),startLocal:'2026-02-14T10:00',timeZone:'Europe/Paris',durationMinutes:60,format:'doubles',capacity:4,skillPreference:'any',notes:'Bring tennis balls.',requestId:crypto.randomUUID(),acknowledgeNoReservation:true,confirmAccess:true,...overrides};}
async function create(overrides:Record<string,unknown>={}){const response=await handleGames(req('','POST',await body(overrides)),env);return {response,data:await response.json()};}
async function insertGame(overrides:Record<string,unknown>={}){
  const {response,data}=await create({...overrides.format?{format:overrides.format}:{},...overrides.capacity?{capacity:overrides.capacity}:{}});expect(response.status,JSON.stringify(data)).toBe(201);
  // Fixtures represent games created earlier, not a burst of user submissions.
  db.sqlite.prepare('UPDATE games SET created_at=? WHERE id=?').run(now-120_000,data.game.id);
  const entries=Object.entries(overrides);for(const [key] of entries)if(!['visibility','group_id','status','starts_at','ends_at','court_lat','court_lon','skill_preference','format','capacity'].includes(key))throw new Error('Unsafe fixture field');
  if(entries.length)await db.prepare('UPDATE games SET '+entries.map(([k])=>(k==='capacity'?'event_capacity':k)+'=?').join(',')+' WHERE id=?').bind(...entries.map(([,v])=>v),data.game.id).run();
  return data.game.id as string;
}
describe('public game lifecycle and privacy',()=>{
  it('accepts an explicit manual location snapshot without a catalog write or signing token',async()=>{
    const input=await body();delete (input as any).courtToken;
    const response=await handleGames(req('','POST',{...input,manualCourt:{name:'Franklin Glen Park',address:'Fairfax, VA 22033',lat:38.87,lon:-77.38}}),env);
    expect(response.status).toBe(201);const data=await response.json();expect(data.game.court).toMatchObject({name:'Franklin Glen Park - Fairfax, VA 22033',access:'unknown',lat:38.87});
    expect(db.sqlite.prepare('SELECT COUNT(*) AS count FROM tennis_courts').get()).toMatchObject({count:0});
  });
  it('rejects ambiguous, invalid and unacknowledged manual court locations',async()=>{
    for(const c of [{name:'Park',address:'Fairfax',lat:91,lon:0},{name:'',address:'Fairfax',lat:38,lon:-77},{name:'Park',address:'Fairfax',lat:'38',lon:-77}]){
      const input=await body();delete (input as any).courtToken;expect((await handleGames(req('','POST',{...input,manualCourt:c}),env)).status).toBe(400);
    }
    const c={name:'Park',address:'Fairfax',lat:38,lon:-77};
    expect((await create({manualCourt:c})).response.status).toBe(400);
    const input=await body();delete (input as any).courtToken;expect((await handleGames(req('','POST',{...input,manualCourt:c,confirmAccess:false}),env)).status).toBe(400);
  });
  it('creates a public game with a validated snapshot and organizer occupying exactly one slot',async()=>{
    const {response,data}=await create();expect(response.status,JSON.stringify(data)).toBe(201);expect(data.game).toMatchObject({title:'Saturday doubles',playerCount:1,capacity:4,organizer:{displayName:'Tennis Friend'},startsAt:'2026-02-14T09:00:00.000Z'});
    expect(db.sqlite.prepare('SELECT visibility,request_hash FROM games').get()).toMatchObject({visibility:'public'});
    expect(db.sqlite.prepare('SELECT COUNT(*) AS count FROM game_participants').get()).toMatchObject({count:1});
    const detail=await handleGames(req(`/${data.game.id}`),env);expect(detail.status).toBe(200);expect((await detail.json()).game.notes).toBe('Bring tennis balls.');
  });
  it('requires an active signed-in account, exact Origin, CSRF and completed display name',async()=>{
    const input=await body();
    for(const [custom,status]of [[{Cookie:''},401],[{Origin:'https://attacker.invalid'},403],[{'X-CSRF-Token':'wrong'},403]] as const)expect((await handleGames(req('','POST',input,custom),env)).status).toBe(status);
    db.sqlite.exec("UPDATE players SET display_name=''");expect((await handleGames(req('','POST',input),env)).status).toBe(403);
  });
  it('rejects expired/revoked sessions and production environments',async()=>{
    const input=await body();db.sqlite.exec('UPDATE auth_sessions SET revoked_at=1');expect((await handleGames(req('','POST',input),env)).status).toBe(401);
    expect((await handleGames(req(),{...env,CF_PAGES_BRANCH:'main'})).status).toBe(404);
    expect((await handleGames(req(),{...env,PLAY_TOGETHER_ENABLED:undefined})).status).toBe(404);
    const prod='https://opencourts.us';expect((await handleGames(new Request(`${prod}/api/games`),{...env,AUTH_ORIGIN:prod})).status).toBe(404);
  });
  it('is idempotent on retried submission and rejects conflicting reuse',async()=>{
    const input=await body();const a=await handleGames(req('','POST',input),env),first=await a.json();
    const b=await handleGames(req('','POST',input),env);expect(b.status).toBe(200);expect((await b.json()).game.id).toBe(first.game.id);
    expect((await handleGames(req('','POST',{...input,title:'Different title'}),env)).status).toBe(409);
    expect(db.sqlite.prepare('SELECT COUNT(*) AS count FROM games').get()).toMatchObject({count:1});
  });
  it('rejects private visibility, injected organizer IDs and invalid game data',async()=>{
    for(const patch of [{visibility:'group'},{organizerId:'another-player'},{capacity:129},{format:'triples'},{durationMinutes:23},{skillPreference:'expert'},{title:''},{startLocal:'2026-01-01T10:00'},{acknowledgeNoReservation:false},{requestId:'bad'}])expect((await create(patch)).response.status,JSON.stringify(patch)).toBe(400);
  });
  it('rejects forged, expired, wrong-origin and other-player court tokens',async()=>{
    const foreign=await courtSelectionToken(court,'another-player',env,origin);
    const wrongOrigin=await courtSelectionToken(court,'player-1',env,'http://localhost:8788');
    const key=new TextEncoder().encode(await hashToken('court-selection-v1:localhost-development-only'));
    const expired=await new SignJWT({court,kind:'court-selection'}).setProtectedHeader({alg:'HS256'}).setIssuer(origin).setAudience('opencourts-game-court').setSubject('player-1').setIssuedAt(1).setExpirationTime(2).sign(key);
    for(const value of ['made-up-token',foreign,wrongOrigin,expired])expect((await create({courtToken:value})).response.status).toBe(400);
  });
  it('requires a separate access acknowledgement for unknown-access courts',async()=>{
    const unknown=await courtSelectionToken({...court,access:'unknown'},'player-1',env,origin);
    expect((await create({courtToken:unknown,confirmAccess:false})).response.status).toBe(400);
    expect((await create({courtToken:unknown,confirmAccess:true})).response.status).toBe(201);
  });
  it('never exposes group-only/unlisted game content or private identity fields through public endpoints',async()=>{
    const publicId=await insertGame();const secret=await insertGame();db.sqlite.prepare("UPDATE games SET visibility='group',group_id='private-group',title='PRIVATE-SENTINEL' WHERE id=?").run(secret);
    const unlisted=await insertGame({visibility:'unlisted'});
    const r=await handleGames(req(),env);const text=await r.text();expect(text).toContain(publicId);for(const value of ['PRIVATE-SENTINEL','private-group',secret,unlisted,'request_hash','request_id','token_hash','session-1','player-1'])expect(text).not.toContain(value);
    expect((await handleGames(req(`/${secret}`),env)).status).toBe(404);expect((await handleGames(req(`/${unlisted}`,'GET',undefined,{Cookie:''}),env)).status).toBe(404);
    expect(r.headers.get('cache-control')).toBe('private, no-store');expect(r.headers.has('access-control-allow-origin')).toBe(false);
  });
  it('excludes past/cancelled/disabled-organizer games and applies date, skill and exact-distance filters',async()=>{
    const near=await insertGame({skill_preference:'intermediate'});
    await insertGame({status:'cancelled'});await insertGame({starts_at:now-3600_000,ends_at:now+3600_000});await insertGame({court_lon:15});
    const result=await(await handleGames(req('?lat=48.8453&lon=2.1902&radius=5&skill=intermediate'),env)).json();expect(result.games.map((g:any)=>g.id)).toEqual([near]);
    expect((await(await handleGames(req('?from=2026-03-01T00:00:00Z&to=2026-03-02T00:00:00Z'),env)).json()).games).toEqual([]);
    db.sqlite.exec("UPDATE players SET status='disabled'");expect((await(await handleGames(req(),env)).json()).games).toEqual([]);
  });
  it('paginates public games without duplicates or leaking hidden records in the cursor',async()=>{
    const ids=[];for(let i=0;i<28;i++)ids.push(await insertGame());
    const first=await(await handleGames(req(),env)).json();expect(first.games).toHaveLength(25);expect(first.nextCursor).toBeTruthy();
    const second=await(await handleGames(req(`?cursor=${encodeURIComponent(first.nextCursor)}`),env)).json();expect(second.games).toHaveLength(3);expect(new Set([...first.games,...second.games].map((g:any)=>g.id)).size).toBe(28);expect(second.nextCursor).toBeNull();
    expect((await handleGames(req('?cursor=bad'),env)).status).toBe(400);
  });
  it('enforces participant uniqueness and capacity in the database with idempotent organizer joining',async()=>{
    const {response,data}=await create({format:'singles',capacity:2});expect(response.status).toBe(201);const id=data.game.id;
    for(const p of ['p2','p3'])db.sqlite.prepare('INSERT INTO players(id,created_at,updated_at) VALUES (?,?,?)').run(p,now,now);
    db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,'p2',now);
    expect(()=>db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,'p3',now)).toThrow();
    expect(()=>db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,'player-1',now)).toThrow();
    expect((await handleGames(req(`/${id}/join`,'POST',{}),env)).status).toBe(409);
  });
  it('account deletion cascades organized public games and participant records',async()=>{
    await insertGame();db.sqlite.exec("DELETE FROM players WHERE id='player-1'");
    for(const table of ['games','game_participants'])expect(db.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).toMatchObject({count:0});
  });
  it('rate limits rapid creation without charging or imposing a permanent organizer quota',async()=>{
    for(let i=0;i<10;i++)expect((await create()).response.status).toBe(201);
    expect((await create()).response.status).toBe(429);
    db.sqlite.exec(`UPDATE games SET created_at=${now-120_000}`);
    expect((await create()).response.status).toBe(201);
  });
});
describe('court picker and wall-clock time conversion',()=>{
  it('reuses court results, excludes restricted locations, and signs bounded snapshots',async()=>{
    const lookup=vi.fn(async()=>[{type:'way',id:40881080,lat:court.lat,lon:court.lon,tags:{name:'Mapped public court',access:'yes'}},{type:'way',id:2,lat:48.84,lon:2.19,tags:{name:'Private',access:'private'}},{type:'way',id:3,lat:48.84,lon:2.19,tags:{name:'Fee',fee:'yes'}},{type:'way',id:4,lat:48.84,lon:2.19,tags:{name:'Check access'}}]);
    const r=await handleGames(req('/courts?lat=48.8453&lon=2.1902'),env,lookup);const data=await r.json();expect(r.status).toBe(200);expect(data.courts).toHaveLength(2);expect(data.courts.every((c:any)=>c.selectionToken)).toBe(true);expect(lookup).toHaveBeenCalledOnce();
    expect((await handleGames(req('/courts?lat=48&lon=2','GET',undefined,{Cookie:''}),env,lookup)).status).toBe(401);
  });
  it('handles time zones and rejects nonexistent or ambiguous DST times',()=>{
    expect(gameStart('2026-02-14T10:00','Europe/Paris',now).startsAt).toBe(Date.UTC(2026,1,14,9));
    expect(()=>gameStart('2026-03-08T02:30','America/New_York',now)).toThrow(/does not exist/);
    expect(()=>gameStart('2026-11-01T01:30','America/New_York',Date.UTC(2026,9,1))).toThrow(/occurs twice/);
    expect(()=>gameStart('2026-02-30T10:00','UTC',now)).toThrow(/calendar/);
    expect(()=>gameStart('2026-02-14T10:00','Made/Up',now)).toThrow(/IANA/);
  });
});

async function otherPlayer(id:string){const otherToken='test-session-'+id+'-with-at-least-32-characters';db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run(id,'Player '+id,now,now);db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run('session-'+id,id,await hashToken(otherToken),csrf,now,now+86400_000);return {Cookie:'oc_session='+otherToken};}
describe('Phase 3 public participation',()=>{
 it('requires approval for public games and deduplicates requests',async()=>{const id=await insertGame();const h=await otherPlayer('guest');for(let i=0;i<2;i++)expect((await handleGames(req('/'+id+'/join','POST',{},h),env)).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_join_requests').get().n).toBe(1);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_participants').get().n).toBe(1);expect((await create({joinPolicy:'instant'})).response.status).toBe(400);});
 it('allows only the organizer to approve and keeps participant lists private',async()=>{const id=await insertGame();const h=await otherPlayer('guest');await handleGames(req('/'+id+'/join','POST',{},h),env);for(const suffix of ['participants','requests'])expect((await handleGames(req('/'+id+'/'+suffix,'GET',undefined,h),env)).status).toBe(403);expect((await handleGames(req('/'+id+'/approve','POST',{playerId:'guest'},h),env)).status).toBe(403);expect((await handleGames(req('/'+id+'/approve','POST',{playerId:'guest'}),env)).status).toBe(200);const state=await(await handleGames(req('/'+id+'/participation','GET',undefined,h),env)).json();expect(state.joined).toBe(true);expect(state.requestStatus).toBe('approved');expect(JSON.stringify(await(await handleGames(req('/'+id+'/participants'),env)).json())).not.toMatch(/email|token_hash|csrf/);});
 it('approves only pending requests and rejects overbooking atomically',async()=>{const id=await insertGame({format:'singles',capacity:2});for(const name of ['a','b']){const h=await otherPlayer(name);await handleGames(req('/'+id+'/join','POST',{},h),env);}expect((await handleGames(req('/'+id+'/approve','POST',{playerId:'a'}),env)).status).toBe(200);expect((await handleGames(req('/'+id+'/approve','POST',{playerId:'b'}),env)).status).toBe(409);expect(db.sqlite.prepare('SELECT status FROM game_join_requests WHERE player_id=?').get('b').status).toBe('pending');expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_participants').get().n).toBe(2);});
 it('withdraws pending requests and permits confirmed players to leave',async()=>{const id=await insertGame();const h=await otherPlayer('guest');await handleGames(req('/'+id+'/join','POST',{},h),env);await handleGames(req('/'+id+'/leave','POST',{},h),env);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_join_requests').get().n).toBe(0);await handleGames(req('/'+id+'/join','POST',{},h),env);await handleGames(req('/'+id+'/approve','POST',{playerId:'guest'}),env);await handleGames(req('/'+id+'/leave','POST',{},h),env);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_participants').get().n).toBe(1);expect((await handleGames(req('/'+id+'/leave','POST',{}),env)).status).toBe(409);});
 it('removal and rejection prevent joining again',async()=>{const id=await insertGame();const h=await otherPlayer('guest');await handleGames(req('/'+id+'/join','POST',{},h),env);await handleGames(req('/'+id+'/approve','POST',{playerId:'guest'}),env);await handleGames(req('/'+id+'/remove','POST',{playerId:'guest'}),env);expect((await handleGames(req('/'+id+'/join','POST',{},h),env)).status).toBe(403);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_participants').get().n).toBe(1);});
 it('cancellation closes requests and removes games from discovery',async()=>{const id=await insertGame();const h=await otherPlayer('guest');expect((await handleGames(req('/'+id+'/cancel','POST',{},h),env)).status).toBe(403);await handleGames(req('/'+id+'/cancel','POST',{}),env);expect((await handleGames(req('/'+id+'/join','POST',{},h),env)).status).toBe(409);expect((await(await handleGames(req(),env)).json()).games).toHaveLength(0);});
 it('My Games is own-account scoped and excludes private games',async()=>{const id=await insertGame();await insertGame({visibility:'group',group_id:'private'});const h=await otherPlayer('guest');expect((await(await handleGames(req('/mine','GET',undefined,h),env)).json()).games).toHaveLength(0);await handleGames(req('/'+id+'/join','POST',{},h),env);const data=await(await handleGames(req('/mine','GET',undefined,h),env)).json();expect(data.games).toHaveLength(1);expect(data.games[0]).toMatchObject({id,isOrganizer:false,request_status:'pending'});expect(JSON.stringify(data)).not.toContain('organizer_id');});
 it('checks CSRF, session, visibility and concurrent organizer edits',async()=>{const id=await insertGame();const h=await otherPlayer('guest');expect((await handleGames(req('/'+id+'/join','POST',{}, {...h,'X-CSRF-Token':'bad'}),env)).status).toBe(403);const privateId=await insertGame({visibility:'group',group_id:'private'});expect((await handleGames(req('/'+privateId+'/join','POST',{},h),env)).status).toBe(404);expect((await handleGames(req('/'+id+'/edit','POST',{title:'Updated',notes:'New notes',version:1}),env)).status).toBe(200);expect((await handleGames(req('/'+id+'/edit','POST',{title:'Old edit',notes:'',version:1}),env)).status).toBe(409);expect((await handleGames(req('/'+id+'/edit','POST',{title:'Bad',notes:'',version:2},h),env)).status).toBe(403);});
});

it('stores optional approved-player cancellation reasons privately and frees capacity',async()=>{
 const id=await insertGame();const h=await otherPlayer('guest');await handleGames(req('/'+id+'/join','POST',{},h),env);await handleGames(req('/'+id+'/approve','POST',{playerId:'guest'}),env);
 expect((await handleGames(req('/'+id+'/leave','POST',{reason:'Schedule changed'},h),env)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_participants').get().n).toBe(1);
 expect((await handleGames(req('/'+id+'/cancellations','GET',undefined,h),env)).status).toBe(403);
 expect((await(await handleGames(req('/'+id+'/cancellations'),env)).json()).players[0].reason).toBe('Schedule changed');
 expect(JSON.stringify(await(await handleGames(req('/'+id),env)).json())).not.toContain('Schedule changed');
});

it('notifies only the host on withdrawal/cancellation and deduplicates leave retries',async()=>{
 const id=await insertGame();const h=await otherPlayer('guest');await handleGames(req('/'+id+'/join','POST',{},h),env);await handleGames(req('/'+id+'/leave','POST',{},h),env);await handleGames(req('/'+id+'/leave','POST',{},h),env);
 let inbox=await(await handleGames(req('/notifications'),env)).json();expect(inbox.notifications.filter((n:any)=>n.kind==='withdrawn')).toHaveLength(1);expect(inbox.notifications.find((n:any)=>n.kind==='withdrawn')).toMatchObject({kind:'withdrawn',placesReleased:0,gameId:id});
 expect((await(await handleGames(req('/notifications','GET',undefined,h),env)).json()).notifications.filter((n:any)=>['withdrawn','cancelled','requested'].includes(n.kind))).toHaveLength(0);
 await handleGames(req('/'+id+'/join','POST',{},h),env);await handleGames(req('/'+id+'/approve','POST',{playerId:'guest'}),env);await handleGames(req('/'+id+'/leave','POST',{reason:'Cannot make it'},h),env);
 inbox=await(await handleGames(req('/notifications'),env)).json();expect(inbox.notifications.filter((n:any)=>n.kind==='cancelled')).toHaveLength(1);const note=inbox.notifications.find((n:any)=>n.kind==='cancelled');expect(note).toMatchObject({reason:'Cannot make it',placesReleased:1,readAt:null});
 await handleGames(req('/notifications/read','POST',{id:note.id},h),env);expect(db.sqlite.prepare('SELECT read_at FROM game_notifications WHERE id=?').get(note.id).read_at).toBeNull();await handleGames(req('/notifications/read','POST',{id:note.id}),env);expect(db.sqlite.prepare('SELECT read_at FROM game_notifications WHERE id=?').get(note.id).read_at).toBe(now);
});

it('rejects organizer self-requests and notifies only once for a new player request',async()=>{const id=await insertGame();expect((await handleGames(req('/'+id+'/join','POST',{}),env)).status).toBe(409);const h=await otherPlayer('guest');for(let i=0;i<2;i++)await handleGames(req('/'+id+'/join','POST',{},h),env);const inbox=await(await handleGames(req('/notifications'),env)).json();expect(inbox.notifications).toHaveLength(1);expect(inbox.notifications[0].kind).toBe('requested');});

it('privately notifies requesters of approvals, removals and cancellations without retry duplicates',async()=>{
 const id=await insertGame();const h=await otherPlayer('guest');await handleGames(req('/'+id+'/join','POST',{},h),env);
 for(let i=0;i<2;i++)await handleGames(req('/'+id+'/approve','POST',{playerId:'guest'}),env);
 let inbox=await(await handleGames(req('/notifications','GET',undefined,h),env)).json();expect(inbox.notifications.map((n:any)=>n.kind)).toEqual(['approved']);
 await handleGames(req('/'+id+'/remove','POST',{playerId:'guest'}),env);inbox=await(await handleGames(req('/notifications','GET',undefined,h),env)).json();expect(inbox.notifications.some((n:any)=>n.kind==='removed')).toBe(true);
 const h2=await otherPlayer('pending-guest');await handleGames(req('/'+id+'/join','POST',{},h2),env);
 for(let i=0;i<2;i++)await handleGames(req('/'+id+'/cancel','POST',{}),env);
 expect((await(await handleGames(req('/notifications','GET',undefined,h2),env)).json()).notifications.map((n:any)=>n.kind)).toEqual(['game_cancelled']);
 expect(JSON.stringify(await(await handleGames(req('/notifications'),env)).json())).not.toContain('game_cancelled');
});
it('rejected requests notify the requester and cannot target unrelated accounts',async()=>{const id=await insertGame();const h=await otherPlayer('guest');expect((await handleGames(req('/'+id+'/reject','POST',{playerId:'guest'}),env)).status).toBe(404);await handleGames(req('/'+id+'/join','POST',{},h),env);await handleGames(req('/'+id+'/reject','POST',{playerId:'guest'}),env);expect((await(await handleGames(req('/notifications','GET',undefined,h),env)).json()).notifications.map((n:any)=>n.kind)).toEqual(['rejected']);});

it('completes the two-account request, approval, notification-read and cancellation lifecycle',async()=>{
 const id=await insertGame();const guest=await otherPlayer('lifecycle-guest');const unrelated=await otherPlayer('unrelated');
 const call=async(path:string,method='GET',body?:unknown,h:Record<string,string>={})=>{const response=await handleGames(req(path,method,body,h),env);expect(response.status).toBe(200);return response.json();};
 await call('/'+id+'/join','POST',{},guest);
 let hostInbox=await call('/notifications');expect(hostInbox.notifications.filter((n:any)=>!n.readAt).map((n:any)=>n.kind)).toEqual(['requested']);
 await call('/notifications/read','POST',{id:hostInbox.notifications[0].id});
 await call('/'+id+'/approve','POST',{playerId:'lifecycle-guest'});
 const guestInbox=await call('/notifications','GET',undefined,guest);expect(guestInbox.notifications.map((n:any)=>n.kind)).toEqual(['approved']);
 expect((await call('/'+id+'/participation','GET',undefined,guest)).joined).toBe(true);
 expect((await call('/'+id)).game.playerCount).toBe(2);
 await call('/'+id+'/leave','POST',{reason:'Private schedule conflict'},guest);
 expect((await call('/'+id)).game.playerCount).toBe(1);
 hostInbox=await call('/notifications');expect(hostInbox.notifications.find((n:any)=>n.kind==='cancelled')).toMatchObject({reason:'Private schedule conflict',placesReleased:1});
 expect((await call('/notifications','GET',undefined,unrelated)).notifications).toHaveLength(0);
 expect(JSON.stringify(await call('/'+id))).not.toContain('Private schedule conflict');
});
it('preserves existing notification data/read state across notification migrations',async()=>{
 const id=await insertGame();const row=db.sqlite.prepare('SELECT * FROM games WHERE id=?').get(id);
 const legacy=new DatabaseSync(':memory:');legacy.exec('PRAGMA foreign_keys=ON');
 try{
 for(const file of ['0001_create_tennis_courts.sql','0002_player_auth.sql','0003_public_games.sql','0004_game_participation.sql','0005_game_cancellations.sql','0006_host_notifications.sql'])legacy.exec(readFileSync('functions/db/migrations/'+file,'utf8'));
 legacy.prepare('INSERT INTO players(id,created_at,updated_at) VALUES (?,?,?)').run('player-1',now,now);
 const columns=Object.keys(row).filter(k=>!['court_count','event_capacity','series_id','series_week','series_weeks','series_exception'].includes(k));legacy.prepare('INSERT INTO games ('+columns.join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')').run(...columns.map(k=>row[k]));
 legacy.prepare('INSERT INTO game_host_notifications(id,game_id,host_id,actor_id,kind,reason,places_released,created_at,read_at) VALUES (?,?,?,?,?,?,?,?,?)').run('existing-event',id,'player-1','player-1','cancelled','Preserve reason',1,now,now);
 for(const file of ['0007_request_notifications.sql','0008_player_notifications.sql'])legacy.exec(readFileSync('functions/db/migrations/'+file,'utf8'));
 expect(legacy.prepare('SELECT * FROM game_notifications').get()).toMatchObject({id:'existing-event',recipient_id:'player-1',reason:'Preserve reason',read_at:now});
 expect(legacy.prepare('PRAGMA foreign_key_check').all()).toHaveLength(0);
 }finally{legacy.close();}
});

it('exposes inbox request actions only to the current host while the request is pending',async()=>{const id=await insertGame();const h=await otherPlayer('guest');await handleGames(req('/'+id+'/join','POST',{},h),env);let inbox=await(await handleGames(req('/notifications'),env)).json();expect(inbox.notifications[0]).toMatchObject({actionPlayerId:'guest',requestStatus:'pending'});await handleGames(req('/'+id+'/approve','POST',{playerId:'guest'}),env);inbox=await(await handleGames(req('/notifications'),env)).json();expect(inbox.notifications.find((n:any)=>n.kind==='requested')).toMatchObject({actionPlayerId:null,requestStatus:'approved'});const guestInbox=await(await handleGames(req('/notifications','GET',undefined,h),env)).json();expect(guestInbox.notifications[0].actionPlayerId).toBeNull();});
it('guest requests reserve places only after host approval and release the complete party on leave',async()=>{
 const id=await insertGame();const guestToken='guest-player-session-with-more-than-32-characters';db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run('tom','Tom',now,now);db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run('tom-session','tom',await hashToken(guestToken),csrf,now,now+86400000);
 const tom=(action:string,body:unknown={},method='POST')=>handleGames(req('/'+id+'/'+action,method,body===null?undefined:body,{Cookie:'oc_session='+guestToken}),env);
 expect((await tom('request-guests',{guestCount:1})).status).toBe(409);
 await tom('join');await handleGames(req('/'+id+'/approve','POST',{playerId:'tom'}),env);
 expect((await tom('request-guests',{guestCount:1})).status).toBe(200);
 expect((await tom('request-guests',{guestCount:1})).status).toBe(409);
 expect((await(await handleGames(req('/'+id),env)).json()).game.playerCount).toBe(2);
 expect((await tom('approve-guests',{playerId:'tom'})).status).toBe(403);
 expect((await handleGames(req('/'+id+'/approve-guests','POST',{playerId:'tom'}),env)).status).toBe(200);
 expect((await(await handleGames(req('/'+id),env)).json()).game.playerCount).toBe(3);
 expect((await(await tom('guests',null,'GET')).json()).own.confirmed).toBe(1);
 expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM game_guest_notifications WHERE recipient_id='tom' AND kind='guest_approved'").get().n).toBe(1);
 expect((await tom('cancel-guests')).status).toBe(200);
 expect((await(await handleGames(req('/'+id),env)).json()).game.playerCount).toBe(2);
 expect((await tom('request-guests',{guestCount:1})).status).toBe(200);await handleGames(req('/'+id+'/approve-guests','POST',{playerId:'tom'}),env);
 expect((await tom('leave',{reason:'Plans changed'})).status).toBe(200);
 expect((await(await handleGames(req('/'+id),env)).json()).game.playerCount).toBe(1);
 expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_guest_requests').get().n).toBe(0);
 expect(db.sqlite.prepare("SELECT places_released FROM game_notifications WHERE kind='cancelled' AND actor_id='tom'").get().places_released).toBe(2);
});
it('guest approval capacity is atomic and cancellation releases guest places without removing the member',async()=>{
 const id=await insertGame();for(const player of ['tom','jane']){db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run(player,player,now,now);db.sqlite.prepare('INSERT INTO game_participants(game_id,player_id,joined_at) VALUES (?,?,?)').run(id,player,now);db.sqlite.prepare("INSERT INTO game_guest_requests VALUES (?,?,1,'pending',?,?)").run(id,player,now,now);}
 expect((await handleGames(req('/'+id+'/approve-guests','POST',{playerId:'tom'}),env)).status).toBe(200);
 expect((await handleGames(req('/'+id+'/approve-guests','POST',{playerId:'jane'}),env)).status).toBe(409);
 expect(db.sqlite.prepare("SELECT status FROM game_guest_requests WHERE player_id='jane'").get().status).toBe('pending');
 expect(db.sqlite.prepare("SELECT guest_count FROM game_participants WHERE player_id='jane'").get().guest_count).toBe(0);
});
it('unlisted invitations grant viewing only, require approval, and revoke access to unconfirmed invitees',async()=>{
 const {response,data}=await create({visibility:'unlisted'});expect(response.status).toBe(201);const id=data.game.id;expect(data.game.visibility).toBe('unlisted');
 const guestToken='unlisted-invitee-session-long-enough-for-testing';db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run('invitee','Invited Player',now,now);db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run('invitee','invitee',await hashToken(guestToken),csrf,now,now+86400000);
 const guest=(path:string,method='GET',body?:unknown)=>handleGames(req(path,method,body,{Cookie:'oc_session='+guestToken}),env);
 expect((await guest('/'+id)).status).toBe(404);expect((await guest('/'+id+'/join','POST',{})).status).toBe(404);
 const invitation=await(await handleGames(req('/'+id+'/share-links','POST',{expiresInDays:7}),env)).json();const token=invitation.url.split('#')[1];expect(token).toHaveLength(64);expect(JSON.stringify(db.sqlite.prepare('SELECT * FROM game_invitation_links').get())).not.toContain(token);
 expect((await guest('/invitation-accept','POST',{token})).status).toBe(200);expect((await guest('/'+id)).status).toBe(200);
 await guest('/'+id+'/join','POST',{});expect(db.sqlite.prepare("SELECT status FROM game_join_requests WHERE player_id='invitee'").get().status).toBe('pending');
 expect((await(await handleGames(req('/notifications'),env)).json()).notifications.some((n:any)=>n.kind==='requested')).toBe(true);
 await handleGames(req('/'+id+'/revoke-link','POST',{linkId:invitation.id}),env);expect((await guest('/'+id)).status).toBe(404);expect((await guest('/'+id+'/join','POST',{})).status).toBe(404);expect((await(await guest('/mine')).json()).games).toHaveLength(0);
 const second=await(await handleGames(req('/'+id+'/share-links','POST',{}),env)).json();await guest('/invitation-accept','POST',{token:second.url.split('#')[1]});await handleGames(req('/'+id+'/approve','POST',{playerId:'invitee'}),env);await handleGames(req('/'+id+'/revoke-link','POST',{linkId:second.id}),env);expect((await guest('/'+id)).status).toBe(200);expect((await(await guest('/feed')).json()).games).toHaveLength(1);
 expect(JSON.stringify(await(await handleGames(req(),env)).json())).not.toContain(id);expect((await guest('/'+id+'/share-links','POST',{})).status).toBe(404);
});
it('rejects expired unlisted links and reports without disclosing private content',async()=>{
 const {data}=await create({visibility:'unlisted'}),id=data.game.id;const invite=await(await handleGames(req('/'+id+'/share-links','POST',{}),env)).json();db.sqlite.prepare('UPDATE game_invitation_links SET expires_at=0').run();expect((await handleGames(req('/invitation-accept','POST',{token:invite.url.split('#')[1]}),env)).status).toBe(404);expect((await handleGames(req('/'+id+'/share-links','POST',{expiresInDays:999}),env)).status).toBe(400);
});
it('blocking prevents new public joins and discovery even when a player has a game URL',async()=>{
 const id=await insertGame(),guestToken='blocked-player-session-longer-than-32-characters';db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run('blocked','Blocked Player',now,now);db.sqlite.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').run('blocked','blocked',await hashToken(guestToken),csrf,now,now+86400000);db.sqlite.prepare('INSERT INTO player_blocks VALUES (?,?,?)').run('player-1','blocked',now);
 const h={Cookie:'oc_session='+guestToken};expect((await handleGames(req('/'+id+'/join','POST',{},h),env)).status).toBe(403);expect((await(await handleGames(req('','GET',undefined,h),env)).json()).games).toHaveLength(0);
 db.sqlite.prepare("INSERT INTO game_join_requests VALUES (?,?,'pending',?,?)").run(id,'blocked',now,now);expect((await handleGames(req('/'+id+'/approve','POST',{playerId:'blocked'}),env)).status).toBe(403);
});
it('a block added between permission read and approval prevents participant insertion',async()=>{
 const id=await insertGame();db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run('race-player','Race Player',now,now);db.sqlite.prepare("INSERT INTO game_join_requests VALUES (?,?,'pending',?,?)").run(id,'race-player',now,now);
 const original=db.prepare.bind(db);let intercepted=false;db.prepare=((sql:string)=>{const statement=original(sql);if(sql.startsWith('SELECT 1 FROM player_blocks')){const read=statement.first.bind(statement);statement.first=async<T>()=>{const result=await read<T>();if(!intercepted){intercepted=true;db.sqlite.prepare('INSERT INTO player_blocks VALUES (?,?,?)').run('player-1','race-player',now);}return result;};}return statement;});
 await handleGames(req('/'+id+'/approve','POST',{playerId:'race-player'}),env);expect(intercepted).toBe(true);expect(db.sqlite.prepare("SELECT COUNT(*) AS n FROM game_participants WHERE game_id=? AND player_id='race-player'").get(id).n).toBe(0);expect(db.sqlite.prepare("SELECT status FROM game_join_requests WHERE game_id=? AND player_id='race-player'").get(id).status).toBe('pending');
});
it('schedule sections distinguish active games, requests, completion and cancelled participation',async()=>{
 db.sqlite.prepare('INSERT INTO players(id,display_name,created_at,updated_at) VALUES (?,?,?,?)').run('other-host','Other Host',now,now);
 const upcoming=await insertGame(),past=await insertGame({starts_at:now-7200000,ends_at:now-3600000}),cancelled=await insertGame({status:'cancelled'});
 const pending=await insertGame(),removed=await insertGame(),left=await insertGame(),withdrawn=await insertGame(),expired=await insertGame({starts_at:now-7200000,ends_at:now-3600000});
 for(const id of [pending,removed,left,withdrawn,expired]){db.sqlite.prepare("UPDATE games SET organizer_id='other-host' WHERE id=?").run(id);db.sqlite.prepare("DELETE FROM game_participants WHERE game_id=? AND player_id='player-1'").run(id);}
 for(const [id,status] of [[pending,'pending'],[removed,'removed'],[expired,'pending']])db.sqlite.prepare('INSERT INTO game_join_requests VALUES (?,?,?,?,?)').run(id,'player-1',status,now,now);
 db.sqlite.prepare('INSERT INTO game_cancellations VALUES (?,?,?,?)').run(left,'player-1','Private reason',now);
 db.sqlite.prepare("INSERT INTO game_notifications VALUES (?,?,?,?,'withdrawn','',0,?,NULL)").run(crypto.randomUUID(),withdrawn,'other-host','player-1',now);
 const ids=async(view:string)=>(await(await handleGames(req('/mine?view='+view),env)).json()).games.map((g:any)=>g.id);
 expect(await ids('upcoming')).toEqual([upcoming]);expect(await ids('requests')).toEqual([pending]);expect(await ids('past')).toEqual([past]);expect(new Set(await ids('cancelled'))).toEqual(new Set([cancelled,removed,left,withdrawn,expired]));
 const text=await(await handleGames(req('/mine?view=cancelled'),env)).text();expect(text).not.toContain('Private reason');expect((await handleGames(req('/mine?view=bad'),env)).status).toBe(400);
});
it('schedule filters before pagination so old history cannot hide upcoming games',async()=>{
 for(let i=0;i<52;i++)await insertGame({starts_at:now+86400000+i*60000,ends_at:now+90000000+i*60000});
 const first=await(await handleGames(req('/mine?view=upcoming'),env)).json();expect(first.games).toHaveLength(50);expect(first.games[0].starts_at).toBe(now+86400000);expect(first.nextCursor).toBeTruthy();const second=await(await handleGames(req('/mine?view=upcoming&cursor='+encodeURIComponent(first.nextCursor)),env)).json();expect(second.games).toHaveLength(2);expect(new Set([...first.games,...second.games].map((g:any)=>g.id)).size).toBe(52);
});

it('creates multi-court singles and doubles with room for rotating players',async()=>{
 for(const [format,courtCount,capacity] of [['singles',2,4],['doubles',4,16],['doubles',4,20]] as const){
  const {response,data}=await create({format,courtCount,capacity});expect(response.status,JSON.stringify(data)).toBe(201);expect(data.game).toMatchObject({format,courtCount,capacity,playerCount:1});
 }
});
it('rejects invalid court counts and insufficient, fractional or excessive attendance',async()=>{
 for(const patch of [{courtCount:0},{courtCount:17},{courtCount:1.5},{courtCount:'2'},{courtCount:2,capacity:4},{capacity:3.5},{capacity:129}])expect((await create(patch)).response.status).toBe(400);
});
it('multi-court capacity counts guests and rejects a final overbooking atomically',async()=>{
 const {data}=await create({format:'singles',courtCount:2,capacity:5});const id=data.game.id;
 for(const name of ['a','b']){const h=await otherPlayer(name);await handleGames(req('/'+id+'/join','POST',{},h),env);expect((await handleGames(req('/'+id+'/approve','POST',{playerId:name}),env)).status).toBe(200);}
 db.sqlite.prepare('UPDATE game_participants SET guest_count=2 WHERE game_id=? AND player_id=?').run(id,'a');
 const h=await otherPlayer('c');await handleGames(req('/'+id+'/join','POST',{},h),env);expect((await handleGames(req('/'+id+'/approve','POST',{playerId:'c'}),env)).status).toBe(409);
 expect(db.sqlite.prepare('SELECT SUM(1+guest_count) n FROM game_participants WHERE game_id=?').get(id).n).toBe(5);
 expect(()=>db.sqlite.prepare('UPDATE games SET event_capacity=4 WHERE id=?').run(id)).toThrow(/capacity/);
 expect(db.sqlite.prepare('PRAGMA foreign_key_check').all()).toHaveLength(0);
});

it('creates independent weekly occurrences with local time preserved across DST',async()=>{
 const {response,data}=await create({repeatWeeks:4,startLocal:'2026-03-01T10:00',timeZone:'America/New_York'});expect(response.status,JSON.stringify(data)).toBe(201);
 const rows=db.sqlite.prepare('SELECT id,starts_at,series_week,series_weeks FROM games WHERE series_id=? ORDER BY series_week').all(data.game.id);expect(rows).toHaveLength(4);expect(new Set(rows.map((r:any)=>r.id)).size).toBe(4);
 expect(new Date(rows[0].starts_at).toISOString()).toBe('2026-03-01T15:00:00.000Z');expect(new Date(rows[1].starts_at).toISOString()).toBe('2026-03-08T14:00:00.000Z');
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants').get().n).toBe(4);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM player_game_invitations').get().n).toBe(0);
 const h=await otherPlayer('weekly-player');await handleGames(req('/'+rows[0].id+'/join','POST',{},h),env);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_join_requests WHERE player_id=?').get('weekly-player').n).toBe(1);
 await handleGames(req('/'+rows[0].id+'/cancel','POST',{}),env);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM games WHERE status='scheduled'").get().n).toBe(3);
});
it('rejects invalid series and validates every date before creating any occurrence',async()=>{
 for(const repeatWeeks of [0,13,2.5,'4'])expect((await create({repeatWeeks})).response.status).toBe(400);
 expect((await create({repeatWeeks:12,startLocal:'2026-06-01T10:00'})).response.status).toBe(400);
 expect((await create({repeatWeeks:2,startLocal:'2026-03-01T02:30',timeZone:'America/New_York'})).response.status).toBe(400);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM games').get().n).toBe(0);
});
it('weekly retries return the existing series without duplicate occurrences',async()=>{
 const input=await body({repeatWeeks:3});for(let i=0;i<2;i++)expect((await handleGames(req('','POST',input),env)).status).toBe(i===0?201:200);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM games').get().n).toBe(3);
});

async function seriesPlan(id:string,extra:Record<string,unknown>={}){const input={scope:'single',operation:'reschedule',preserveExceptions:true,startLocal:'2026-02-14T09:30',...extra};const r=await handleGames(req('/'+id+'/series/preview','POST',input),env);expect(r.status,await r.clone().text()).toBe(200);return {input,plan:await r.json()};}
async function seriesApply(id:string,input:Record<string,unknown>,plan:any,requestId=crypto.randomUUID()){return handleGames(req('/'+id+'/series/apply','POST',{...input,planHash:plan.planHash,requestId}),env);}
it('reschedules one occurrence without changing attendance or the other weeks and notifies players',async()=>{
 const {data}=await create({repeatWeeks:3});const id=data.game.id,guest=await otherPlayer('series-guest');await handleGames(req('/'+id+'/join','POST',{},guest),env);await handleGames(req('/'+id+'/approve','POST',{playerId:'series-guest'}),env);
 const {input,plan}=await seriesPlan(id);expect(plan.affected).toHaveLength(1);const key=crypto.randomUUID();expect((await seriesApply(id,input,plan,key)).status).toBe(200);expect((await seriesApply(id,input,plan,key)).status).toBe(200);
 expect(db.sqlite.prepare('SELECT starts_at,series_exception FROM games WHERE id=?').get(id)).toMatchObject({starts_at:Date.parse('2026-02-14T08:30:00Z'),series_exception:1});expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_participants WHERE game_id=?').get(id).n).toBe(2);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_schedule_notifications WHERE recipient_id=?').get('series-guest').n).toBe(1);
 const notes=await(await handleGames(req('/notifications','GET',undefined,guest),env)).json();expect(notes.notifications.some((n:any)=>n.kind==='schedule_changed'&&n.oldStart&&n.newStart)).toBe(true);
});
it('future edits preserve individual exceptions unless explicitly included',async()=>{
 const {data}=await create({repeatWeeks:3});const ids=db.sqlite.prepare('SELECT id FROM games WHERE series_id=? ORDER BY series_week').all(data.game.id).map((r:any)=>r.id);
 let p=await seriesPlan(ids[1],{startLocal:'2026-02-21T11:00'});expect((await seriesApply(ids[1],p.input,p.plan)).status).toBe(200);
 p=await seriesPlan(ids[0],{scope:'future',startLocal:'2026-02-14T09:30'});expect(p.plan.affected).toHaveLength(2);expect(p.plan.skipped.some((g:any)=>g.reason==='Individual exception preserved')).toBe(true);expect((await seriesApply(ids[0],p.input,p.plan)).status).toBe(200);
 expect(new Date(db.sqlite.prepare('SELECT starts_at FROM games WHERE id=?').get(ids[1]).starts_at).toISOString()).toBe('2026-02-21T10:00:00.000Z');
});
it('cancels one day or remaining series without deleting other games',async()=>{
 const {data}=await create({repeatWeeks:3});const ids=db.sqlite.prepare('SELECT id FROM games WHERE series_id=? ORDER BY series_week').all(data.game.id).map((r:any)=>r.id);
 let p=await seriesPlan(ids[1],{operation:'cancel'});expect((await seriesApply(ids[1],p.input,p.plan)).status).toBe(200);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM games WHERE status='scheduled'").get().n).toBe(2);
 p=await seriesPlan(ids[0],{operation:'cancel',scope:'future',preserveExceptions:false});expect(p.plan.affected).toHaveLength(2);expect((await seriesApply(ids[0],p.input,p.plan)).status).toBe(200);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM games').get().n).toBe(3);expect(db.sqlite.prepare("SELECT COUNT(*) n FROM games WHERE status='scheduled'").get().n).toBe(0);
});
it('rejects stale previews, outsiders and DST-invalid bulk changes without partial writes',async()=>{
 const {data}=await create({repeatWeeks:3});const id=data.game.id;const p=await seriesPlan(id,{scope:'future'});db.sqlite.prepare('UPDATE games SET version=version+1 WHERE series_id=? AND series_week=2').run(id);
 expect((await seriesApply(id,p.input,p.plan)).status).toBe(409);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_schedule_notifications').get().n).toBe(0);
 const other=await otherPlayer('not-host');expect((await handleGames(req('/'+id+'/series','GET',undefined,other),env)).status).toBe(404);
 const {data:dst}=await create({repeatWeeks:3,startLocal:'2026-03-01T10:00',timeZone:'America/New_York'});const r=await handleGames(req('/'+dst.game.id+'/series/preview','POST',{scope:'future',operation:'reschedule',preserveExceptions:true,startLocal:'2026-03-01T02:30'}),env);expect(r.status).toBe(400);
});

it('database series guards roll back all occurrences if any target is stale',async()=>{
 const {data}=await create({repeatWeeks:2});const rows=db.sqlite.prepare('SELECT id,version,starts_at,ends_at FROM games WHERE series_id=? ORDER BY series_week').all(data.game.id);const change=crypto.randomUUID();
 await expect(db.batch([db.prepare('INSERT INTO game_series_changes VALUES (?,?,?,?,?)').bind(change,'player-1',await hashToken(token),'hash',now),...rows.map((g:any,i:number)=>db.prepare('INSERT INTO game_series_change_targets VALUES (?,?,?,?,?,?,?)').bind(change,g.id,g.version+(i===1?1:0),g.starts_at+1800000,g.ends_at+1800000,'scheduled',0))])).rejects.toThrow(/series changed/);
 expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_series_changes').get().n).toBe(0);expect(db.sqlite.prepare('SELECT COUNT(*) n FROM game_schedule_notifications').get().n).toBe(0);for(const g of rows)expect(db.sqlite.prepare('SELECT starts_at FROM games WHERE id=?').get(g.id).starts_at).toBe(g.starts_at);
});
