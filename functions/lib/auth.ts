import * as oauth from 'oauth4webapi';
import { EncryptJWT, importPKCS8, jwtDecrypt, SignJWT } from 'jose';

export interface AuthStatement {
  bind(...values: unknown[]): AuthStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface AuthDatabase {
  prepare(sql: string): AuthStatement;
  batch(statements: AuthStatement[]): Promise<unknown[]>;
}
export interface AuthEnv {
  COURTS_DB?: AuthDatabase;
  PLAY_TOGETHER_ENABLED?: string;
  AUTH_ORIGIN?: string;
  CF_PAGES_BRANCH?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  APPLE_TOKEN_ENCRYPTION_KEY?: string;
  AUTH_RATE_LIMIT_SECRET?: string;
}
type Provider = 'google' | 'apple';
type Player = { id: string; display_name: string; bio: string; general_location: string; skill_level: string; discoverable: number; status: string };
export type Session = Player & { session_id: string; token_hash: string; csrf_token: string; session_created_at: number };
type Attempt = { state_hash: string; provider: Provider; browser_hash: string; nonce: string; code_verifier: string | null; return_path: string; link_player_id: string | null; link_session_hash: string | null; expires_at: number };
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const providers: Record<Provider, oauth.AuthorizationServer> = {
  google: { issuer: 'https://accounts.google.com', authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth', token_endpoint: 'https://oauth2.googleapis.com/token', jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs' },
  apple: { issuer: 'https://appleid.apple.com', authorization_endpoint: 'https://appleid.apple.com/auth/authorize', token_endpoint: 'https://appleid.apple.com/auth/token', jwks_uri: 'https://appleid.apple.com/auth/keys', revocation_endpoint: 'https://appleid.apple.com/auth/revoke' },
};
export class AuthError extends Error { constructor(public status: number, message: string) { super(message); } }
const appleKeyMessages = {
  'apple-key-format': 'The Apple private key must contain the complete .p8 PEM text, including BEGIN PRIVATE KEY and END PRIVATE KEY lines.',
  'apple-key-import': 'The Apple private key could not be imported as a P-256 signing key. Check that it is the unmodified Sign in with Apple .p8 file.',
  'apple-key-sign': 'The Apple private key was imported, but signing failed. The development signing configuration needs review.',
};
class AppleSigningError extends AuthError {
  constructor(public reason: keyof typeof appleKeyMessages) { super(503, appleKeyMessages[reason]); }
}
export function normalizeApplePrivateKey(raw: string) {
  let pem = raw.trim();
  // Accept a copied JSON string or quoted .env value, as well as raw PEM.
  if (pem.startsWith('"') && pem.endsWith('"')) {
    try { const parsed = JSON.parse(pem); if (typeof parsed === 'string') pem = parsed; }
    catch { pem = pem.slice(1, -1); }
  } else if (pem.startsWith("'") && pem.endsWith("'")) pem = pem.slice(1, -1);
  pem = pem.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
  const match = /^-----BEGIN PRIVATE KEY-----\s*([A-Za-z0-9+/=\s]+?)\s*-----END PRIVATE KEY-----$/.exec(pem);
  if (!match) throw new AppleSigningError('apple-key-format');
  const body = match[1].replace(/\s/g, '');
  if (!body) throw new AppleSigningError('apple-key-format');
  // Some secret-entry fields flatten pasted line breaks. Reconstruct PEM without
  // changing the DER bytes; importPKCS8 still performs the actual key validation.
  return `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----`;
}
function fail(status: number, message: string): never { throw new AuthError(status, message); }
function randomToken() { return oauth.generateRandomState(); }
export async function hashToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } });
}
function redirect(path: string) { return new Response(null, { status: 303, headers: { Location: path, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } }); }
function cookieName(origin: string, kind = 'session') { return `${origin.startsWith('https:') ? '__Host-' : ''}oc_${kind}`; }
function readCookie(request: Request, name: string) {
  return request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
}
function setCookie(response: Response, origin: string, kind: string, value: string, age: number, crossSite = false) {
  response.headers.append('Set-Cookie', `${cookieName(origin, kind)}=${value}; Path=/; HttpOnly; SameSite=${crossSite ? 'None' : 'Lax'}; Max-Age=${age}${origin.startsWith('https:') ? '; Secure' : ''}`);
}
export function assertEnvironment(request: Request, env: AuthEnv): { db: AuthDatabase; origin: string } {
  if (env.PLAY_TOGETHER_ENABLED !== 'true' || !env.COURTS_DB || !env.AUTH_ORIGIN) fail(404, 'Not found.');
  const origin = new URL(request.url).origin;
  const url = new URL(origin);
  // Production cannot be enabled by setting the feature flag alone.
  const local = ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:';
  const preview = url.hostname === 'feature-play-together.opencourts.pages.dev' && url.protocol === 'https:';
  if ((!local && !preview) || env.AUTH_ORIGIN !== origin || env.CF_PAGES_BRANCH === 'main') fail(404, 'Not found.');
  return { db: env.COURTS_DB, origin };
}
function providerReady(provider: Provider, env: AuthEnv) {
  return provider === 'google' ? Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) : Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY && /^[0-9a-f]{64}$/i.test((env.APPLE_TOKEN_ENCRYPTION_KEY ?? '').trim()));
}
function appleEncryptionKey(env: AuthEnv) {
  const text = (env.APPLE_TOKEN_ENCRYPTION_KEY ?? '').trim();
  if (!/^[0-9a-f]{64}$/i.test(text)) fail(503, 'Apple sign-in is not configured correctly.');
  return Uint8Array.from(text.match(/../g)!, byte => parseInt(byte, 16));
}
function client(provider: Provider, env: AuthEnv): oauth.Client {
  return { client_id: (provider === 'google' ? env.GOOGLE_CLIENT_ID : env.APPLE_CLIENT_ID?.trim())!, id_token_signed_response_alg: 'RS256' };
}
async function providerAuth(provider: Provider, env: AuthEnv) {
  if (provider === 'google') return oauth.ClientSecretPost(env.GOOGLE_CLIENT_SECRET!);
  const pem = normalizeApplePrivateKey(env.APPLE_PRIVATE_KEY!);
  let key: CryptoKey;
  try { key = await importPKCS8(pem, 'ES256'); }
  catch { throw new AppleSigningError('apple-key-import'); }
  let secret: string;
  try {
    secret = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: env.APPLE_KEY_ID!.trim() })
      .setIssuer(env.APPLE_TEAM_ID!.trim()).setSubject(env.APPLE_CLIENT_ID!.trim()).setAudience('https://appleid.apple.com')
      .setIssuedAt().setExpirationTime('5m').sign(key);
  } catch { throw new AppleSigningError('apple-key-sign'); }
  return oauth.ClientSecretPost(secret);
}
export async function session(request: Request, db: AuthDatabase, origin: string): Promise<Session | null> {
  const token = readCookie(request, cookieName(origin));
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return null;
  return db.prepare(`SELECT p.*, s.id AS session_id, s.token_hash, s.csrf_token, s.created_at AS session_created_at
    FROM auth_sessions s JOIN players p ON p.id=s.player_id
    WHERE s.token_hash=? AND s.expires_at>? AND s.revoked_at IS NULL AND p.status='active'`)
    .bind(await hashToken(token), Date.now()).first<Session>();
}
export function requireSession(value: Session | null): Session { return value ?? fail(401, 'Please sign in again.'); }
export function checkOrigin(request: Request, origin: string) {
  if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') fail(403, 'Request not allowed.');
}
export function checkCsrf(request: Request, current: Session) {
  if (request.headers.get('x-csrf-token') !== current.csrf_token) fail(403, 'Please refresh and try again.');
}
async function boundedText(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit) fail(413, 'Request too large.');
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder(); let size = 0; let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); fail(413, 'Request too large.'); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
export async function readJson(request: Request, limit = 4096): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'JSON required.');
  const text = await boundedText(request, limit);
  try { const result = JSON.parse(text); if (!result || Array.isArray(result) || typeof result !== 'object') fail(400, 'Invalid request.'); return result; }
  catch { return fail(400, 'Invalid request.'); }
}
export function validateProfile(body: Record<string, unknown>) {
  const keys = ['displayName','bio','generalLocation','skillLevel','discoverable'];
  if (Object.keys(body).some(key => !keys.includes(key))) fail(400, 'Unexpected profile field.');
  const text = (key: string, max: number, required = false) => {
    if (typeof body[key] !== 'string') fail(400, 'Complete all profile fields.');
    const value = (body[key] as string).trim();
    if ((required && !value) || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(400, `Invalid ${key}.`);
    return value;
  };
  const displayName = text('displayName', 60, true);
  const bio = text('bio', 500);
  const generalLocation = text('generalLocation', 100);
  if (!['unspecified','beginner','intermediate','advanced'].includes(String(body.skillLevel)) || typeof body.discoverable !== 'boolean') fail(400, 'Invalid profile preferences.');
  return { displayName, bio, generalLocation, skillLevel: body.skillLevel as string, discoverable: body.discoverable as boolean };
}
function profile(player: Player) { return { id: player.id, displayName: player.display_name, bio: player.bio, generalLocation: player.general_location, skillLevel: player.skill_level, discoverable: Boolean(player.discoverable) }; }
async function createSession(db: AuthDatabase, playerId: string, origin: string, response: Response) {
  const token = randomToken();
  await db.prepare('INSERT INTO auth_sessions (id,player_id,token_hash,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), playerId, await hashToken(token), randomToken(), Date.now(), Date.now() + SESSION_SECONDS * 1000).run();
  setCookie(response, origin, 'session', token, SESSION_SECONDS);
}
async function start(request: Request, env: AuthEnv, db: AuthDatabase, origin: string, current: Session | null, provider: Provider) {
  if (!providerReady(provider, env)) fail(503, 'This sign-in option is not configured yet.');
  if (origin.startsWith('https:') && !env.AUTH_RATE_LIMIT_SECRET) fail(503, 'Sign-in protection is not configured yet.');
  const body = await readJson(request);
  const linking = body.link === true;
  if (linking) {
    const signedIn = requireSession(current); checkCsrf(request, signedIn);
    if (Date.now() - signedIn.session_created_at > 15 * 60_000) fail(403, 'Sign in again before connecting another sign-in method.');
  } else if (current) fail(409, 'You are already signed in.');
  // Persistent per-browser throttle; Cloudflare edge rate limits are also required before public rollout.
  const browser = readCookie(request, cookieName(origin, 'flow')) || randomToken();
  const browserHash = await hashToken(browser);
  const requesterHash = await hashToken(`${env.AUTH_RATE_LIMIT_SECRET ?? 'loopback-only'}:${request.headers.get('CF-Connecting-IP') ?? 'local'}`);
  if (provider === 'apple' && !origin.startsWith('https:')) fail(503, 'Apple sign-in requires the HTTPS development preview.');
  // Validate/sign before redirecting, so key setup errors do not force a full
  // Apple login attempt. No token, key material or provider claims are exposed.
  if (provider === 'apple') await providerAuth(provider, env);
  const state = randomToken(); const nonce = oauth.generateRandomNonce();
  const verifier = provider === 'google' ? oauth.generateRandomCodeVerifier() : null;
  await db.batch([
    db.prepare('DELETE FROM auth_login_attempts WHERE expires_at<?').bind(Date.now()),
    db.prepare('DELETE FROM auth_sessions WHERE expires_at<? OR revoked_at IS NOT NULL').bind(Date.now()),
  ]);
  // Count and insert in one SQL statement; consumed attempts still count. Cookies
  // cannot reset the per-requester limit; a shared IP has a deliberately higher cap.
  const inserted = await db.prepare(`INSERT INTO auth_login_attempts (state_hash,provider,browser_hash,requester_hash,nonce,code_verifier,return_path,link_player_id,link_session_hash,created_at,expires_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE
    (SELECT COUNT(*) FROM auth_login_attempts WHERE browser_hash=? AND created_at>?) < 5 AND
    (SELECT COUNT(*) FROM auth_login_attempts WHERE requester_hash=? AND created_at>?) < 30`)
    .bind(await hashToken(state), provider, browserHash, requesterHash, nonce, verifier, '/account', linking ? current!.id : null, linking ? current!.token_hash : null, Date.now(), Date.now() + 10 * 60_000,
      browserHash, Date.now() - 60_000, requesterHash, Date.now() - 5 * 60_000).run();
  if (!inserted.meta.changes) fail(429, 'Please wait a few minutes before trying again.');
  const url = new URL(providers[provider].authorization_endpoint!);
  url.searchParams.set('client_id', client(provider, env).client_id);
  url.searchParams.set('redirect_uri', `${origin}/api/auth/${provider}/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', provider === 'google' ? 'openid email profile' : 'email');
  url.searchParams.set('state', state); url.searchParams.set('nonce', nonce);
  if (verifier) { url.searchParams.set('code_challenge', await oauth.calculatePKCECodeChallenge(verifier)); url.searchParams.set('code_challenge_method', 'S256'); }
  if (provider === 'apple') url.searchParams.set('response_mode', 'form_post');
  else url.searchParams.set('prompt', 'select_account');
  const response = json({ url: url.href });
  // Only the short-lived browser binding uses SameSite=None for Apple's form_post.
  setCookie(response, origin, 'flow', browser, 600, provider === 'apple');
  return response;
}
async function callback(request: Request, env: AuthEnv, db: AuthDatabase, origin: string, provider: Provider) {
  let stage = 'callback';
  const responseError = (reason = stage) => redirect(`/account?authError=signin&reason=${encodeURIComponent(reason)}`);
  try {
    if (!providerReady(provider, env)) return responseError();
    if ((provider === 'apple' && request.method !== 'POST') || (provider === 'google' && request.method !== 'GET')) fail(405, 'Method not allowed.');
    const text = request.method === 'POST' ? await boundedText(request, 8192) : '';
    const params = request.method === 'POST' ? new URLSearchParams(text) : new URL(request.url).searchParams;
    const state = params.get('state');
    const browser = readCookie(request, cookieName(origin, 'flow'));
    if (!state || !browser) return responseError();
    // Atomic consumption prevents replay; retain the short-lived row for throttling.
    const attempt = await db.prepare('UPDATE auth_login_attempts SET consumed_at=? WHERE state_hash=? AND provider=? AND browser_hash=? AND expires_at>? AND consumed_at IS NULL RETURNING *')
      .bind(Date.now(), await hashToken(state), provider, await hashToken(browser), Date.now()).first<Attempt>();
    if (!attempt) return responseError();
    const as = providers[provider]; const app = client(provider, env);
    stage = 'provider-response';
    const validated = oauth.validateAuthResponse(as, app, params, state);
    stage = 'client-credentials';
    const authentication = await providerAuth(provider, env);
    stage = 'token-exchange';
    const tokenResponse = await oauth.authorizationCodeGrantRequest(as, app, authentication, validated,
      `${origin}/api/auth/${provider}/callback`, attempt.code_verifier ?? oauth.nopkce, { signal: AbortSignal.timeout(12000) });
    const tokens = await oauth.processAuthorizationCodeResponse(as, app, tokenResponse, { expectedNonce: attempt.nonce, requireIdToken: true });
    stage = 'token-signature';
    await oauth.validateApplicationLevelSignature(as, tokenResponse, { signal: AbortSignal.timeout(12000) });
    const claims = oauth.getValidatedIdTokenClaims(tokens);
    if (!claims?.sub) return responseError();
    stage = 'account-storage';
    let appleToken: string | null = null;
    if (provider === 'apple' && typeof tokens.refresh_token === 'string') {
      appleToken = await new EncryptJWT({ token: tokens.refresh_token }).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).encrypt(appleEncryptionKey(env));
    }
    const identity = await db.prepare('SELECT player_id FROM auth_identities WHERE issuer=? AND subject=?').bind(as.issuer, claims.sub).first<{ player_id: string }>();
    let playerId: string;
    if (attempt.link_player_id) {
      // Apple POST does not carry the Lax main session cookie. Recheck the exact
      // initiating session in D1, bound to this flow, instead of requiring that cookie.
      const validSession = await db.prepare(`SELECT p.id FROM players p JOIN auth_sessions s ON s.player_id=p.id
        WHERE p.id=? AND p.status='active' AND s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?`)
        .bind(attempt.link_player_id, attempt.link_session_hash, Date.now()).first();
      if (!validSession) return responseError();
      if (identity && identity.player_id !== attempt.link_player_id) return redirect('/account?authError=linked');
      playerId = attempt.link_player_id;
      if (!identity) await db.prepare('INSERT INTO auth_identities (id,player_id,provider,issuer,subject,email,email_verified,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(), playerId, provider, as.issuer, claims.sub, typeof claims.email === 'string' ? claims.email : null, claims.email_verified === true || claims.email_verified === 'true' ? 1 : 0, Date.now()).run();
    } else if (identity) playerId = identity.player_id;
    else {
      playerId = crypto.randomUUID();
      // A unique identity collision rolls back the player insert too.
      await db.batch([
        db.prepare('INSERT INTO players (id,created_at,updated_at) VALUES (?,?,?)').bind(playerId, Date.now(), Date.now()),
        db.prepare('INSERT INTO auth_identities (id,player_id,provider,issuer,subject,email,email_verified,created_at) VALUES (?,?,?,?,?,?,?,?)')
          .bind(crypto.randomUUID(), playerId, provider, as.issuer, claims.sub, typeof claims.email === 'string' ? claims.email : null, claims.email_verified === true || claims.email_verified === 'true' ? 1 : 0, Date.now()),
      ]);
    }
    const player = await db.prepare("SELECT id FROM players WHERE id=? AND status='active'").bind(playerId).first();
    if (!player) return responseError();
    if (appleToken) await db.prepare('UPDATE auth_identities SET provider_token_encrypted=? WHERE issuer=? AND subject=?').bind(appleToken, as.issuer, claims.sub).run();
    const response = redirect(attempt.return_path);
    if (attempt.link_session_hash) await db.prepare('UPDATE auth_sessions SET revoked_at=? WHERE token_hash=?').bind(Date.now(), attempt.link_session_hash).run();
    await createSession(db, playerId, origin, response);
    setCookie(response, origin, 'flow', '', 0, provider === 'apple');
    return response;
  } catch (error) {
    // Do not log authorization codes, claims, emails, provider responses or tokens.
    const reason = error instanceof AppleSigningError ? error.reason : error instanceof oauth.ResponseBodyError && ['invalid_client','invalid_grant','invalid_request','unauthorized_client'].includes(error.error)
      ? `provider-${error.error}` : stage;
    return responseError(reason);
  }
}
export async function handleAuth(request: Request, env: AuthEnv): Promise<Response> {
  try {
    const { db, origin } = assertEnvironment(request, env);
    const path = new URL(request.url).pathname.replace(/^\/api\/auth\/?/, '').replace(/\/$/, '');
    const match = /^(google|apple)\/(start|callback)$/.exec(path);
    if (match?.[2] === 'callback') return await callback(request, env, db, origin, match[1] as Provider);
    const current = await session(request, db, origin);
    if (path === 'me' && request.method === 'GET') {
      const protectedStart = origin.startsWith('http:') || Boolean(env.AUTH_RATE_LIMIT_SECRET);
      const available = { google: protectedStart && providerReady('google', env), apple: protectedStart && providerReady('apple', env) && origin.startsWith('https:') };
      const connected = current ? (await db.prepare('SELECT provider,email FROM auth_identities WHERE player_id=?').bind(current.id).all<{ provider: string;email:string|null }>()).results : [];
      return json({ player: current ? profile(current) : null, csrfToken: current?.csrf_token ?? null, providers: available, connectedProviders: connected.map(row=>row.provider), connectedAccounts: connected.map(({provider,email})=>({provider,email})) });
    }
    checkOrigin(request, origin);
    if (match?.[2] === 'start' && request.method === 'POST') return await start(request, env, db, origin, current, match[1] as Provider);
    const signedIn = requireSession(current); checkCsrf(request, signedIn);
    if (path === 'me' && request.method === 'PATCH') {
      const p = validateProfile(await readJson(request));
      await db.prepare("UPDATE players SET display_name=?,bio=?,general_location=?,skill_level=?,discoverable=?,updated_at=? WHERE id=? AND status='active'")
        .bind(p.displayName, p.bio, p.generalLocation, p.skillLevel, p.discoverable ? 1 : 0, Date.now(), signedIn.id).run();
      return json({ player: { id: signedIn.id, ...p } });
    }
    if (['logout','logout-all'].includes(path) && request.method === 'POST') {
      await db.prepare(`UPDATE auth_sessions SET revoked_at=? WHERE ${path === 'logout' ? 'token_hash' : 'player_id'}=?`)
        .bind(Date.now(), path === 'logout' ? signedIn.token_hash : signedIn.id).run();
      const response = json({ ok: true }); setCookie(response, origin, 'session', '', 0); return response;
    }
    if (path === 'me' && request.method === 'DELETE') {
      const owned=await db.prepare("SELECT id FROM tennis_groups WHERE owner_id=? AND status='active' LIMIT 1").bind(signedIn.id).first();
      if(owned)throw new AuthError(409,'Transfer ownership or archive your active groups before deleting your account.');
      if (Date.now() - signedIn.session_created_at > 15 * 60_000) fail(403, 'Sign in again before deleting your account.');
      const body = await readJson(request);
      if (body.confirm !== 'DELETE') fail(400, 'Confirm account deletion.');
      const appleIdentity = await db.prepare("SELECT provider_token_encrypted FROM auth_identities WHERE player_id=? AND provider='apple'").bind(signedIn.id).first<{ provider_token_encrypted: string | null }>();
      if (appleIdentity) {
        if (!providerReady('apple', env) || !appleIdentity.provider_token_encrypted) fail(503, 'Sign in with Apple again before deleting your account.');
        const { payload } = await jwtDecrypt(appleIdentity.provider_token_encrypted, appleEncryptionKey(env));
        if (typeof payload.token !== 'string') fail(503, 'Account deletion is temporarily unavailable.');
        const revoked = await oauth.revocationRequest(providers.apple, client('apple', env), await providerAuth('apple', env), payload.token, { signal: AbortSignal.timeout(12000) });
        await oauth.processRevocationResponse(revoked);
      }
      await db.batch([db.prepare("DELETE FROM tennis_groups WHERE owner_id=? AND status='archived'").bind(signedIn.id),db.prepare('DELETE FROM players WHERE id=?').bind(signedIn.id)]);
      const response = json({ ok: true }); setCookie(response, origin, 'session', '', 0); return response;
    }
    return json({ error: 'Not found.' }, 404);
  } catch (error) {
    return json({ error: error instanceof AuthError ? error.message : 'Account service is unavailable. Please try again.' }, error instanceof AuthError ? error.status : 503);
  }
}
