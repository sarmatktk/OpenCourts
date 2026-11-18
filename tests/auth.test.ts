import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { exportJWK, exportPKCS8, generateKeyPair, SignJWT } from 'jose';
import { handleAuth, hashToken, normalizeApplePrivateKey, type AuthDatabase, type AuthEnv, type AuthStatement } from '../functions/lib/auth';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

// Execute the real migration and all application SQL against SQLite. This adapter
// mirrors D1's prepared statements and atomic batch, rather than mocking query results.
class LocalDatabase implements AuthDatabase {
  sqlite = new DatabaseSync(':memory:');
  constructor() { this.sqlite.exec('PRAGMA foreign_keys=ON'); this.sqlite.exec(readFileSync('functions/db/migrations/0002_player_auth.sql', 'utf8')); this.sqlite.exec(readFileSync('functions/db/migrations/0009_tennis_groups.sql','utf8')); }
  prepare(sql: string): AuthStatement {
    let values: any[] = [];
    const statement: AuthStatement = {
      bind(...args) { values = args; return statement; },
      first: async <T>() => (this.sqlite.prepare(sql).get(...values) ?? null) as T | null,
      all: async <T>() => ({ results: this.sqlite.prepare(sql).all(...values) as T[] }),
      run: async () => ({ meta: { changes: Number(this.sqlite.prepare(sql).run(...values).changes) } }),
    };
    return statement;
  }
  async batch(statements: AuthStatement[]) {
    this.sqlite.exec('BEGIN');
    try { const results = []; for (const s of statements) results.push(await s.run()); this.sqlite.exec('COMMIT'); return results; }
    catch (e) { this.sqlite.exec('ROLLBACK'); throw e; }
  }
}
const origin = 'http://127.0.0.1:8788';
const token = 'development-session-token-with-at-least-32-chars';
const csrf = 'development-csrf';
let db: LocalDatabase;
let env: AuthEnv;
let privateKey: CryptoKey;
let publicJwk: object;
let appleSigningKey: string;
beforeAll(async () => {
  const pair = await generateKeyPair('RS256'); privateKey = pair.privateKey;
  publicJwk = { ...await exportJWK(pair.publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
  appleSigningKey = await exportPKCS8((await generateKeyPair('ES256', { extractable: true })).privateKey);
});

describe('Apple form_post flow', () => {
  it('normalizes raw, JSON-quoted, escaped CRLF and env-quoted PEM without changing key contents', () => {
    const expected = appleSigningKey.trim();
    for (const value of [appleSigningKey, JSON.stringify(appleSigningKey), `'${appleSigningKey.replace(/\n/g,'\\n')}'`, appleSigningKey.replace(/\n/g,'\\r\\n'), appleSigningKey.replace(/\n/g,'')]) expect(normalizeApplePrivateKey(value)).toBe(expected);
  });
  it('rejects key paths and malformed PEM before redirecting or storing an attempt', async () => {
    configureApple();
    for (const key of ['C:/private/AuthKey.p8','-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----']) {
      env.APPLE_PRIVATE_KEY=key;
      const response=await handleAuth(req('apple/start','POST',{}),env);
      expect(response.status).toBe(503);
      const text=await response.text(); expect(text).toContain('Apple private key'); expect(text).not.toContain('AAAA'); expect(text).not.toContain('C:/private');
    }
    expect(db.sqlite.prepare('SELECT COUNT(*) AS count FROM auth_login_attempts').get()).toMatchObject({count:0});
  });
  function configureApple() {
    env = { ...env, AUTH_ORIGIN:'https://feature-play-together.opencourts.pages.dev', APPLE_CLIENT_ID:'apple-service', APPLE_TEAM_ID:'test-team', APPLE_KEY_ID:'test-key', APPLE_PRIVATE_KEY:appleSigningKey, APPLE_TOKEN_ENCRYPTION_KEY:'ab'.repeat(32), AUTH_RATE_LIMIT_SECRET:'private-rate-secret' };
  }
  async function appleFlow(link = false) {
    const result = await handleAuth(req('apple/start','POST',{ link }, link ? { Cookie:`__Host-oc_session=${token}`, 'X-CSRF-Token':csrf } : {}),env);
    expect(result.status).toBe(200);
    expect(result.headers.get('set-cookie')).toContain('SameSite=None');
    expect(result.headers.get('set-cookie')).toContain('; Secure');
    const auth = new URL((await result.json()).url);
    expect(auth.searchParams.get('response_mode')).toBe('form_post');
    return { state:auth.searchParams.get('state')!, nonce:auth.searchParams.get('nonce')!, cookie:result.headers.get('set-cookie')!.split(';')[0] };
  }
  async function appleNetwork(nonce: string) {
    const id = await new SignJWT({ sub:'apple-subject',nonce,email:'relay@privaterelay.appleid.com',email_verified:'true' }).setProtectedHeader({ alg:'RS256',kid:'test-key' }).setIssuer('https://appleid.apple.com').setAudience('apple-service').setIssuedAt().setExpirationTime('5m').sign(privateKey);
    const stub = vi.fn(async (url: any) => {
      if (String(url).endsWith('/auth/keys')) return Response.json({ keys:[publicJwk] });
      if (String(url).endsWith('/auth/token')) return Response.json({ access_token:'apple-access',token_type:'Bearer',expires_in:3600,id_token:id,refresh_token:'apple-refresh-private' });
      if (String(url).endsWith('/auth/revoke')) return new Response(null,{ status:200 });
      throw new Error('Unexpected network request');
    });
    vi.stubGlobal('fetch',stub); return stub;
  }
  function appleCallback(flow: { state:string;cookie:string }) {
    return new Request(`${env.AUTH_ORIGIN}/api/auth/apple/callback`, { method:'POST',headers:{ 'Content-Type':'application/x-www-form-urlencoded',Cookie:flow.cookie },body:new URLSearchParams({ state:flow.state,code:'apple-code' }) });
  }
  it('verifies signed Apple tokens, encrypts refresh material and revokes it on deletion', async () => {
    configureApple(); env.APPLE_TOKEN_ENCRYPTION_KEY += '\r\n';
    const flow=await appleFlow(); const network=await appleNetwork(flow.nonce);
    const response=await handleAuth(appleCallback(flow),env);
    expect(response.headers.get('location')).toBe('/account');
    expect(response.headers.get('set-cookie')).toContain('__Host-oc_session=');
    const identity=db.sqlite.prepare('SELECT * FROM auth_identities').get()!;
    expect(identity.provider).toBe('apple'); expect(identity.provider_token_encrypted).toBeTruthy();
    expect(String(identity.provider_token_encrypted)).not.toContain('apple-refresh-private');
    const cookie=/__Host-oc_session=[^;]+/.exec(response.headers.get('set-cookie')!)![0];
    const session=db.sqlite.prepare('SELECT csrf_token FROM auth_sessions').get()!;
    const removed=await handleAuth(req('me','DELETE',{ confirm:'DELETE' },{ Cookie:cookie,'X-CSRF-Token':session.csrf_token as string }),env);
    expect(removed.status).toBe(200);
    expect(network.mock.calls.some(call=>String(call[0]).endsWith('/auth/revoke'))).toBe(true);
    expect(db.sqlite.prepare('SELECT COUNT(*) AS count FROM players').get()).toMatchObject({ count:0 });
  });
  it('links Apple to the same player without needing the Lax session cookie on callback', async () => {
    await signedPlayer(); configureApple(); const flow=await appleFlow(true); await appleNetwork(flow.nonce);
    expect((await handleAuth(appleCallback(flow),env)).headers.get('location')).toBe('/account');
    expect(db.sqlite.prepare('SELECT COUNT(*) AS count FROM players').get()).toMatchObject({ count:1 });
    expect(db.sqlite.prepare("SELECT player_id FROM auth_identities WHERE provider='apple'").get()).toMatchObject({ player_id:'player-1' });
    expect(db.sqlite.prepare("SELECT revoked_at FROM auth_sessions WHERE id='session-1'").get()!.revoked_at).toBeTruthy();
  });
  it('rejects a link if its initiating session has since been revoked', async () => {
    await signedPlayer(); configureApple(); const flow=await appleFlow(true); await appleNetwork(flow.nonce);
    db.sqlite.exec('UPDATE auth_sessions SET revoked_at=1');
    expect((await handleAuth(appleCallback(flow),env)).headers.get('location')).toContain('authError');
    expect(db.sqlite.prepare("SELECT COUNT(*) AS count FROM auth_identities WHERE provider='apple'").get()).toMatchObject({ count:0 });
  });
});
beforeEach(() => { db = new LocalDatabase(); env = { COURTS_DB: db, AUTH_ORIGIN: origin, PLAY_TOGETHER_ENABLED: 'true', GOOGLE_CLIENT_ID: 'google-client', GOOGLE_CLIENT_SECRET: 'google-secret' }; });
afterEach(() => { db.sqlite.close(); vi.unstubAllGlobals(); });
function req(path: string, method = 'GET', body?: unknown, headers: Record<string,string> = {}) {
  return new Request(`${env.AUTH_ORIGIN}/api/auth/${path}`, { method, headers: { Origin: env.AUTH_ORIGIN!, 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const signedHeaders = { Cookie: `oc_session=${token}`, 'X-CSRF-Token': csrf };
async function signedPlayer(age = 0, expires = Date.now() + 60_000) {
  await db.prepare('INSERT INTO players (id,created_at,updated_at) VALUES (?,?,?)').bind('player-1',Date.now(),Date.now()).run();
  await db.prepare('INSERT INTO auth_identities (id,player_id,provider,issuer,subject,email,created_at) VALUES (?,?,?,?,?,?,?)')
    .bind('identity-1','player-1','google','https://accounts.google.com','subject-1','private-email@example.invalid',Date.now()).run();
  await db.prepare('INSERT INTO auth_sessions (id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)')
    .bind('session-1','player-1',await hashToken(token),csrf,Date.now()-age,expires).run();
}
async function begin(link = false) {
  const result = await handleAuth(req('google/start','POST',{ link }, link ? signedHeaders : {}), env);
  expect(result.status).toBe(200);
  const { url } = await result.json();
  const auth = new URL(url);
  const cookie = result.headers.get('set-cookie')!.split(';')[0];
  return { state: auth.searchParams.get('state')!, nonce: auth.searchParams.get('nonce')!, cookie, auth };
}
async function fakeProvider(nonce: string, claims: Record<string,unknown> = {}, wrongSignature = false) {
  const key = wrongSignature ? (await generateKeyPair('RS256')).privateKey : privateKey;
  const idToken = await new SignJWT({ sub: 'new-subject', email: 'private-email@example.invalid', email_verified: true, nonce, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer(String(claims.iss ?? 'https://accounts.google.com')).setAudience(String(claims.aud ?? 'google-client')).setIssuedAt().setExpirationTime(typeof claims.exp === 'number' ? claims.exp : '5m').sign(key);
  const stub = vi.fn(async (url: any) => {
    if (String(url).includes('/certs')) return Response.json({ keys: [publicJwk] });
    if (String(url).includes('oauth2.googleapis.com/token')) return Response.json({ access_token: 'provider-access-secret', token_type: 'Bearer', expires_in: 3600, id_token: idToken });
    throw new Error('Unexpected network request');
  });
  vi.stubGlobal('fetch', stub);
  return stub;
}
function finish(flow: { state: string; cookie: string }) { return req(`google/callback?code=one-time-code&state=${flow.state}`, 'GET', undefined, { Cookie: flow.cookie }); }

describe('Phase 1 authentication boundaries', () => {
  it('is disabled without the explicit flag or binding, and always on production hosts/branch', async () => {
    for (const patch of [{ PLAY_TOGETHER_ENABLED: undefined }, { COURTS_DB: undefined }, { CF_PAGES_BRANCH: 'main' }]) expect((await handleAuth(req('me'), { ...env, ...patch })).status).toBe(404);
    for (const host of ['https://opencourts.us','https://opencourts.pages.dev','https://unrelated.example']) expect((await handleAuth(new Request(`${host}/api/auth/me`), { ...env, AUTH_ORIGIN: host })).status).toBe(404);
    expect((await handleAuth(req('me'), { ...env, AUTH_ORIGIN: 'https://feature-play-together.opencourts.pages.dev' })).status).toBe(404);
  });
  it('returns signed-out state and only configured providers, without public caching or CORS', async () => {
    const r = await handleAuth(req('me'), env); const data = await r.json();
    expect(data.player).toBeNull(); expect(data.providers).toEqual({ google: true, apple: false });
    expect(r.headers.get('cache-control')).toBe('private, no-store'); expect(r.headers.has('access-control-allow-origin')).toBe(false);
  });
  it('requires HTTPS and a throttle secret before enabling preview providers', async () => {
    env.AUTH_ORIGIN = 'https://feature-play-together.opencourts.pages.dev';
    expect((await (await handleAuth(req('me'),env)).json()).providers.google).toBe(false);
    expect((await handleAuth(req('google/start','POST',{}),env)).status).toBe(503);
  });
  it('never exposes private identity fields, session tokens or token hashes', async () => {
    await signedPlayer(); const r = await handleAuth(req('me','GET',undefined,signedHeaders),env); const text = await r.text();
    expect(text).toContain('player-1'); expect(text).toContain('csrfToken');expect(JSON.parse(text).connectedAccounts).toEqual([{provider:'google',email:'private-email@example.invalid'}]);expect(JSON.stringify(JSON.parse(text).player)).not.toContain('private-email');
    for (const secret of ['subject-1','session-1',token,await hashToken(token)]) expect(text).not.toContain(secret);
  });
  it('rejects expired/revoked sessions and disabled accounts', async () => {
    await signedPlayer(0,Date.now()-1);
    expect((await (await handleAuth(req('me','GET',undefined,signedHeaders),env)).json()).player).toBeNull();
    db.sqlite.exec(`UPDATE auth_sessions SET expires_at=${Date.now()+60_000},revoked_at=1`);
    expect((await (await handleAuth(req('me','GET',undefined,signedHeaders),env)).json()).player).toBeNull();
    db.sqlite.exec("UPDATE auth_sessions SET revoked_at=NULL; UPDATE players SET status='disabled'");
    expect((await (await handleAuth(req('me','GET',undefined,signedHeaders),env)).json()).player).toBeNull();
  });
  it('requires same Origin and CSRF for profile mutations', async () => {
    await signedPlayer();
    expect((await handleAuth(req('me','PATCH',{}, { ...signedHeaders, Origin:'https://attacker.invalid' }),env)).status).toBe(403);
    expect((await handleAuth(req('me','PATCH',{}, { Cookie:signedHeaders.Cookie }),env)).status).toBe(403);
    expect((await handleAuth(req('me','PATCH',{}),env)).status).toBe(401);
  });
  it('validates fields, rejects privilege escalation, and saves the real SQLite profile', async () => {
    await signedPlayer();
    const profile = { displayName:'  Court Friend  ',bio:'I play doubles.',generalLocation:'Fairfax',skillLevel:'intermediate',discoverable:false };
    expect((await handleAuth(req('me','PATCH',{ ...profile, role:'admin' },signedHeaders),env)).status).toBe(400);
    expect((await handleAuth(req('me','PATCH',{ ...profile, displayName:'' },signedHeaders),env)).status).toBe(400);
    expect((await handleAuth(req('me','PATCH',{ ...profile, discoverable:'true' },signedHeaders),env)).status).toBe(400);
    expect((await handleAuth(req('me','PATCH',profile,signedHeaders),env)).status).toBe(200);
    expect(db.sqlite.prepare('SELECT display_name, discoverable FROM players').get()).toMatchObject({ display_name:'Court Friend',discoverable:0 });
  });
  it('revokes all device sessions when requested', async () => {
    await signedPlayer();
    await db.prepare('INSERT INTO auth_sessions (id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)').bind('session-2','player-1','another-hash','another-csrf',Date.now(),Date.now()+60_000).run();
    expect((await handleAuth(req('logout-all','POST',{},signedHeaders),env)).status).toBe(200);
    expect(db.sqlite.prepare('SELECT COUNT(*) AS count FROM auth_sessions WHERE revoked_at IS NULL').get()).toMatchObject({ count:0 });
  });
  it('requires recent authentication and explicit deletion, then cascades private account records', async () => {
    await signedPlayer(16*60_000);
    expect((await handleAuth(req('me','DELETE',{ confirm:'DELETE' },signedHeaders),env)).status).toBe(403);
    db.sqlite.exec(`UPDATE auth_sessions SET created_at=${Date.now()}`);
    expect((await handleAuth(req('me','DELETE',{ confirm:'no' },signedHeaders),env)).status).toBe(400);
    expect((await handleAuth(req('me','DELETE',{ confirm:'DELETE' },signedHeaders),env)).status).toBe(200);
    for (const table of ['players','auth_identities','auth_sessions']) expect(db.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).toMatchObject({ count:0 });
  });
  it('requires recent authenticated consent for provider linking', async () => {
    expect((await handleAuth(req('google/start','POST',{ link:true }),env)).status).toBe(401);
    await signedPlayer(16*60_000);
    expect((await handleAuth(req('google/start','POST',{ link:true },signedHeaders),env)).status).toBe(403);
  });
  it('bounds request bodies before parsing and rejects unsupported identity providers', async () => {
    expect((await handleAuth(req('google/start','POST',{ value:'x'.repeat(5000) }),env)).status).toBe(413);
    expect((await handleAuth(req('facebook/start','POST',{}),env)).status).not.toBe(200);
    await signedPlayer();
    expect((await handleAuth(req('me','PATCH',{ bio:'x'.repeat(5000) },signedHeaders),env)).status).toBe(413);
  });
});

describe('Google code flow with signed test tokens', () => {
  it('returns only a safe category for provider credential rejection', async () => {
    const flow = await begin();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error:'invalid_client',error_description:'PRIVATE-PROVIDER-DETAIL' },{ status:400 })));
    const response = await handleAuth(finish(flow),env);
    expect(response.headers.get('location')).toContain('reason=provider-invalid_client');
    expect(response.headers.get('location')).not.toContain('PRIVATE-PROVIDER-DETAIL');
    expect(await response.text()).not.toContain('PRIVATE-PROVIDER-DETAIL');
  });
  it('uses nonce, state, PKCE and hash-only session storage; callback replay fails', async () => {
    const flow = await begin();
    expect(flow.auth.searchParams.get('code_challenge_method')).toBe('S256');
    const stored = db.sqlite.prepare('SELECT * FROM auth_login_attempts').get()!;
    expect(stored.state_hash).not.toBe(flow.state); expect(stored.code_verifier).toBeTruthy();
    const network = await fakeProvider(flow.nonce);
    const response = await handleAuth(finish(flow),env);
    expect(response.status).toBe(303); expect(response.headers.get('location')).toBe('/account');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Lax');
    const sessionToken = /oc_session=([^;]+)/.exec(response.headers.get('set-cookie')!)![1];
    expect(db.sqlite.prepare('SELECT token_hash FROM auth_sessions').get()!.token_hash).toBe(await hashToken(sessionToken));
    const before = network.mock.calls.length;
    expect((await handleAuth(finish(flow),env)).headers.get('location')).toContain('authError');
    expect(network.mock.calls.length).toBe(before);
  });
  it('does not merge different provider subjects with the same email', async () => {
    await signedPlayer(); const flow = await begin(); await fakeProvider(flow.nonce);
    expect((await handleAuth(finish(flow),env)).headers.get('location')).toBe('/account');
    expect(db.sqlite.prepare('SELECT COUNT(*) AS count FROM players').get()).toMatchObject({ count:2 });
  });
  it('rejects browser-binding mismatch without calling the provider', async () => {
    const flow = await begin(); const network = vi.fn(); vi.stubGlobal('fetch',network);
    const response = await handleAuth(req(`google/callback?code=x&state=${flow.state}`,'GET',undefined,{ Cookie:'oc_flow=wrong-browser' }),env);
    expect(response.headers.get('location')).toContain('authError'); expect(network).not.toHaveBeenCalled();
  });
  it.each(['nonce','signature','subject','issuer','audience','expiration'])('rejects an invalid %s without creating an account', async invalid => {
    const flow = await begin();
    const claims = invalid === 'subject' ? { sub:'' } : invalid === 'issuer' ? { iss:'https://attacker.invalid' } : invalid === 'audience' ? { aud:'another-client' } : invalid === 'expiration' ? { exp:1 } : {};
    await fakeProvider(invalid === 'nonce' ? 'wrong-nonce' : flow.nonce, claims, invalid === 'signature');
    expect((await handleAuth(finish(flow),env)).headers.get('location')).toContain('authError');
    expect(db.sqlite.prepare('SELECT COUNT(*) AS count FROM players').get()).toMatchObject({ count:0 });
  });
  it('rejects linking an identity already owned by another player', async () => {
    await signedPlayer();
    await db.prepare('INSERT INTO players (id,created_at,updated_at) VALUES (?,?,?)').bind('other-player',Date.now(),Date.now()).run();
    await db.prepare('INSERT INTO auth_identities (id,player_id,provider,issuer,subject,created_at) VALUES (?,?,?,?,?,?)').bind('other-id','other-player','google','https://accounts.google.com','new-subject',Date.now()).run();
    const flow = await begin(true); await fakeProvider(flow.nonce);
    expect((await handleAuth(finish(flow),env)).headers.get('location')).toContain('authError=linked');
    expect(db.sqlite.prepare("SELECT player_id FROM auth_identities WHERE id='other-id'").get()).toMatchObject({ player_id:'other-player' });
  });
  it('rate limits starts even when browser cookies are reset', async () => {
    for (let i=0;i<30;i++) expect((await handleAuth(req('google/start','POST',{}),env)).status).toBe(200);
    expect((await handleAuth(req('google/start','POST',{}),env)).status).toBe(429);
  });
  it('rolls back a duplicate identity insertion without orphaning a player', async () => {
    await signedPlayer();
    await expect(db.batch([
      db.prepare('INSERT INTO players (id,created_at,updated_at) VALUES (?,?,?)').bind('duplicate-player',Date.now(),Date.now()),
      db.prepare('INSERT INTO auth_identities (id,player_id,provider,issuer,subject,created_at) VALUES (?,?,?,?,?,?)').bind('duplicate-id','duplicate-player','google','https://accounts.google.com','subject-1',Date.now()),
    ])).rejects.toThrow();
    expect(db.sqlite.prepare("SELECT id FROM players WHERE id='duplicate-player'").get()).toBeUndefined();
  });
});
it('sign-in emails are limited to the current account and omitted while signed out',async()=>{
 await signedPlayer();db.sqlite.prepare('INSERT INTO players(id,created_at,updated_at) VALUES (?,?,?)').run('other',Date.now(),Date.now());db.sqlite.prepare("INSERT INTO auth_identities(id,player_id,provider,issuer,subject,email,created_at) VALUES ('other-identity','other','google','https://accounts.google.com','other-subject','other-private@example.invalid',?)").run(Date.now());
 const own=await(await handleAuth(req('me?playerId=other','GET',undefined,signedHeaders),env)).text();expect(own).toContain('private-email@example.invalid');expect(own).not.toContain('other-private');const signedOut=await(await handleAuth(req('me'),env)).json();expect(signedOut.connectedAccounts).toEqual([]);expect(signedOut.player).toBeNull();
});
