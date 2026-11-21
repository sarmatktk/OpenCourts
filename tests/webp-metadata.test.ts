import {it,expect} from 'vitest';
import {stripWebpMetadata} from '../functions/lib/webp-metadata';
import {safeWebp} from '../functions/lib/media';
function chunk(name:string,body:Uint8Array){const out=new Uint8Array(8+body.length+body.length%2);out.set(new TextEncoder().encode(name));new DataView(out.buffer).setUint32(4,body.length,true);out.set(body,8);return out;}
function riff(chunks:Uint8Array[]){const out=new Uint8Array(12+chunks.reduce((n,c)=>n+c.length,0));out.set(new TextEncoder().encode('RIFF'));new DataView(out.buffer).setUint32(4,out.length-8,true);out.set(new TextEncoder().encode('WEBP'),8);let at=12;for(const c of chunks){out.set(c,at);at+=c.length;}return out;}
function image(){const b=new Uint8Array(10);b.set([0x9d,1,0x2a],3);new DataView(b.buffer).setUint16(6,32,true);new DataView(b.buffer).setUint16(8,32,true);return chunk('VP8 ',b);}
function header(flags=0x3c){const b=new Uint8Array(10);b[0]=flags;b[4]=b[7]=31;return chunk('VP8X',b);}
it('strips private EXIF/XMP/profile and unknown ancillary chunks while preserving image and alpha bytes',()=>{
 const pixels=image(),alpha=chunk('ALPH',new Uint8Array([0,1,2]));const before=riff([header(),chunk('ICCP',new Uint8Array([1,2,3])),alpha,pixels,chunk('EXIF',new TextEncoder().encode('GPS private')),chunk('XMP ',new TextEncoder().encode('Author private')),chunk('JUMB',new Uint8Array([7]))]);expect(()=>safeWebp(before,'player')).toThrow('metadata');const after=stripWebpMetadata(before);expect(safeWebp(after,'player')).toEqual({width:32,height:32});expect(after).toEqual(riff([header(0x10),alpha,pixels]));expect(new DataView(after.buffer).getUint32(4,true)).toBe(after.length-8);
});
it('leaves simple static pixel data unchanged',()=>{const bytes=riff([image()]);expect(stripWebpMetadata(bytes)).toEqual(bytes);});
it('continues rejecting animation chunks and flags',()=>{
 for(const bytes of [riff([header(0x02),image()]),riff([chunk('ANIM',new Uint8Array(6)),image()]),riff([chunk('ANMF',new Uint8Array(16)),image()])])expect(()=>stripWebpMetadata(bytes)).toThrow('Animated');
});
it('rejects truncated/overlong containers, chunks, duplicate bitstreams and invalid extended headers',()=>{
 const valid=riff([image()]);const badSize=valid.slice();new DataView(badSize.buffer).setUint32(16,1000,true);
 for(const bytes of [valid.subarray(0,10),valid.subarray(0,valid.length-1),badSize,riff([image(),image()]),riff([header(),header(),image()]),riff([chunk('VP8X',new Uint8Array(9)),image()]),riff([chunk('EXIF',new Uint8Array([1]))])])expect(()=>stripWebpMetadata(bytes)).toThrow();
});
it('retains dimension enforcement after metadata removal',()=>{const body=new Uint8Array(10);new DataView(body.buffer).setUint16(6,513,true);new DataView(body.buffer).setUint16(8,32,true);const bytes=stripWebpMetadata(riff([chunk('ICCP',new Uint8Array([1])),chunk('VP8 ',body)]));expect(()=>safeWebp(bytes,'player')).toThrow('dimensions');});
