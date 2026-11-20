import {test,expect,type Locator} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';

const staticPages=['privacy','about','contact','support','play-together-help','best-time-to-play-tennis','tennis-courts-after-rain','public-tennis-courts-fairfax-va','public-tennis-courts-atlanta','public-tennis-courts-dallas','public-tennis-courts-los-angeles','public-tennis-courts-miami','404'].map(p=>'/'+p+'.html');
const communityPages=['/account','/play-together','/play-together?find=1','/play-together/feed','/play-together/create','/play-together/my-games','/play-together/groups','/play-together/my-groups','/play-together/create-group','/play-together/players','/play-together/notifications','/play-together/game?id=10000000-0000-4000-8000-000000000001','/play-together/group?id=20000000-0000-4000-8000-000000000001','/play-together/manage-series?id=10000000-0000-4000-8000-000000000001','/play-together/invitation#'+'a'.repeat(64),'/play-together/game-invitation#'+'a'.repeat(64)];
const header='header :is(a.brand,a.page-brand)',footer='footer :is(a.brand,a.page-brand),.pt-footer a.brand';
async function fingerprint(logo:Locator){
 return logo.evaluate(el=>{
  const pick=(node:Element)=>{const s=getComputedStyle(node);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,spacing:s.letterSpacing,color:s.color,background:s.backgroundColor,border:s.border,width:s.width,height:s.height,gap:s.gap,display:s.display,radius:s.borderRadius};};
  const mark=el.querySelector('.brand-mark,.page-brand-mark')!,svg=mark.querySelector('svg')!,word=el.querySelector('span:last-child')!,light=el.querySelector('.brand-light,.page-brand-light')!;
  const outer=getComputedStyle(el);return {outer:{font:outer.fontFamily,size:outer.fontSize,weight:outer.fontWeight,spacing:outer.letterSpacing,color:outer.color,gap:outer.gap},mark:pick(mark),svg:{width:getComputedStyle(svg).width,height:getComputedStyle(svg).height,viewBox:svg.getAttribute('viewBox'),geometry:[...svg.children].map(n=>({tag:n.tagName,attrs:Object.fromEntries(['cx','cy','r','d','stroke','stroke-width','fill'].map(a=>[a,n.getAttribute(a)?.replace(/\s+/g,'')??null]))}))},word:{display:getComputedStyle(word).display,color:getComputedStyle(word).color},light:{color:getComputedStyle(light).color,weight:getComputedStyle(light).fontWeight}};
 });
}
for(const width of [390,768,1440])for(const colorScheme of ['light','dark'] as const)test(`all page logos match main ${width} ${colorScheme}`,async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
 // Exercise signed-out/error chrome without fetching private records or external APIs.
 await page.route('**/api/**',r=>new URL(r.request().url()).pathname==='/api/auth/me'?r.fulfill({json:{player:null,providers:{google:true,apple:true},connectedProviders:[],csrfToken:null}}):r.fulfill({status:503,json:{error:'Synthetic branding audit unavailable state.'}}));
 await page.goto('/');await expect(page.locator(header)).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 const reference={header:await fingerprint(page.locator(header)),footer:await fingerprint(page.locator(footer))};
 expect(reference.header.outer.size).toBe(width<=620?'20px':'22px');expect(reference.footer.outer.size).toBe('16px');expect(reference.header.mark.width).toBe(width<=620?'37px':'36px');expect(reference.footer.mark.width).toBe('26px');
 const records=[];
 for(const path of [...staticPages,...communityPages]){
  await page.goto(path);await expect(page.locator(header),path+' header').toBeVisible();await expect(page.locator(footer),path+' footer').toBeAttached();await page.evaluate(()=>document.fonts.ready);
  const actual={header:await fingerprint(page.locator(header)),footer:await fingerprint(page.locator(footer))};expect(actual,path).toEqual(reference);
  for(const [position,selector] of [['header',header],['footer',footer]] as const){const logo=page.locator(selector);await expect(logo).toHaveAttribute('href',/^(\/|#top)$/);await expect(logo).toHaveAccessibleName('OpenCourts home');await logo.hover();expect(await fingerprint(logo),path+' '+position+' hover').toEqual(reference[position]);await logo.focus();await expect(logo).toHaveCSS('outline-style','solid');}
  if(['/terms.html','/delete-account.html','/privacy.html','/support.html','/public-tennis-courts-fairfax-va.html','/404.html','/play-together/feed'].includes(path))for(const [name,selector] of [['header',header],['footer',footer]])await page.locator(selector).screenshot({path:'.wrangler/qa-audit/branding-'+path.split(/[?#]/)[0].replace(/\W+/g,'-')+'-'+name+'-'+width+'-'+colorScheme+'.png'});
  records.push({path,...actual});
 }
 mkdirSync('.wrangler/qa-audit',{recursive:true});writeFileSync('.wrangler/qa-audit/branding-'+width+'-'+colorScheme+'.json',JSON.stringify({reference,records},null,2));
});

test('shared branding follows live device theme changes',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.route('**/api/**',r=>r.fulfill({json:{player:null,providers:{google:true,apple:true},connectedProviders:[],csrfToken:null,notifications:[]}}));
 for(const path of ['/','/privacy.html','/account']){
  await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});await page.goto(path);
  for(const mode of ['dark','light'] as const){await page.emulateMedia({colorScheme:mode});
   for(const selector of [header,footer]){await expect(page.locator(selector).locator('.brand-mark,.page-brand-mark')).toHaveCSS('color',mode==='dark'?'rgb(225, 242, 174)':'rgb(18, 61, 50)');}
  }
 }
});
