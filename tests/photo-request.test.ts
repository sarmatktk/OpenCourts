import {afterEach,it,expect,vi} from 'vitest';
import {savePhotoRequest} from '../src/photo-request';
afterEach(()=>vi.unstubAllGlobals());
const image=()=>new Blob([new Uint8Array([137,80,78,71])],{type:'image/png'});
it('uploads materialized image bytes with the same authenticated API contract',async()=>{
 const fetch=vi.fn(async()=>Response.json({ok:true,url:'/api/media/player/me?v=1'}));vi.stubGlobal('fetch',fetch);
 await expect(savePhotoRequest('player','me','csrf',image())).resolves.toMatchObject({ok:true});
 const [url,init]=fetch.mock.calls[0] as unknown as [string,RequestInit];expect(url).toBe('/api/media/player/me');expect(init.method).toBe('PUT');expect(init.credentials).toBe('same-origin');expect(init.headers).toMatchObject({'Content-Type':'image/png','X-CSRF-Token':'csrf',Accept:'application/json'});expect(init.body).toBeInstanceOf(ArrayBuffer);expect([...new Uint8Array(init.body as ArrayBuffer)]).toEqual([137,80,78,71]);
});
it('does not expose Safari JSON parsing errors or report a non-JSON response as saved',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('<html>Gateway response</html>',{headers:{'Content-Type':'text/html'}})));
 await expect(savePhotoRequest('player','me','csrf',image())).rejects.toThrow('unexpected response (HTTP 200)');
});
it('explains expired sessions even when the response is not JSON',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('Unauthorized',{status:401})));
 await expect(savePhotoRequest('player','me','csrf',image())).rejects.toThrow('Sign in again');
});
it('keeps server validation errors and handles interrupted uploads',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(Response.json({error:'Image could not be resized. Try a different image.'},{status:400})).mockRejectedValueOnce(new TypeError('Load failed'));vi.stubGlobal('fetch',fetch);
 await expect(savePhotoRequest('player','me','csrf',image())).rejects.toThrow('Image could not be resized');await expect(savePhotoRequest('player','me','csrf',image())).rejects.toThrow('Check your connection');
});
it('rejects unreadable or empty photos before starting an upload',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const file=image();vi.spyOn(file,'arrayBuffer').mockRejectedValue(new DOMException('The string did not match the expected pattern.','SyntaxError'));
 await expect(savePhotoRequest('player','me','csrf',file)).rejects.toThrow('Choose it again');await expect(savePhotoRequest('player','me','csrf',new Blob([]))).rejects.toThrow('empty');expect(fetch).not.toHaveBeenCalled();
});
it('removes a photo without sending a binary body',async()=>{
 const fetch=vi.fn(async()=>Response.json({ok:true,url:null}));vi.stubGlobal('fetch',fetch);await expect(savePhotoRequest('player','me','csrf',null)).resolves.toEqual({ok:true,url:null});expect((fetch.mock.calls[0] as unknown as [string,RequestInit])[1]).toMatchObject({method:'DELETE'});
});
