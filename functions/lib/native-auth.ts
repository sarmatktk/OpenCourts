import {AuthError,checkCsrf,checkOrigin,hashToken,json,readJson,session,type AuthDatabase,type AuthEnv} from './auth';
import {verifyNativeProviderToken} from './native-provider-verification';
import {redeemNativeAppleCode} from './native-apple-exchange';

const callback='opencourts-ios://auth/complete';
const valid=/^[A-Za-z0-9_-]+$/;
const random=()=>{const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
export function nativeAuthEnabled(env:AuthEnv,origin:string){
 const u=new URL(origin);
 const development=env.NATIVE_AUTH_DEVELOPMENT_ENABLED==='true'&&env.PLAY_TOGETHER_ENVIRONMENT!=='production'&&env.CF_PAGES_BRANCH!=='main'&&
  ((u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))||origin==='https://feature-play-together.opencourts.pages.dev');
 const production=origin==='https://opencourts.us'&&env.NATIVE_AUTH_PRODUCTION_ENABLED==='true'&&env.AUTH_ORIGIN===origin&&env.CF_PAGES_BRANCH==='main'&&env.PLAY_TOGETHER_ENVIRONMENT==='production';
 return development||production;
}
function cookieName(origin:string){return `${origin.startsWith('https:')?'__Host-':''}oc_native`;}
function binding(request:Request,origin:string){return request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName(origin)+'='))?.slice(cookieName(origin).length+1)??'';}
function cookie(response:Response,origin:string,value:string,age:number){response.headers.append('Set-Cookie',`${cookieName(origin)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith('https:')?'; Secure':''}`);}
type Grant={id_hash:string;challenge:string;client_state:string;source_session_id:string|null;code_hash:string|null;expires_at:number;consumed_at:number|null};
async function grant(request:Request,db:AuthDatabase,origin:string){
 const token=binding(request,origin);if(!valid.test(token)||token.length!==43)return null;
 return db.prepare('SELECT * FROM native_auth_grants WHERE id_hash=? AND expires_at>? AND consumed_at IS NULL').bind(await hashToken(token),Date.now()).first<Grant>();
}
export async function nativeReturnPath(request:Request,env:AuthEnv,db:AuthDatabase,origin:string){
 return nativeAuthEnabled(env,origin)&&await grant(request,db,origin)?'/api/auth/native/authorize':'/account';
}
export async function pkceChallenge(verifier:string){
 const hash=await hashToken(verifier);const bytes=Uint8Array.from(hash.match(/../g)!,x=>parseInt(x,16));
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

// Fixed HTML, no user content interpolation, no external resources or token logging.
// The browser verifies the existing account; a bearer token never appears in a URL.
function authorizationPage(provider: "google" | "apple" | null){
 const nonce=random();
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenCourts sign-in</title>
 <style>body{font:1rem system-ui;max-width:30rem;margin:3rem auto;padding:1rem;color-scheme:light dark}button{display:block;min-height:44px;margin:1rem 0;padding:.6rem 1rem}label{display:block;margin:1rem 0}a{color:inherit}</style>
 <h1>Sign in to OpenCourts</h1><p>Use your existing OpenCourts account in the iOS app.</p>
 <label><input id="adult" type="checkbox"> I confirm I am 18 or older.</label>
 <button id="google">Continue with Google</button><button id="apple">Continue with Apple</button>
 <button id="continue" hidden>Continue to iOS app</button><p id="status" role="status"></p>
 <p><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
 <script nonce="${nonce}">
 let account;const status=document.getElementById('status');let busy=false;const selectedProvider=${JSON.stringify(provider)};
 if(selectedProvider){for(const p of ['google','apple'])document.getElementById(p).hidden=p!==selectedProvider;}
 async function api(path,body){const r=await fetch('/api/auth/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(account?.csrfToken?{'X-CSRF-Token':account.csrfToken}:{})},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Sign-in unavailable.');return d;}
 async function run(f){if(busy)return;busy=true;status.textContent='Please wait…';try{await f();}catch(e){status.textContent=e.message;}finally{busy=false;}}
 for(const p of ['google','apple'])document.getElementById(p).onclick=()=>run(async()=>{if(!document.getElementById('adult').checked)throw Error('Confirm you are 18 or older to continue.');const d=await api(p+'/start',{adultConfirmed:true});location.assign(d.url);});
 document.getElementById('continue').onclick=()=>run(async()=>{const d=await api('native/authorize',{});location.assign(d.callbackURL);});
 run(async()=>{account=await api('me');if(account.player){document.getElementById('google').hidden=true;document.getElementById('apple').hidden=true;document.getElementById('adult').parentElement.hidden=true;document.getElementById('continue').hidden=false;status.textContent='Signed in. Continue to authorize this app.';}else status.textContent='Choose a sign-in method.';});
 </script></html>`;
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`}});
}

