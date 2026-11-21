export async function savePhotoRequest(kind:'player'|'group',id:string,csrf:string,photo:Blob|null):Promise<{ok:true;url:string|null}>{
 let bytes:ArrayBuffer|undefined;
 if(photo){
  try{bytes=await photo.arrayBuffer();}catch{throw new Error('This photo could not be read. Choose it again and retry.');}
  if(!bytes.byteLength)throw new Error('This photo is empty. Choose it again and retry.');
  if(bytes.byteLength>5*1024*1024)throw new Error('This photo is too large. Choose a photo smaller than 5 MB.');
 }
 let response:Response;
 try{
  // Materialize the bytes before fetch rather than relying on mobile WebKit's Blob upload path.
  response=await fetch('/api/media/'+kind+'/'+encodeURIComponent(id),{method:photo?'PUT':'DELETE',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','X-CSRF-Token':csrf,...(photo?{'Content-Type':photo.type}:{})},...(photo?{body:bytes}:{})});
 }catch{
  throw new Error('Could not connect to save your photo. Check your connection and try again.');
 }
 let data:{ok?:boolean;url?:unknown;error?:unknown}|null=null;
 try{data=await response.json();}catch{/* An HTML gateway/sign-in response is not a successful upload. */}
 if(response.status===401)throw new Error('Your session has expired. Sign in again, then save your photo.');
 if(response.status===413)throw new Error('This photo is too large. Choose a photo smaller than 5 MB.');
 if(!response.ok)throw new Error(typeof data?.error==='string'?data.error:'Your photo could not be saved. Please try again.');
 if(data?.ok!==true||!(data.url===null||typeof data.url==='string'))throw new Error('The photo service returned an unexpected response (HTTP '+response.status+'). Your photo has not been confirmed saved. Please try again.');
 return {ok:true,url:data.url};
}
