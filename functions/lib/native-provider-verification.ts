import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

// These provider keys are fixed by the server, never supplied by an app request.
const providerKeys = {
  google: createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),
  apple: createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys')),
};

export type NativeProvider = 'google' | 'apple';

// A caller must compare nonce with a fresh, server-issued, single-use challenge.
// This verifies a provider assertion only; it does not create accounts or sessions.
export async function verifyNativeProviderToken(
  provider: NativeProvider,
  token: string,
  audience: string,
  nonce: string,
  key: JWTVerifyGetKey = providerKeys[provider],
) {
  if (!audience || !nonce || !token || token.length > 16384) throw new Error('Invalid provider assertion');
  const issuer = provider === 'apple' ? 'https://appleid.apple.com' : 'https://accounts.google.com';
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['RS256'], issuer, audience, maxTokenAge: '10 minutes',
    requiredClaims: ['sub', 'exp', 'iat', 'nonce'],
  });
  if (!payload.sub || payload.nonce !== nonce) throw new Error('Invalid provider assertion');
  return { issuer, subject: payload.sub };
}
