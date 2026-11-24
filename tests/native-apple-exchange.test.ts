import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportPKCS8, generateKeyPair, jwtDecrypt } from 'jose';
vi.mock('../functions/lib/native-provider-verification', () => ({
  verifyNativeProviderToken: vi.fn(async () => ({ issuer: 'https://appleid.apple.com', subject: 'verified-subject' })),
}));
import { redeemNativeAppleCode } from '../functions/lib/native-apple-exchange';

afterEach(() => vi.unstubAllGlobals());
describe('native Apple code exchange', () => {
  it('validates the returned identity and preserves the client used for revocation', async () => {
    const key = await generateKeyPair('ES256', { extractable: true });
    const env = { APPLE_TEAM_ID: 'TEAM', APPLE_KEY_ID: 'KEY', APPLE_PRIVATE_KEY: await exportPKCS8(key.privateKey), APPLE_TOKEN_ENCRYPTION_KEY: '01'.repeat(32) };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id_token: 'signed', refresh_token: 'refresh' }), { status: 200 })));
    const encrypted = await redeemNativeAppleCode(env, 'code', 'nonce', 'verified-subject');
    const result = await jwtDecrypt(encrypted, new Uint8Array(32).fill(1));
    expect(result.payload.token).toBe('refresh');
    expect(result.payload.clientId).toBe('us.opencourts.ios');
    await expect(redeemNativeAppleCode(env, 'code', 'nonce', 'different-subject')).rejects.toThrow();
  });
});
