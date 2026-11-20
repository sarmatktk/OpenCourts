import {cleanupMedia} from './media-cleanup';
import {AuthError,assertEnvironment,session,requireSession,checkOrigin,checkCsrf,json,type AuthEnv,type AuthDatabase} from './auth';
interface Bucket {put(key:string,value:ArrayBuffer,options?:unknown):Promise<unknown>;get(key:string):Promise<{body:ReadableStream}|null>;delete(key:string):Promise<void>}
export type MediaEnv=AuthEnv&{MEDIA_UPLOADS_ENABLED?:string;PLAY_TOGETHER_MEDIA?:Bucket;PLAY_TOGETHER_IMAGE_PROCESSOR?:{fetch(request:Request):Promise<Response>}};
const fail=(status:number,message:string):never=>{throw new AuthError(status,message);};
async function bounded(request:Request|Response,max:number){if(Number(request.headers.get('Content-Length'))>max)return fail(413,'Image is too large.');const reader=request.body?.getReader();if(!reader)return fail(400,'Choose an image.');const parts:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();return fail(413,'Image is too large.');}parts.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return bytes;}
// Inspect actual encoded output, not just the processor's content-type header.
export function safeWebp(bytes:Uint8Array,kind:string){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),ascii=(n:number)=>String.fromCharCode(...bytes.slice(n,n+4));if(bytes.length<20||ascii(0)!=='RIFF'||ascii(8)!=='WEBP'||view.getUint32(4,true)+8!==bytes.length)throw new AuthError(502,'Image processor returned invalid output.');let width=0,height=0;for(let at=12;at+8<=bytes.length;){const tag=ascii(at),size=view.getUint32(at+4,true),start=at+8;if(start+size>bytes.length)throw new AuthError(502,'Invalid image chunk.');if(['EXIF','XMP ','ANIM','ANMF','ICCP'].includes(tag))throw new AuthError(502,'Image metadata or animation could not be removed.');if(tag==='VP8X'&&size>=10){width=1+bytes[start+4]+(bytes[start+5]<<8)+(bytes[start+6]<<16);height=1+bytes[start+7]+(bytes[start+8]<<8)+(bytes[start+9]<<16);}if(tag==='VP8 '&&size>=10){width=view.getUint16(start+6,true)&16383;height=view.getUint16(start+8,true)&16383;}if(tag==='VP8L'&&size>=5){const bits=view.getUint32(start+1,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;}at=start+size+(size%2);}
 const maxW=kind==='player'?512:1200,maxH=kind==='player'?512:600;if(width<1||height<1||width>maxW||height>maxH)throw new AuthError(502,'Image processor returned invalid dimensions.');return {width,height};}
