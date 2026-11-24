import {importPKCS8,SignJWT} from 'jose';
import type {PushEnv} from './push';
import {nativePushRegistrationEnabled,nativePushToken} from './native-push';

// Closed, generic templates only. Never accept caller-supplied alert text or URLs.
export const apnsMessages:Readonly<Record<string,string>>=Object.freeze({
 chat_message:'You have new chat messages.',game_invited:'You have received a game invitation.',
 requested:'A player has requested to join your game.',withdrawn:'A player withdrew their request to join your game.',
 approved:'Your request to join a game was approved.',rejected:'Your request to join a game was declined.',
 waitlisted:'A capacity change moved you out of a confirmed place.',confirmed:'Your place in the game is confirmed.',
 removed:'You have been removed from a game.',game_cancelled:'A game you are involved in has been cancelled.',
 cancelled:'A player cancelled their place in your game.',guest_requested:'You have a new guest request to review.',
 guest_approved:'Your guest request was approved.',guest_rejected:'Your guest request was declined.',
 guest_cancelled:'A player cancelled their guest places.',discussion_post:'Your group has a new post from an organizer.',
 discussion_reply:'Someone replied to a group discussion you follow.',group_requested:'You have a new group membership request to review.',
 group_active:'Your group membership request was approved.',group_rejected:'Your group membership request was declined.',
 group_removed:'Your membership in a group has ended.',group_archived:'A group you belong to has been archived.',
 schedule_changed:'The time of a game you are involved in has changed.',
 game_reminder_24h:'Reminder: Your game starts in about 24 hours.',
 game_reminder_3h:'Reminder: Your game starts in about 3 hours.',
 waitlist_offer:'A waitlist spot is available. Open OpenCourts to review your offer.',
});
export type APNsJob={deviceToken:string;registrationID:string;deliveryID:string;eventID:string;kind:string;expiresAt:number;target:{type:string;id:string;postId?:string}};
export type APNsOutcome={status:'accepted'|'skipped'|'invalid_token'|'retry'|'failed';code?:string;retryAfterMs?:number;invalidatedAt?:number;stopBatch?:boolean};
export type APNsClient={prepare:()=>Promise<void>;send:(job:APNsJob,authorize:()=>Promise<boolean>)=>Promise<APNsOutcome>};
type Config={teamID:string;keyID:string;privateKey:string;topic:string;environment?:string};
type Transport=(url:string,init:RequestInit)=>Promise<Response>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');

export function apnsSenderEnabled(env:PushEnv){
 return nativePushRegistrationEnabled(env,env.AUTH_ORIGIN??'')&&env.APNS_SENDER_ENABLED==='true'&&
  /^[A-Z0-9]{10}$/.test(env.APNS_TEAM_ID??'')&&/^[A-Z0-9]{10}$/.test(env.APNS_KEY_ID??'')&&
  typeof env.APNS_PRIVATE_KEY==='string'&&env.APNS_PRIVATE_KEY.startsWith('-----BEGIN PRIVATE KEY-----');
}

export async function apnsPayload(job:APNsJob){
 const known=Object.hasOwn(apnsMessages,job.kind),kind=known?job.kind:'activity';
 const target=['game','group'].includes(job.target.type)&&uuid.test(job.target.id)?{
  type:job.target.type,id:job.target.id,
  ...(job.target.type==='group'&&uuid.test(job.target.postId??'')?{postId:job.target.postId}:{}),
 }:undefined;
 const tag='oc-'+(await digest(job.eventID)).slice(0,40);
 return {aps:{alert:{title:'OpenCourts',body:known?apnsMessages[job.kind]:'You have an OpenCourts update.'},sound:'default'},version:1,kind,tag,
  ...(uuid.test(job.registrationID)?{registrationId:job.registrationID}:{}),...(target?{target}:{})};
}

async function responseDetails(response:Response):Promise<{reason?:string;timestamp?:number}>{
 if(!response.body)return {};
 const reader=response.body.getReader();let content='',bytes=0;const decoder=new TextDecoder();
 try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>2048){await reader.cancel();return {};}content+=decoder.decode(part.value,{stream:true});}content+=decoder.decode();
  const value:unknown=JSON.parse(content);if(!value||typeof value!=='object')return {};
  const data=value as Record<string,unknown>;
  return {reason:typeof data.reason==='string'?data.reason:undefined,timestamp:typeof data.timestamp==='number'&&Number.isFinite(data.timestamp)&&data.timestamp>=0?data.timestamp:undefined};
 }catch{return {};}finally{reader.releaseLock();}
}
function retryAfter(response:Response,now:number){
 const header=response.headers.get('retry-after');if(!header)return 0;
 const delay=/^\d+$/.test(header)?Number(header)*1000:Date.parse(header)-now;
 return Number.isFinite(delay)?Math.min(3600000,Math.max(0,delay)):0;
}

