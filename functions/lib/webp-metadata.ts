import {AuthError} from './auth';

// The image service may retain a colour-profile or EXIF chunk despite metadata:none.
// Keep only the static image chunks, never persist ancillary/private metadata.
// The service has already decoded, oriented and colour-converted the source image.
export function stripWebpMetadata(bytes:Uint8Array):Uint8Array<ArrayBuffer>{
 const invalid=()=>new AuthError(502,'Image processor returned invalid output.');
 const tag=(at:number)=>String.fromCharCode(...bytes.subarray(at,at+4));
 if(bytes.length<20||tag(0)!=='RIFF'||tag(8)!=='WEBP')throw invalid();
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(view.getUint32(4,true)+8!==bytes.length)throw invalid();
 const chunks:Uint8Array[]=[];let length=12,images=0,extended=0;
 for(let at=12;at<bytes.length;){
  if(at+8>bytes.length)throw invalid();
  const name=tag(at),size=view.getUint32(at+4,true),end=at+8+size+(size%2);
  if(end>bytes.length)throw invalid();
  if(name==='ANIM'||name==='ANMF')throw new AuthError(502,'Animated image output is not allowed.');
  if(['VP8X','VP8 ','VP8L','ALPH'].includes(name)){
   const chunk=bytes.slice(at,end);
   if(name==='VP8X'){
    if(size!==10||++extended>1||chunks.length)throw invalid();
    if(chunk[8]&0x02)throw new AuthError(502,'Animated image output is not allowed.');
    // ICC profile, EXIF and XMP flags must agree with the removed chunks.
    chunk[8]&=~(0x20|0x08|0x04);
   }
   if(name==='VP8 '||name==='VP8L')images++;
   chunks.push(chunk);length+=chunk.length;
  }
  at=end;
 }
 if(images!==1)throw invalid();
 const result=new Uint8Array(length);result.set(bytes.subarray(0,12));
 new DataView(result.buffer).setUint32(4,length-8,true);
 let offset=12;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}
 return result;
}
