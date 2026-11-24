import {beforeAll,expect,it,vi} from 'vitest';
import {exportPKCS8,generateKeyPair,jwtVerify} from 'jose';
import {apnsMessages,apnsPayload,apnsSenderEnabled,createAPNsClient,type APNsJob} from '../functions/lib/apns-provider';
import type {PushEnv} from '../functions/lib/push';

// Ephemeral signing material only; never contacts Apple or reads configured credentials.
let privateKey:string,publicKey:CryptoKey;
beforeAll(async()=>{const pair=await generateKeyPair('ES256',{extractable:true});privateKey=await exportPKCS8(pair.privateKey);publicKey=pair.publicKey;});
const config=()=>({teamID:'TESTTEAM01',keyID:'TESTKEY001',privateKey,topic:'us.opencourts.ios'});
const job=(now=Date.now()):APNsJob=>({deviceToken:'ab'.repeat(32),registrationID:'32345678-1234-1234-1234-123456789abc',deliveryID:'d'.repeat(32),eventID:'e'.repeat(32),kind:'group_active',expiresAt:now+86400000,target:{type:'group',id:'12345678-1234-1234-1234-123456789abc'}});
const authorize=async()=>true;

it('requires explicit sandbox sender flags and credentials and forbids production routing',()=>{
 const env:PushEnv={AUTH_ORIGIN:'https://feature-play-together.opencourts.pages.dev',NATIVE_PUSH_DEVELOPMENT_ENABLED:'true',APNS_ENVIRONMENT:'sandbox',APNS_TOPIC:'us.opencourts.ios',APNS_SENDER_ENABLED:'true',APNS_TEAM_ID:'TESTTEAM01',APNS_KEY_ID:'TESTKEY001',APNS_PRIVATE_KEY:privateKey};
 expect(apnsSenderEnabled(env)).toBe(true);
 for(const patch of [{APNS_SENDER_ENABLED:'false'},{APNS_ENVIRONMENT:'production'},{APNS_TOPIC:'other.app'},{APNS_TEAM_ID:'bad'},{APNS_KEY_ID:'bad'},{APNS_PRIVATE_KEY:undefined},{CF_PAGES_BRANCH:'main'},{AUTH_ORIGIN:'https://opencourts.us'}])expect(apnsSenderEnabled({...env,...patch})).toBe(false);
});
it('uses fixed wording for every known event and never includes caller text, URLs or invalid targets',async()=>{
 const messages=[];for(const kind of Object.keys(apnsMessages)){const payload=await apnsPayload({...job(),kind});expect(payload.aps.alert.body).toBe(apnsMessages[kind]);messages.push(payload.aps.alert.body);}
 expect(new Set(messages).size).toBe(Object.keys(apnsMessages).length);
 for(const kind of ['__proto__','constructor','SECRET NAME AND ADDRESS']){
  const payload=await apnsPayload({...job(),kind,eventID:'SECRET EVENT',target:{type:'group',id:'https://evil.test',postId:'bad'},body:'PRIVATE BODY',reason:'PRIVATE REASON'} as APNsJob);
  expect(payload).toMatchObject({kind:'activity',aps:{alert:{title:'OpenCourts',body:'You have an OpenCourts update.'}}});
  expect(payload).not.toHaveProperty('target');expect(JSON.stringify(payload)).not.toMatch(/SECRET|PRIVATE|https:/);
  expect(payload.registrationId).toBe(job().registrationID);expect(JSON.stringify(payload)).not.toContain(job().deviceToken);
 }
 const post='22345678-1234-1234-1234-123456789abc';expect((await apnsPayload({...job(),target:{...job().target,postId:post}})).target).toHaveProperty('postId',post);
});
it('signs ES256 provider claims, caches JWTs, uses fixed sandbox headers and stable request/collapse IDs',async()=>{
 let now=Date.now();const transport=vi.fn().mockResolvedValue(new Response(null,{status:200}));const client=createAPNsClient(config(),transport,()=>now),note=job(now);
 expect((await client.send(note,authorize)).status).toBe('accepted');
 const [url,init]=transport.mock.calls[0];expect(url).toBe('https://api.sandbox.push.apple.com/3/device/'+note.deviceToken);
 expect(init).toMatchObject({method:'POST',redirect:'manual'});expect(init.signal).toBeInstanceOf(AbortSignal);
 expect(init.headers).toMatchObject({'apns-topic':'us.opencourts.ios','apns-push-type':'alert','apns-priority':'10'});
 expect(Number(init.headers['apns-expiration'])).toBeLessThanOrEqual(Math.floor((now+3600000)/1000));
 const token=init.headers.authorization.slice(7),verified=await jwtVerify(token,publicKey,{issuer:'TESTTEAM01',algorithms:['ES256']});
 expect(verified.protectedHeader).toMatchObject({alg:'ES256',kid:'TESTKEY001'});expect(verified.payload.iat).toBe(Math.floor(now/1000));
 expect(new TextEncoder().encode(init.body).length).toBeLessThan(4096);
 now+=60000;await client.send(note,authorize);expect(transport.mock.calls[1][1].headers.authorization).toBe(init.headers.authorization);
 expect(transport.mock.calls[1][1].headers['apns-id']).toBe(init.headers['apns-id']);expect(transport.mock.calls[1][1].headers['apns-collapse-id']).toBe(init.headers['apns-collapse-id']);
 now+=3000000;await client.send(note,authorize);expect(transport.mock.calls[2][1].headers.authorization).not.toBe(init.headers.authorization);
});
it.each([
 [400,'BadDeviceToken','invalid_token',undefined],[400,'DeviceTokenNotForTopic','invalid_token',undefined],
 [400,'BadTopic','failed',undefined],[410,'Unregistered','invalid_token',undefined],[410,'ExpiredToken','invalid_token',undefined],
 [410,'PRIVATE UNKNOWN','failed',undefined],[403,'Forbidden','failed',undefined],
 [403,'ExpiredProviderToken','retry',900000],[429,'TooManyRequests','retry',60000],
 [429,'TooManyProviderTokenUpdates','retry',1200000],[503,'ServiceUnavailable','retry',900000],[404,'BadPath','failed',undefined],
] as const)('classifies APNs %s %s without returning provider body text',async(status,reason,expected,delay)=>{
 const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify({reason,timestamp:123}),{status}));
 const outcome=await createAPNsClient(config(),transport).send(job(),authorize);
 expect(outcome.status).toBe(expected);expect(outcome.code).toBe('provider_'+status);if(delay)expect(outcome.retryAfterMs).toBe(delay);
 expect(JSON.stringify(outcome)).not.toContain(reason);if(expected==='invalid_token')expect(outcome.invalidatedAt).toBe(123);
});
it('honors bounded retry-after and rejects oversized/unrecognized provider details',async()=>{
 let response=new Response('{"reason":"ServiceUnavailable"}',{status:503,headers:{'retry-after':'9999999'}});
 const transport=vi.fn().mockImplementation(async()=>response),client=createAPNsClient(config(),transport);
 expect((await client.send(job(),authorize)).retryAfterMs).toBe(3600000);
 response=new Response('x'.repeat(4096),{status:410});expect((await client.send(job(),authorize)).status).toBe('failed');
});
it('checks authorization after signing and never fetches expired, invalid or revoked jobs',async()=>{
 const transport=vi.fn(),client=createAPNsClient(config(),transport);
 expect((await client.send(job(),async()=>false)).status).toBe('skipped');
 expect((await client.send({...job(),expiresAt:1},authorize)).status).toBe('skipped');
 expect((await client.send({...job(),deviceToken:'https://evil.test'},authorize)).status).toBe('skipped');
 expect(transport).not.toHaveBeenCalled();
});
it('returns sanitized retry outcomes for ambiguous network errors and fails invalid signing preflight',async()=>{
 const transport=vi.fn().mockRejectedValue(new Error('SECRET TOKEN AND PRIVATE KEY'));
 expect(await createAPNsClient(config(),transport).send(job(),authorize)).toEqual({status:'retry',code:'delivery_error',retryAfterMs:60000});
 await expect(createAPNsClient({...config(),privateKey:'invalid'},transport).prepare()).rejects.toThrow();
});

it.each([301,302,303,307,308])('rejects provider redirect %s without forwarding credentials or deleting the device',async(status)=>{
 const transport=vi.fn(async(_url:string,init:RequestInit)=>{
  // Match the deployed Workers request contract that rejects redirect:error.
  if(init.redirect!=='manual'&&init.redirect!=='follow')throw new TypeError('Unsupported redirect mode');
  return new Response(null,{status,headers:{location:'https://untrusted.example/collect'}});
 });
 const outcome=await createAPNsClient(config(),transport).send(job(),authorize);
 expect(outcome).toEqual({status:'failed',code:'provider_'+status,stopBatch:true});
 expect(transport).toHaveBeenCalledTimes(1);
 expect(transport.mock.calls[0][0]).toMatch(/^https:\/\/api\.sandbox\.push\.apple\.com\/3\/device\//);
});