export function createAPNsClient(config:Config,transport:Transport=(url,init)=>fetch(url,init),clock:()=>number=Date.now):APNsClient{
 let cached:{token:string;issued:number}|undefined,preparing:Promise<void>|undefined;
 const prepare=async()=>{
  const now=Math.floor(clock()/1000);if(cached&&now>=cached.issued&&now-cached.issued<3000)return;
  if(preparing)return preparing;
  preparing=(async()=>{const key=await importPKCS8(config.privateKey,'ES256');const token=await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:config.keyID}).setIssuer(config.teamID).setIssuedAt(now).sign(key);cached={token,issued:now};})();
  try{await preparing;}finally{preparing=undefined;}
 };
 return {prepare,async send(job,authorize){
  if(!nativePushToken(job.deviceToken)||!Number.isFinite(job.expiresAt)||job.expiresAt<=clock())return {status:'skipped',code:'expired_or_invalid'};
  try{
   await prepare();const bearer=cached!.token,payload=await apnsPayload(job),body=JSON.stringify(payload);
   if(new TextEncoder().encode(body).byteLength>4096)return {status:'failed',code:'invalid_payload'};
   const hash=(await digest(job.deliveryID)).slice(0,32),requestID=hash.replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5');
   // Last DB/access check follows signing and payload work, immediately before egress.
   if(!await authorize()||job.expiresAt<=clock())return {status:'skipped',code:'authorization_changed'};
   const apnsHost=config.environment==='production'?'https://api.push.apple.com':'https://api.sandbox.push.apple.com';
   const response=await transport(apnsHost+'/3/device/'+job.deviceToken,{
    // Workers supports manual redirects; never forward the provider credential to another host.
    method:'POST',redirect:'manual',signal:AbortSignal.timeout(5000),
    headers:{authorization:'bearer '+bearer,'content-type':'application/json','apns-topic':config.topic,
     'apns-push-type':'alert','apns-priority':'10','apns-id':requestID,'apns-collapse-id':payload.tag,
     'apns-expiration':String(Math.floor(Math.min(job.expiresAt,clock()+3600000)/1000))},body,
   });
   if(response.status===200)return {status:'accepted'};
   if(response.status>=300&&response.status<400)return {status:'failed',code:'provider_'+response.status,stopBatch:true};
   const detail=await responseDetails(response),code='provider_'+response.status;
   if((response.status===410&&['Unregistered','ExpiredToken'].includes(detail.reason??''))||
      (response.status===400&&['BadDeviceToken','DeviceTokenNotForTopic'].includes(detail.reason??'')))return {status:'invalid_token',code,invalidatedAt:detail.timestamp};
   if(response.status===403&&detail.reason==='ExpiredProviderToken'){cached=undefined;return {status:'retry',code,retryAfterMs:900000,stopBatch:true};}
   if(response.status===429)return {status:'retry',code,retryAfterMs:Math.max(detail.reason==='TooManyProviderTokenUpdates'?1200000:60000,retryAfter(response,clock())),stopBatch:detail.reason==='TooManyProviderTokenUpdates'};
   if(response.status>=500)return {status:'retry',code,retryAfterMs:Math.max(900000,retryAfter(response,clock()))};
   return {status:'failed',code,stopBatch:response.status===403};
  }catch{return {status:'retry',code:'delivery_error',retryAfterMs:60000};}
 }};
}

// Cache provider JWTs for 50 minutes across warm scheduled runs; never log/persist them.
let warm:{config:Config;client:APNsClient}|undefined;
export function defaultAPNsClient(env:PushEnv){
 const config={teamID:env.APNS_TEAM_ID!,keyID:env.APNS_KEY_ID!,privateKey:env.APNS_PRIVATE_KEY!,topic:env.APNS_TOPIC!,environment:env.APNS_ENVIRONMENT};
 if(!warm||Object.entries(config).some(([key,value])=>warm!.config[key as keyof Config]!==value))warm={config,client:createAPNsClient(config)};
 return warm.client;
}
