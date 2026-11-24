import { EncryptJWT, importPKCS8, SignJWT } from 'jose';
import { normalizeApplePrivateKey, type AuthEnv } from './auth';
import { verifyNativeProviderToken } from './native-provider-verification';

// Apple requires server-side code exchange and revocation support for account deletion.
export async function redeemNativeAppleCode(env: AuthEnv, code: string, nonce: string, expectedSubject: string): Promise<string> {
  const team = env.APPLE_TEAM_ID?.trim(), keyID = env.APPLE_KEY_ID?.trim();
  const encryptionKey = env.APPLE_TOKEN_ENCRYPTION_KEY?.trim();
  if (!team || !keyID || !env.APPLE_PRIVATE_KEY || !encryptionKey || !/^[0-9a-f]{64}$/i.test(encryptionKey)) throw new Error('Apple configuration unavailable');
  const key = await importPKCS8(normalizeApplePrivateKey(env.APPLE_PRIVATE_KEY), 'ES256');
  const secret = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: keyID })
    .setIssuer(team).setSubject('us.opencourts.ios').setAudience('https://appleid.apple.com')
    .setIssuedAt().setExpirationTime('5m').sign(key);
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: 'us.opencourts.ios', client_secret: secret, code, grant_type: 'authorization_code' }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Apple authorization unavailable');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('id_token' in data) || !('refresh_token' in data) ||
      typeof data.id_token !== 'string' || typeof data.refresh_token !== 'string' || !data.refresh_token) throw new Error('Apple authorization unavailable');
  const verified = await verifyNativeProviderToken('apple', data.id_token, 'us.opencourts.ios', nonce);
  if (verified.subject !== expectedSubject) throw new Error('Apple identity mismatch');
  const bytes = Uint8Array.from(encryptionKey.match(/../g)!, value => parseInt(value, 16));
  return new EncryptJWT({ token: data.refresh_token, clientId: 'us.opencourts.ios' }).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).encrypt(bytes);
}