export async function handleNativeAuth(request:Request,env:AuthEnv,db:AuthDatabase,origin:string,path:string):Promise<Response>{
 if(!nativeAuthEnabled(env,origin))throw new AuthError(404,'Not found.');
 const url=new URL(request.url),now=Date.now();
 if(path==='native/provider/challenge'&&request.method==='POST'){
  checkOrigin(request,origin);const body=await readJson(request);
  if(body.provider!=='google'&&body.provider!=='apple')throw new AuthError(400,'Choose a sign-in method.');
  const linking=body.link===true;
  const actor=linking?await session(request,db,origin,env):null;
  if(linking){
   if(!actor)throw new AuthError(401,'Sign in again before connecting another sign-in method.');
   checkCsrf(request,actor);
   if(Date.now()-actor.session_created_at>15*60_000)throw new AuthError(403,'Sign in again before connecting another sign-in method.');
  }else if(body.adultConfirmed!==true)throw new AuthError(400,'Confirm your age before signing in.');
  const id=random(),nonce=random(),requester=await hashToken(`${env.AUTH_RATE_LIMIT_SECRET??'local'}:${request.headers.get('CF-Connecting-IP')??'local'}`);
  await db.prepare('DELETE FROM native_provider_challenges WHERE expires_at<?').bind(now).run();
  const created=await db.prepare(`INSERT INTO native_provider_challenges(id_hash,provider,nonce,requester_hash,link_player_id,link_session_hash,created_at,expires_at)
   SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM native_provider_challenges WHERE requester_hash=? AND created_at>?)<20`)
   .bind(await hashToken(id),body.provider,nonce,requester,actor?.id??null,actor?.token_hash??null,now,now+300000,requester,now-60000).run();
  if(!created.meta.changes)throw new AuthError(429,'Please wait before signing in again.');
  return json({challengeId:id,nonce});
 }
 if(path==='native/provider/exchange'&&request.method==='POST'){
  checkOrigin(request,origin);const body=await readJson(request,20000);
  if(typeof body.challengeId!=='string'||body.challengeId.length!==43||!valid.test(body.challengeId)||typeof body.idToken!=='string')throw new AuthError(400,'Invalid sign-in request.');
  const pending=await db.prepare('SELECT provider,nonce,link_player_id,link_session_hash FROM native_provider_challenges WHERE id_hash=? AND expires_at>? AND consumed_at IS NULL')
   .bind(await hashToken(body.challengeId),now).first<{provider:'google'|'apple';nonce:string;link_player_id:string|null;link_session_hash:string|null}>();
  if(!pending)throw new AuthError(401,'Sign-in expired. Please try again.');
  const audience=pending.provider==='apple'?'us.opencourts.ios':'702555901816-c2h4ro6cr80ovokvm6934jln57as6sqn.apps.googleusercontent.com';
  let identity:{issuer:string;subject:string};
  try{identity=await verifyNativeProviderToken(pending.provider,body.idToken,audience,pending.nonce);}catch(error){
   // Record only the verifier's error code/claim name. Never log the token, nonce, subject, or user data.
   const diagnostic=error as {code?:unknown;claim?:unknown};
   const code=typeof diagnostic?.code==='string'&&/^ERR_[A-Z0-9_]+$/.test(diagnostic.code)?diagnostic.code:'unknown';
   const claim=typeof diagnostic?.claim==='string'&&['iss','aud','exp','iat','nonce','sub'].includes(diagnostic.claim)?diagnostic.claim:undefined;
   console.warn('Native provider ID token rejected',{provider:pending.provider,code,claim});
   throw new AuthError(401,'Sign-in could not be verified. Please try again.');
  }
  let appleToken:string|null=null;
  if(pending.provider==='apple'){
   if(typeof body.authorizationCode!=='string'||body.authorizationCode.length<1||body.authorizationCode.length>4096)throw new AuthError(400,'Apple authorization is missing.');
   try{appleToken=await redeemNativeAppleCode(env,body.authorizationCode,pending.nonce,identity.subject);}catch{throw new AuthError(401,'Apple sign-in could not be verified. Please try again.');}
  }
  const consumed=await db.prepare('UPDATE native_provider_challenges SET consumed_at=? WHERE id_hash=? AND consumed_at IS NULL AND expires_at>?')
   .bind(Date.now(),await hashToken(body.challengeId),Date.now()).run();
  if(!consumed.meta.changes)throw new AuthError(401,'Sign-in expired. Please try again.');
  // Identity matching uses only a verified issuer and subject, never email.
  if(Boolean(pending.link_player_id)!==Boolean(pending.link_session_hash))
   throw new AuthError(503,'Account service is unavailable. Please try again.');
  if(pending.link_player_id&&pending.link_session_hash){
   const actor=await session(request,db,origin,env);
   if(!actor||actor.id!==pending.link_player_id||actor.token_hash!==pending.link_session_hash)
    throw new AuthError(401,'Your session changed. Sign in again before connecting another method.');
   checkCsrf(request,actor);
   const active=await db.prepare(`SELECT p.id FROM players p JOIN auth_sessions s ON s.player_id=p.id
    WHERE p.id=? AND p.status='active' AND s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?`)
    .bind(pending.link_player_id,pending.link_session_hash,Date.now()).first<{id:string}>();
   if(!active)throw new AuthError(401,'Your session changed. Sign in again before connecting another method.');
   const owner=await db.prepare('SELECT player_id FROM auth_identities WHERE issuer=? AND subject=?')
    .bind(identity.issuer,identity.subject).first<{player_id:string}>();
   if(owner){
    if(owner.player_id!==pending.link_player_id)throw new AuthError(409,'This sign-in method belongs to a different OpenCourts account.');
    throw new AuthError(409,'This sign-in method is already connected to your account.');
   }
   const providerAlreadyConnected=await db.prepare('SELECT id FROM auth_identities WHERE player_id=? AND provider=?')
    .bind(pending.link_player_id,pending.provider).first<{id:string}>();
   if(providerAlreadyConnected)throw new AuthError(409,'An account for this sign-in method is already connected.');
   try{
    await db.prepare('INSERT INTO auth_identities(id,player_id,provider,issuer,subject,provider_token_encrypted,created_at) VALUES(?,?,?,?,?,?,?)')
     .bind(crypto.randomUUID(),pending.link_player_id,pending.provider,identity.issuer,identity.subject,appleToken,Date.now()).run();
   }catch{
    const racedOwner=await db.prepare('SELECT player_id FROM auth_identities WHERE issuer=? AND subject=?')
     .bind(identity.issuer,identity.subject).first<{player_id:string}>();
    if(racedOwner&&racedOwner.player_id!==pending.link_player_id)
     throw new AuthError(409,'This sign-in method belongs to a different OpenCourts account.');
    const racedProvider=await db.prepare('SELECT id FROM auth_identities WHERE player_id=? AND provider=?')
     .bind(pending.link_player_id,pending.provider).first<{id:string}>();
    if(racedOwner||racedProvider)throw new AuthError(409,'This sign-in method is already connected to an OpenCourts account.');
    throw new AuthError(503,'Account service is unavailable. Please try again.');
   }
   return json({ok:true,linked:true});
  }
  let identityRow=await db.prepare('SELECT player_id FROM auth_identities WHERE issuer=? AND subject=?')
   .bind(identity.issuer,identity.subject).first<{player_id:string}>();
  if(!identityRow){
   const playerId=crypto.randomUUID(),created=Date.now();
   try{
    await db.batch([
     db.prepare('INSERT INTO players(id,created_at,updated_at) VALUES(?,?,?)').bind(playerId,created,created),
     db.prepare('INSERT INTO auth_identities(id,player_id,provider,issuer,subject,provider_token_encrypted,created_at) VALUES(?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(),playerId,pending.provider,identity.issuer,identity.subject,appleToken,created),
    ]);
    identityRow={player_id:playerId};
   }catch{
    // A concurrent first sign-in may have created this exact identity.
    identityRow=await db.prepare('SELECT player_id FROM auth_identities WHERE issuer=? AND subject=?')
     .bind(identity.issuer,identity.subject).first<{player_id:string}>();
    if(!identityRow)throw new AuthError(503,'Sign-in could not be completed. Please try again.');
   }
  }
  const player=await db.prepare("SELECT id FROM players WHERE id=? AND status='active'").bind(identityRow.player_id).first<{id:string}>();
  if(!player)throw new AuthError(403,'This account is unavailable.');
  if(appleToken)await db.prepare('UPDATE auth_identities SET provider_token_encrypted=? WHERE issuer=? AND subject=?').bind(appleToken,identity.issuer,identity.subject).run();
  const token=random(),csrfToken=random(),expiresAt=Date.now()+7*24*60*60*1000;
  await db.prepare(`INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,client_type,created_at,expires_at) VALUES(?,?,?,?,'ios',?,?)`)
   .bind(crypto.randomUUID(),player.id,await hashToken(token),csrfToken,Date.now(),expiresAt).run();
  return json({token,csrfToken,expiresAt});
 }
 if(path==='native/authorize'&&request.method==='GET'){
  const challenge=url.searchParams.get('challenge'),state=url.searchParams.get('state');
  if(challenge!==null||state!==null){
   if(!challenge||challenge.length!==43||!valid.test(challenge)||!state||state.length<32||state.length>128||!valid.test(state))throw new AuthError(400,'Invalid native authorization request.');
   const provider=url.searchParams.get('provider');
   if(provider!==null&&!['google','apple'].includes(provider))throw new AuthError(400,'Invalid sign-in provider.');
   const id=random(),requester=await hashToken(`${env.AUTH_RATE_LIMIT_SECRET??'local'}:${request.headers.get('CF-Connecting-IP')??'local'}`);
   await db.prepare('DELETE FROM native_auth_grants WHERE expires_at<?').bind(now).run();
   const inserted=await db.prepare(`INSERT INTO native_auth_grants(id_hash,challenge,client_state,requester_hash,created_at,expires_at)
    SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM native_auth_grants WHERE requester_hash=? AND created_at>?)<20`).bind(await hashToken(id),challenge,state,requester,now,now+600000,requester,now-60000).run();
   if(!inserted.meta.changes)throw new AuthError(429,'Please wait before signing in again.');
   const response=new Response(null,{status:303,headers:{Location:provider?`/api/auth/native/authorize?provider=${provider}`:'/api/auth/native/authorize','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});cookie(response,origin,id,600);return response;
  }
  if(!await grant(request,db,origin))throw new AuthError(400,'Sign-in expired. Return to the app and try again.');
  const provider=url.searchParams.get('provider');
  if(provider!==null&&provider!=='google'&&provider!=='apple')throw new AuthError(400,'Invalid sign-in provider.');
  return authorizationPage(provider);
 }
 if(path==='native/authorize'&&request.method==='POST'){
  checkOrigin(request,origin);const actor=await session(request,db,origin,env);
  if(!actor)throw new AuthError(401,'Sign in to continue.');checkCsrf(request,actor);
  const pending=await grant(request,db,origin);if(!pending||pending.code_hash)throw new AuthError(409,'Sign-in expired or already authorized.');
  const code=random(),result=await db.prepare(`UPDATE native_auth_grants SET code_hash=?,source_session_id=?,expires_at=MIN(expires_at,?)
   WHERE id_hash=? AND code_hash IS NULL AND consumed_at IS NULL AND expires_at>?
   AND EXISTS(SELECT 1 FROM auth_sessions s JOIN players p ON p.id=s.player_id WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active')`).bind(await hashToken(code),actor.session_id,now+60000,pending.id_hash,now,actor.session_id,now).run();
  if(!result.meta.changes)throw new AuthError(409,'Sign-in changed. Try again.');
  const destination=new URL(callback);destination.searchParams.set('code',code);destination.searchParams.set('state',pending.client_state);
  const response=json({callbackURL:destination.href});cookie(response,origin,'',0);return response;
 }
 if(path==='native/exchange'&&request.method==='POST'){
  // A PKCE-protected code exchange uses no browser session authority. Keep exact Origin checks.
  checkOrigin(request,origin);const body=await readJson(request);
  if(typeof body.code!=='string'||body.code.length!==43||!valid.test(body.code)||typeof body.verifier!=='string'||body.verifier.length<43||body.verifier.length>128||!valid.test(body.verifier))throw new AuthError(400,'Invalid native code exchange.');
  const codeHash=await hashToken(body.code),challenge=await pkceChallenge(body.verifier),token=random(),csrf=random(),sessionID=crypto.randomUUID();
  // Batch claims once and inserts from precisely that claim. Concurrent/replayed exchanges
  // cannot mint a second session. Preserve source sign-in time for recent-auth checks.
  await db.batch([
   db.prepare(`INSERT INTO auth_sessions(id,player_id,token_hash,csrf_token,client_type,created_at,expires_at)
    SELECT ?,s.player_id,?,?,'ios',s.created_at,s.expires_at FROM native_auth_grants g JOIN auth_sessions s ON s.id=g.source_session_id JOIN players p ON p.id=s.player_id
    WHERE g.code_hash=? AND g.challenge=? AND g.consumed_at IS NULL AND g.expires_at>? AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active'`).bind(sessionID,await hashToken(token),csrf,codeHash,challenge,now,now),
   db.prepare(`UPDATE native_auth_grants SET consumed_at=? WHERE code_hash=? AND consumed_at IS NULL
    AND EXISTS(SELECT 1 FROM auth_sessions WHERE id=?)`).bind(now,codeHash,sessionID)
  ]);
  const saved=await db.prepare('SELECT expires_at FROM auth_sessions WHERE id=?').bind(sessionID).first<{expires_at:number}>();
  if(!saved)throw new AuthError(401,'Sign-in code expired or already used. Please sign in again.');
  return json({token,csrfToken:csrf,expiresAt:saved.expires_at});
 }
 return json({error:'Not found.'},404);
}
