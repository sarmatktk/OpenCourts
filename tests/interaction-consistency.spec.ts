import {test,expect,type Locator} from '@playwright/test';
const id='10000000-0000-4000-8000-000000000001';
const game={id,title:'QA Weekend Tennis',visibility:'public',court:{name:'Park Court',lat:38,lon:-77},startsAt:'2030-06-15T14:00:00Z',endsAt:'2030-06-15T16:00:00Z',timeZone:'UTC',format:'doubles',capacity:4,playerCount:1,status:'scheduled',organizer:{displayName:'QA'}};
for(const theme of ['light','dark'] as const)for(const width of [375,390,1440]){
 test(`selected controls and title links share the main-site palette in ${theme} at ${width}px`,async({page})=>{
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});
  await page.route('**/api/**',route=>{
   const p=new URL(route.request().url()).pathname;
   return route.fulfill({json:p==='/api/auth/me'?{player:{id:'qa',displayName:'QA'},csrfToken:'csrf'}:p==='/api/groups'?{groups:[{id,name:'QA Tennis Group',visibility:'private',generalLocation:'Fairfax'}],next:null}:p==='/api/games/feed'?{games:[game],nextCursor:null}:{elements:[],periods:[],assessments:[],alerts:[],notifications:[],games:[],groups:[],timeZone:'UTC'}});
  });
  const colors=(el:Locator)=>el.evaluate(node=>{const s=getComputedStyle(node);return {background:s.backgroundColor,color:s.color};});
  const selected={background:'rgb(237, 242, 232)',color:'rgb(38, 75, 57)'};
  const hover={background:'rgb(224, 233, 215)',color:'rgb(38, 75, 57)'};
  await page.goto('/');if(width<620)await page.getByRole('button',{name:'Show court list',exact:true}).click();const main=page.getByRole('button',{name:'With lights',exact:true});await main.click();await page.mouse.move(0,0);
  await expect.poll(()=>colors(main)).toEqual(selected);await main.hover();await expect.poll(()=>colors(main)).toEqual(hover);
  await page.goto('/play-together/groups');
  const groupTab=page.getByRole('navigation',{name:'Group navigation'}).getByRole('link',{name:'Find groups',exact:true});
  expect(await colors(groupTab)).toEqual(selected);await groupTab.hover();await expect.poll(()=>colors(groupTab)).toEqual(hover);
  const title=page.getByRole('heading',{name:'QA Tennis Group'}).getByRole('link');await title.hover({position:{x:5,y:5}});await expect(title).toHaveCSS('text-decoration-line','none');await expect.poll(()=>colors(title)).toEqual(selected);
  if(width===1440){const nav=page.getByRole('navigation',{name:'Main navigation'});await expect(nav.getByRole('link',{name:'Groups',exact:true})).toHaveAttribute('aria-current','page');await expect(nav.getByRole('link',{name:'Play Together',exact:true})).not.toHaveAttribute('aria-current','page');}
  await page.goto('/play-together/feed');const all=page.getByRole('button',{name:'All',exact:true});expect(await colors(all)).toEqual(selected);await all.hover();await expect.poll(()=>colors(all)).toEqual(hover);
  const event=page.getByRole('heading',{name:game.title}).getByRole('link');await event.hover({position:{x:5,y:5}});await expect(event).toHaveCSS('text-decoration-line','none');await expect.poll(()=>colors(event)).toEqual(selected);
  if(width<620){
   const nav=page.getByRole('navigation',{name:'Play Together quick navigation'});
   const dock=nav.getByRole('link',{name:'My Feed',exact:true});expect(await colors(dock)).toEqual(selected);
   const search=nav.getByRole('link',{name:'Find games',exact:true}),icon=search.locator('svg');
   for(const colorScheme of [theme,theme==='dark'?'light':'dark'] as const){
    await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
    await expect(icon).toHaveCSS('width','21px');await expect(icon).toHaveCSS('height','21px');await expect(icon).toHaveCSS('margin-top','0px');
    await expect(icon).toHaveCSS('stroke-width','1.9px');expect(await nav.locator('.mobile-nav-search-icon').count()).toBe(0);const boxes=await nav.locator('a svg').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));expect(Math.max(...boxes)-Math.min(...boxes)).toBeLessThanOrEqual(1);
   }
   await search.click();await expect(search).toHaveAttribute('aria-current','page');
   await expect(icon).toHaveCSS('width','21px');await expect(icon).toHaveCSS('height','21px');await expect(icon).toHaveCSS('margin-top','0px');
   await expect(icon).toHaveCSS('stroke-width','1.9px');expect(await nav.locator('.mobile-nav-search-icon').count()).toBe(0);const boxes=await nav.locator('a svg').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));expect(Math.max(...boxes)-Math.min(...boxes)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 });
}
