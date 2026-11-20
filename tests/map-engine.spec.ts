import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
for(const colorScheme of ['light','dark'] as const)test(`upgraded map renders and sanitizes attribution in ${colorScheme}`,async({page})=>{
 await page.setViewportSize({width:1280,height:900});await page.emulateMedia({colorScheme});
 await page.addInitScript(()=>localStorage.setItem('opencourts-place-v2',JSON.stringify({label:'Fairfax, VA',lat:38.8462,lon:-77.3064})));
 await page.route('https://tile.openstreetmap.org/**',r=>r.fulfill({contentType:'image/png',body:readFileSync('public/android-chrome-192x192.png')}));
 await page.route('**/api/**',r=>r.fulfill({json:{player:null,elements:[{type:'node',id:111,lat:38.8462,lon:-77.3064,tags:{name:'Court smoke test',leisure:'pitch',sport:'tennis',access:'public'}}],periods:[],alerts:[],assessments:[]}}));
 const workerResponse=page.waitForResponse(r=>r.url().includes('maplibre-gl-worker')&&r.status()===200);
 await page.goto('/');await workerResponse;await expect(page.getByText('Court smoke test',{exact:true}).first()).toBeVisible();await expect(page.locator('.maplibregl-canvas')).toBeVisible();await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('OpenStreetMap');
 const result=await page.evaluate(async()=>{
  const ml=await import('/node_modules/maplibre-gl/dist/maplibre-gl.mjs');
  (window as any).attributionExecuted=false;const container=document.createElement('div');container.style.cssText='width:100px;height:100px';document.body.append(container);
  const map=new ml.Map({container,style:{version:8,sources:{},layers:[]},attributionControl:false});const control=new ml.AttributionControl({customAttribution:'<details open onload="1" ontoggle="window.attributionExecuted=true">Attribution</details>'});map.addControl(control);
  await new Promise(resolve=>setTimeout(resolve,100));const unsafe=container.querySelector('.maplibregl-ctrl-attrib')!.querySelectorAll('[onload],[ontoggle],[onerror]').length,executed=(window as any).attributionExecuted;map.remove();container.remove();return {unsafe,executed};
 });expect(result).toEqual({unsafe:0,executed:false});
});
