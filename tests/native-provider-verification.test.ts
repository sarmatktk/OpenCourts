import { describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, createLocalJWKSet, SignJWT } from 'jose';
import { verifyNativeProviderToken } from '../functions/lib/native-provider-verification';

describe('native provider assertion verification', () => {
  it('requires the expected signature, issuer, audience, nonce and expiry', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    const keys = createLocalJWKSet({ keys: [{ ...jwk, kid: 'test', alg: 'RS256' }] });
    const token = await new SignJWT({ nonce: 'challenge' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer('https://accounts.google.com').setAudience('ios-client').setSubject('subject')
      .setIssuedAt().setExpirationTime('5m').sign(privateKey);
    await expect(verifyNativeProviderToken('google', token, 'ios-client', 'challenge', keys))
      .resolves.toEqual({ issuer: 'https://accounts.google.com', subject: 'subject' });
    await expect(verifyNativeProviderToken('google', token, 'other-client', 'challenge', keys)).rejects.toThrow();
    await expect(verifyNativeProviderToken('google', token, 'ios-client', 'wrong', keys)).rejects.toThrow();
    await expect(verifyNativeProviderToken('apple', token, 'ios-client', 'challenge', keys)).rejects.toThrow();
    const expired = await new SignJWT({ nonce: 'challenge' }).setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer('https://accounts.google.com').setAudience('ios-client').setSubject('subject')
      .setIssuedAt().setExpirationTime('1 second ago').sign(privateKey);
    await expect(verifyNativeProviderToken('google', expired, 'ios-client', 'challenge', keys)).rejects.toThrow();
    const stale = await new SignJWT({ nonce: 'challenge' }).setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer('https://accounts.google.com').setAudience('ios-client').setSubject('subject')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 601).setExpirationTime('5m').sign(privateKey);
    await expect(verifyNativeProviderToken('google', stale, 'ios-client', 'challenge', keys)).rejects.toThrow();
    const apple = await new SignJWT({ nonce: 'challenge' }).setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer('https://appleid.apple.com').setAudience('us.opencourts.ios').setSubject('apple-subject')
      .setIssuedAt().setExpirationTime('5m').sign(privateKey);
    await expect(verifyNativeProviderToken('apple', apple, 'us.opencourts.ios', 'challenge', keys))
      .resolves.toEqual({ issuer: 'https://appleid.apple.com', subject: 'apple-subject' });
    const other = await generateKeyPair('RS256');
    const otherJwk = await exportJWK(other.publicKey);
    const wrongKeys = createLocalJWKSet({ keys: [{ ...otherJwk, kid: 'test', alg: 'RS256' }] });
    await expect(verifyNativeProviderToken('google', token, 'ios-client', 'challenge', wrongKeys)).rejects.toThrow();
  });
});
