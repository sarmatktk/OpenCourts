import {it,expect,vi,afterEach,beforeEach} from 'vitest';
import {getCourts} from '../src/services';
function store(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)};}
beforeEach(()=>vi.stubGlobal('window',{location:{origin:'http://localhost'}}));
afterEach(()=>vi.unstubAllGlobals());
const key='opencourts-courts-v26-38.000--77.000';const court={id:'saved',name:'Saved Park',address:'Street',contextCached:true,lat:38,lon:-77};
it('fresh US court data returns without a network lookup',async()=>{const s=store();s.setItem(key,JSON.stringify({savedAt:Date.now(),courts:[court]}));vi.stubGlobal('sessionStorage',s);const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);expect((await getCourts(38,-77))[0].id).toBe('saved');expect(fetcher).not.toHaveBeenCalled();});
it('older results show immediately and refresh in the background',async()=>{const s=store();s.setItem(key,JSON.stringify({savedAt:Date.now()-7*3600000,courts:[court]}));vi.stubGlobal('sessionStorage',s);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({elements:[]})));const update=vi.fn();expect((await getCourts(38,-77,undefined,'',update))[0].id).toBe('saved');await vi.waitFor(()=>expect(update).toHaveBeenCalledWith([]));expect(JSON.parse(s.getItem(key)!).courts).toEqual([]);});
it('results over one day old and legacy arrays cannot remain indefinitely',async()=>{for(const old of [{savedAt:Date.now()-25*3600000,courts:[court]},[court]]){const s=store();s.setItem(key,JSON.stringify(old));vi.stubGlobal('sessionStorage',s);const f=vi.fn().mockResolvedValue(Response.json({elements:[]}));vi.stubGlobal('fetch',f);expect(await getCourts(38,-77)).toEqual([]);expect(f).toHaveBeenCalled();}});
