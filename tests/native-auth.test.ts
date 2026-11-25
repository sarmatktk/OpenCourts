import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {handleAuth,hashToken,session,type AuthDatabase,type AuthEnv,type AuthStatement} from '../functions/lib/auth';
import {nativeReturnPath,pkceChallenge} from '../functions/lib/native-auth';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite');
class Database implements AuthDatabase {
 sqlite=new DatabaseSync(':memory:');
 constructor(){this.sqlite.exec('PRAGMA foreign_keys=ON');for(const name of ['0002_player_auth.sql','0009_tennis_groups.sql','0034_native_auth_development.sql','0035_native_provider_challenges.sql','0038_native_provider_linking.sql'])this.sqlite.exec(readFileSync('functions/db/migrations/'+name,'utf8'));}
 prepare(sql:string):AuthStatement{let values:any[]=[];const s:AuthStatement={bind(...v){values=v;return s;},first:async<T>()=>(this.sqlite.prepare(sql).get(...values)??null) as T|null,all:async<T>()=>({results:this.sqlite.prepare(sql).all(...values) as T[]}),run:async()=>({meta:{changes:Number(this.sqlite.prepare(sql).run(...values).changes)}})};return s;}
 async batch(statements:AuthStatement[]){this.sqlite.exec('BEGIN');try{for(const s of statements)await s.run();this.sqlite.exec('COMMIT');return [];}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const origin='http://127.0.0.1:8788',webToken='test-web-session-with-32-characters-minimum',csrf='csrf',verifier='v'.repeat(43),state='s'.repeat(43);
let db:Database,env:AuthEnv;
const req=(path:string,method='GET',body?:unknown,headers:Record<string,string>={})=>new Request(origin+'/api/auth/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
beforeEach(async()=>{db=new Database();env={COURTS_DB:db,PLAY_TOGETHER_ENABLED:'true',AUTH_ORIGIN:origin,NATIVE_AUTH_DEVELOPMENT_ENABLED:'true'};const now=Date.now();await db.prepare('INSERT INTO players(id,created_at,updated_at) VALUES (?,?,?)').bind('player',now,now).run();await db.prepare('INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').bind('browser','player',await hashToken(webToken),csrf,now-60000,now+3600000).run();});
afterEach(()=>db.sqlite.close());
async function begin(){const r=await handleAuth(req('native/authorize?'+new URLSearchParams({challenge:await pkceChallenge(verifier),state})),env);expect(r.status).toBe(303);return r.headers.get('set-cookie')!.split(';')[0];}
async function authorize(){const cookie=await begin();const r=await handleAuth(req('native/authorize','POST',{}, {Cookie:cookie+'; oc_session='+webToken,'X-CSRF-Token':csrf}),env);expect(r.status).toBe(200);const url=new URL((await r.json()).callbackURL);expect(url.protocol).toBe('opencourts-ios:');expect(url.searchParams.get('state')).toBe(state);return url.searchParams.get('code')!;}
describe('development native identity exchange',()=>{
 it('is disabled by default and always disabled on production',async()=>{delete env.NATIVE_AUTH_DEVELOPMENT_ENABLED;expect((await handleAuth(req('native/authorize'),env)).status).toBe(404);Object.assign(env,{NATIVE_AUTH_DEVELOPMENT_ENABLED:'true',AUTH_ORIGIN:'https://opencourts.us',CF_PAGES_BRANCH:'main',PLAY_TOGETHER_ENVIRONMENT:'production',PLAY_TOGETHER_PRODUCTION_ENABLED:'true'});expect((await handleAuth(new Request('https://opencourts.us/api/auth/native/authorize'),env)).status).toBe(404);});
 it('allows only native Production auth behind its own gate while website auth stays gated',async()=>{
  Object.assign(env,{AUTH_ORIGIN:'https://opencourts.us',CF_PAGES_BRANCH:'main',PLAY_TOGETHER_ENVIRONMENT:'production',NATIVE_AUTH_PRODUCTION_ENABLED:'true'});
  const nativeRequest=new Request('https://opencourts.us/api/auth/native/provider/challenge',{method:'POST',headers:{Origin:'https://opencourts.us','Content-Type':'application/json'},body:JSON.stringify({provider:'google',adultConfirmed:true})});
  expect((await handleAuth(nativeRequest,env)).status).toBe(200);
  const websiteRequest=new Request('https://opencourts.us/api/auth/me',{headers:{Origin:'https://opencourts.us'}});
  expect((await handleAuth(websiteRequest,env)).status).toBe(404);
 });
 it('issues bounded provider challenges only after age confirmation and rejects invalid assertions',async()=>{
  expect((await handleAuth(req('native/provider/challenge','POST',{provider:'google'}),env)).status).toBe(400);
  expect((await handleAuth(req('native/provider/challenge','POST',{provider:'unknown',adultConfirmed:true}),env)).status).toBe(400);
  const result=await handleAuth(req('native/provider/challenge','POST',{provider:'apple',adultConfirmed:true}),env);
  expect(result.status).toBe(200);const challenge=await result.json();
  expect(challenge.challengeId).toHaveLength(43);expect(challenge.nonce).toHaveLength(43);
  expect((await handleAuth(req('native/provider/exchange','POST',{challengeId:challenge.challengeId,idToken:'invalid'}),env)).status).toBe(401);
  expect(db.sqlite.prepare('SELECT consumed_at FROM native_provider_challenges').get().consumed_at).toBeNull();
 });
 it('uses the RFC7636 S256 test vector',async()=>{expect(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');});
 it('binds the browser flow and never accepts arbitrary return URLs',async()=>{const cookie=await begin();expect(await nativeReturnPath(req('google/start','POST',{}, {Cookie:cookie}),env,db,origin)).toBe('/api/auth/native/authorize');expect(await nativeReturnPath(req('google/start'),env,db,origin)).toBe('/account');const page=await handleAuth(req('native/authorize','GET',undefined,{Cookie:cookie}),env);expect(page.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");expect((await handleAuth(req('native/authorize'),env)).status).toBe(400);});
 it('preserves only an allowed selected provider through the browser redirect',async()=>{
  for(const provider of ['google','apple']){
   const query=new URLSearchParams({challenge:await pkceChallenge(verifier),state,provider});
   const start=await handleAuth(req('native/authorize?'+query),env);
   expect(start.status).toBe(303);
   expect(start.headers.get('location')).toBe('/api/auth/native/authorize?provider='+provider);
   const cookie=start.headers.get('set-cookie')!.split(';')[0];
   const page=await handleAuth(req('native/authorize?provider='+provider,'GET',undefined,{Cookie:cookie}),env);
   expect(page.status).toBe(200);
   expect(await page.text()).toContain('const selectedProvider="'+provider+'"');
  }
  const query=new URLSearchParams({challenge:await pkceChallenge(verifier),state,provider:'other'});
  expect((await handleAuth(req('native/authorize?'+query),env)).status).toBe(400);
 });
 it('rejects malformed challenges and bounded state',async()=>{for(const q of ['challenge=plain&state='+state,'challenge='+'c'.repeat(43)+'&state=x'])expect((await handleAuth(req('native/authorize?'+q),env)).status).toBe(400);});
 it('requires an active web session, exact Origin and CSRF before authorization',async()=>{const cookie=await begin();expect((await handleAuth(req('native/authorize','POST',{}, {Cookie:cookie}),env)).status).toBe(401);expect((await handleAuth(req('native/authorize','POST',{}, {Cookie:cookie+'; oc_session='+webToken}),env)).status).toBe(403);expect((await handleAuth(req('native/authorize','POST',{}, {Cookie:cookie+'; oc_session='+webToken,'X-CSRF-Token':csrf,Origin:'https://other.example'}),env)).status).toBe(403);});
 it('redeems once into the same identity and preserves recent sign-in age',async()=>{const code=await authorize();const r=await handleAuth(req('native/exchange','POST',{code,verifier}),env);expect(r.status).toBe(200);const data=await r.json();expect(data.token).toHaveLength(43);const actor=await session(req('me','GET',undefined,{Authorization:'Bearer '+data.token}),db,origin);expect(actor?.id).toBe('player');const web=db.sqlite.prepare("SELECT created_at FROM auth_sessions WHERE id='browser'").get();expect(actor?.session_created_at).toBe(web.created_at);expect((await handleAuth(req('native/exchange','POST',{code,verifier}),env)).status).toBe(401);expect(db.sqlite.prepare("SELECT count(*) AS n FROM auth_sessions WHERE client_type='ios'").get().n).toBe(1);expect((await handleAuth(req('logout','POST',{}, {Authorization:'Bearer '+data.token,'X-CSRF-Token':data.csrfToken}),env)).status).toBe(200);await expect(session(req('me','GET',undefined,{Authorization:'Bearer '+data.token}),db,origin)).rejects.toMatchObject({status:401});});
 it('does not consume a code on wrong verifier; rejects web tokens as bearer and native tokens as cookies',async()=>{const code=await authorize();expect((await handleAuth(req('native/exchange','POST',{code,verifier:'x'.repeat(43)}),env)).status).toBe(401);const d=await (await handleAuth(req('native/exchange','POST',{code,verifier}),env)).json();await expect(session(req('me','GET',undefined,{Authorization:'Bearer '+webToken}),db,origin)).rejects.toMatchObject({status:401});expect(await session(req('me','GET',undefined,{Cookie:'oc_session='+d.token}),db,origin)).toBeNull();expect(await session(req('me','GET',undefined,{Authorization:'Bearer '+d.token}),db,'https://opencourts.us')).toBeNull();});
 it('rejects expired grants and revoked/disabled source accounts',async()=>{const code=await authorize();db.sqlite.prepare('UPDATE native_auth_grants SET expires_at=?').run(Date.now()-1);expect((await handleAuth(req('native/exchange','POST',{code,verifier}),env)).status).toBe(401);const code2=await authorize();db.sqlite.prepare('UPDATE auth_sessions SET revoked_at=?').run(Date.now());expect((await handleAuth(req('native/exchange','POST',{code:code2,verifier}),env)).status).toBe(401);});
 it('rate limits creation without publishing challenge/state in HTML',async()=>{for(let i=0;i<20;i++)await begin();expect((await handleAuth(req('native/authorize?'+new URLSearchParams({challenge:await pkceChallenge(verifier),state})),env)).status).toBe(429);});
 it('cascades pending grants on account deletion',async()=>{await authorize();db.sqlite.prepare("DELETE FROM players WHERE id='player'").run();expect(db.sqlite.prepare('SELECT count(*) AS n FROM native_auth_grants').get().n).toBe(0);});
 it('does not fall back to anonymous access when a native credential expires',async()=>{
  const code=await authorize();const data=await(await handleAuth(req('native/exchange','POST',{code,verifier}),env)).json();
  db.sqlite.prepare("UPDATE auth_sessions SET expires_at=? WHERE client_type='ios'").run(Date.now()-1);
  expect((await handleAuth(req('me','GET',undefined,{Authorization:'Bearer '+data.token}),env)).status).toBe(401);
 });
 it('does not mint a native session for a disabled account',async()=>{
  const code=await authorize();db.sqlite.prepare("UPDATE players SET status='disabled'").run();
  expect((await handleAuth(req('native/exchange','POST',{code,verifier}),env)).status).toBe(401);
 });
});
