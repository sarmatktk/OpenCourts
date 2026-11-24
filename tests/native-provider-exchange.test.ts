import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('../functions/lib/native-apple-exchange',()=>({redeemNativeAppleCode:vi.fn(async()=>('encrypted-native-token'))}));
vi.mock('../functions/lib/native-provider-verification',()=>({verifyNativeProviderToken:vi.fn(async()=>({issuer:'https://appleid.apple.com',subject:'verified-subject'}))}));
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
describe('native provider exchange account binding',()=>{
 it('issues one session only for an existing active issuer and subject',async()=>{
  await db.prepare("INSERT INTO auth_identities(id,player_id,provider,issuer,subject,created_at) VALUES(?,?,?,?,?,?)")
    .bind('identity','player','apple','https://appleid.apple.com','verified-subject',Date.now()).run();
  const start=await handleAuth(req('native/provider/challenge','POST',{provider:'apple',adultConfirmed:true}),env);
  const challenge=await start.json();
  const body={challengeId:challenge.challengeId,idToken:'signed-token',authorizationCode:'code'};
  const [a,b]=await Promise.all([handleAuth(req('native/provider/exchange','POST',body),env),handleAuth(req('native/provider/exchange','POST',body),env)]);
  expect([a.status,b.status].sort()).toEqual([200,401]);
  expect(db.sqlite.prepare("SELECT count(*) AS n FROM auth_sessions WHERE client_type='ios'").get().n).toBe(1);
  const response=a.status===200?a:b;const credential=await response.json();
  expect((await session(req('me','GET',undefined,{Authorization:'Bearer '+credential.token}),db,origin))?.id).toBe('player');
 });
 it('creates a separate account for a new verified identity without merging on email',async()=>{
  const start=await handleAuth(req('native/provider/challenge','POST',{provider:'apple',adultConfirmed:true}),env);
  const challenge=await start.json();
  const response=await handleAuth(req('native/provider/exchange','POST',{challengeId:challenge.challengeId,idToken:'signed-token',authorizationCode:'code'}),env);
  expect(response.status).toBe(200);
  expect(db.sqlite.prepare('SELECT count(*) AS n FROM players').get().n).toBe(2);
  expect(db.sqlite.prepare("SELECT provider_token_encrypted AS token FROM auth_identities WHERE subject='verified-subject'").get().token).toBe('encrypted-native-token');
 });
});