async function permission(db:AuthDatabase,kind:string,id:string,playerId:string|null,write:boolean){
 if(kind==='player')return playerId===id;
 const group=await db.prepare('SELECT owner_id,status FROM tennis_groups WHERE id=?').bind(id).first<{owner_id:string;status:string}>();if(!group||group.status!=='active')return false;if(!write)return true;if(!playerId)return false;
 const membership=await db.prepare("SELECT COALESCE(assigned_role,role) AS role FROM group_memberships WHERE group_id=? AND player_id=? AND status='active'").bind(id,playerId).first<{role:string}>();return !!membership&&(group.owner_id===playerId||membership.role==='coowner');
}
export async function handleMedia(request:Request,env:MediaEnv){try{
 const {db,origin}=assertEnvironment(request,env);const match=new URL(request.url).pathname.match(/^\/api\/media\/(player|group)\/([A-Za-z0-9_-]{1,100})$/);if(!match)return fail(404,'Image not found.');const [,kind,id]=match;const actor=await session(request,db,origin);const write=request.method!=='GET';
 if(write){checkOrigin(request,origin);checkCsrf(request,requireSession(actor));}
 if(!await permission(db,kind,id,actor?.id??null,write))return fail(404,'Image not found.');
 const existing=await db.prepare('SELECT object_key,version FROM media_assets WHERE kind=? AND subject_id=?').bind(kind,id).first<{object_key:string;version:string}>();
 if(request.method==='GET'){if(!existing||!env.PLAY_TOGETHER_MEDIA)return fail(404,'Image not found.');if(kind==='group'&&new URL(request.url).searchParams.get('v')!==existing.version){const target=new URL(request.url);target.searchParams.set('v',existing.version);return new Response(null,{status:302,headers:{Location:target.pathname+target.search,'Cache-Control':'no-store'}});}const object=await env.PLAY_TOGETHER_MEDIA.get(existing.object_key);if(!object)return fail(404,'Image not found.');return new Response(object.body,{headers:{'Content-Type':'image/webp','Cache-Control':kind==='group'?'public, max-age=3600':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});}
 if(!['PUT','DELETE'].includes(request.method))return fail(405,'Method not allowed.');if(env.MEDIA_UPLOADS_ENABLED!=='true'||!env.PLAY_TOGETHER_MEDIA||!env.PLAY_TOGETHER_IMAGE_PROCESSOR)return fail(503,'Photo uploads are not enabled yet.');
 const bucket=env.PLAY_TOGETHER_MEDIA,now=Date.now(),actorId=actor!.id;
 const live=`EXISTS(SELECT 1 FROM auth_sessions s JOIN players p ON p.id=s.player_id WHERE s.player_id=? AND s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active')`;
 const auth=[actorId,actor!.token_hash,now];
 const allowed=kind==='player'?`EXISTS(SELECT 1 FROM players WHERE id=? AND id=? AND status='active')`:`EXISTS(SELECT 1 FROM tennis_groups g JOIN group_memberships m ON m.group_id=g.id WHERE g.id=? AND m.player_id=? AND m.status='active' AND g.status='active' AND (g.owner_id=m.player_id OR COALESCE(m.assigned_role,m.role)='coowner'))`;
 let key:string|null=null;
 if(request.method==='PUT'){
 const type=request.headers.get('Content-Type')??'';if(!['image/jpeg','image/png','image/webp'].includes(type))return fail(415,'Choose JPEG, PNG or WebP.');const input=await bounded(request,5*1024*1024);const response=await env.PLAY_TOGETHER_IMAGE_PROCESSOR.fetch(new Request('https://image-processor/'+(kind==='player'?'avatar':'cover'),{method:'POST',headers:{'Content-Type':type},body:input}));if(!response.ok)return fail(400,'Image could not be resized. Try a different image.');const output=await bounded(response,1024*1024);safeWebp(output,kind);key=kind+'/'+crypto.randomUUID()+'.webp';await bucket.put(key,output.buffer,{httpMetadata:{contentType:'image/webp'}});
 }
 let committed=false;let savedVersion:string|null=null;
 try{
 const version=crypto.randomUUID();const mutation=request.method==='DELETE'?db.prepare(`DELETE FROM media_assets WHERE kind=? AND subject_id=? AND version=? AND ${live} AND ${allowed}`).bind(kind,id,existing?.version??'',...auth,id,actorId):existing?db.prepare(`UPDATE media_assets SET object_key=?,version=?,updated_at=? WHERE kind=? AND subject_id=? AND version=? AND ${live} AND ${allowed}`).bind(key,version,now,kind,id,existing.version,...auth,id,actorId):db.prepare(`INSERT INTO media_assets(kind,subject_id,object_key,version,updated_at) SELECT ?,?,?,?,? WHERE ${live} AND ${allowed} ON CONFLICT(kind,subject_id) DO NOTHING`).bind(kind,id,key,version,now,...auth,id,actorId);
 const result=await mutation.run();if(!result.meta.changes&&!(request.method==='DELETE'&&!existing))throw new AuthError(409,'Photo or permissions changed. Refresh and try again.');
 committed=true;savedVersion=version;
 if(existing)await db.prepare('INSERT OR IGNORE INTO media_cleanup(object_key,queued_at) VALUES (?,?)').bind(existing.object_key,now).run();
 }catch(e){if(key&&!committed)await bucket.delete(key).catch(()=>{});throw e;}
 await cleanupMedia(db,bucket);
 return json({ok:true,url:request.method==='DELETE'?null:'/api/media/'+kind+'/'+id+'?v='+savedVersion});
 }catch(e){return json({error:e instanceof AuthError?e.message:'Photo service is unavailable.'},e instanceof AuthError?e.status:503);}}
