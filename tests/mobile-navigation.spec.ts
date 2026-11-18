import {test,expect} from '@playwright/test';
for(const theme of ['light','dark'] as const){
 test('floating navigation fits phones and tablets in '+theme,async({page})=>{
  await page.emulateMedia({colorScheme:theme});
  await page.route('**/api/**',r=>r.fulfill({json:r.request().url().includes('auth/me')?{player:null,csrfToken:null}:{games:[],groups:[],notifications:[],nextCursor:null}}));
  for(const width of [320,768,1024]){
   await page.setViewportSize({width,height:900});await page.goto('/play-together/feed');
   const dock=page.getByRole('navigation',{name:'Play Together quick navigation'});
   await expect(dock).toBeVisible();if(width===320)await expect(page.getByRole('button',{name:'Toggle menu'})).toBeHidden();await expect(dock.getByRole('link')).toHaveCount(5);
   await expect(dock.getByRole('link',{name:'My Feed',exact:true})).toHaveAttribute('aria-current','page');
   const bounds=await dock.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
   for(const link of await dock.getByRole('link').all())expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await expect(dock).toBeInViewport();
  }
  await page.setViewportSize({width:1440,height:900});await expect(page.getByRole('navigation',{name:'Play Together quick navigation'})).toBeHidden();
 });
}

test('map dock links to Play Together without a phone hamburger',async({page})=>{
 await page.setViewportSize({width:320,height:852});
 await page.route('**/api/**',r=>r.fulfill({json:{courts:[],notifications:[],player:null}}));
 await page.goto('/');
 const dock=page.getByRole('navigation',{name:'Quick navigation'});
 await expect(dock.getByRole('link',{name:'Play Together',exact:true})).toHaveAttribute('href','/play-together');
 await expect(page.getByRole('button',{name:'Toggle menu'})).toBeHidden();
 const link=dock.getByRole('link',{name:'Play Together',exact:true});await expect(link).toBeInViewport();
 expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 await link.click();await expect(page).toHaveURL(/\/play-together$/);
});
for(const theme of ['light','dark'] as const){
 test('phone page headings stay compact in '+theme,async({page})=>{
  await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width:393,height:852});
  await page.route('**/api/**',r=>r.fulfill({json:{player:null,providers:{google:true,apple:true},connectedProviders:[],games:[],notifications:[],nextCursor:null}}));
  for(const path of ['/play-together','/play-together/my-games','/play-together/feed','/account']){
   await page.goto(path);await expect(page.locator('.pt-page>.pt-back')).toBeHidden();
   const heading=page.locator('.pt-page h1');await expect(heading).toBeVisible();
   const title=await heading.boundingBox(),header=await page.locator('.topbar').boundingBox();
   expect(title!.y-(header!.y+header!.height)).toBeLessThanOrEqual(45);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
  }
  await page.setViewportSize({width:1440,height:900});await expect(page.locator('.pt-page>.pt-back')).toBeVisible();
 });
}
for(const theme of ['light','dark'] as const){
 test('compact community feed visual in '+theme,async({page})=>{
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width:393,height:852});
  const game={id:'game',title:'Saturday morning doubles',court:{name:'Franklin Glen Park'},startsAt:'2030-06-15T10:00:00Z',endsAt:'2030-06-15T11:00:00Z',timeZone:'UTC',status:'scheduled',visibility:'group',groupId:'group',groupName:'Fairfax Tennis',joined:true,isOrganizer:false,requestStatus:null,playerCount:3,capacity:4};
  await page.route('**/api/**',r=>{const url=r.request().url();if(url.includes('/media/'))return r.fulfill({status:404,body:''});return r.fulfill({json:url.includes('groups/mine')?{groups:[{id:'group',name:'Fairfax Tennis',membershipStatus:'active',status:'active'}]}:url.includes('games/feed')?{games:[game,{...game,id:'next',title:'Sunday singles',startsAt:'2030-06-16T10:00:00Z'}],nextCursor:null}:{player:null,notifications:[]}});});
  await page.goto('/play-together/feed');await expect(page.getByRole('heading',{name:'Saturday morning doubles'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Saturday, Jun 15, 2030'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Fairfax Tennis',exact:true})).toBeVisible();
  const rail=page.locator('.pt-feed-group-rail');expect(await rail.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);for(const link of await rail.getByRole('link').all()){const b=await link.boundingBox();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(393);}
  const buttons=await page.getByRole('group',{name:'Feed filters'}).getByRole('button').all();const boxes=await Promise.all(buttons.map(b=>b.boundingBox()));expect(new Set(boxes.map(b=>b!.y)).size).toBe(1);
  await page.locator('.pt-feed-group-rail').evaluate(el=>{el.scrollLeft=0;});await page.evaluate(()=>window.scrollTo(0,0));await expect(page).toHaveScreenshot('community-feed-'+theme+'.png',{fullPage:true});
  await page.setViewportSize({width:320,height:852});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 });
}
test('unread badge is not clipped and header avatar fills its circle',async({page})=>{
 await page.route('**/api/**',r=>{const url=r.request().url();if(url.includes('/media/player/'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200"><rect width="100" height="200" fill="green"/></svg>'});return r.fulfill({json:url.includes('auth/me')?{player:{id:'player',displayName:'Player'}}:url.includes('notifications')?{notifications:[{readAt:null}]}:{games:[],groups:[],nextCursor:null}});});
 for(const width of [320,440,1440]){await page.setViewportSize({width,height:956});await page.goto('/play-together/feed');const bell=page.getByRole('link',{name:'Notifications, 1 unread',exact:true});await expect(bell).toBeVisible();await expect(bell).toHaveCSS('overflow','visible');await expect(bell.locator('.pt-notification-count')).toHaveText('1');const img=page.locator('.pt-account-avatar');await expect(img).toBeVisible();await expect(img).toHaveCSS('object-fit','cover');await expect(img).toHaveCSS('object-position','50% 25%');const avatarBounds=await img.boundingBox(),accountBounds=await page.getByRole('link',{name:'Account and settings'}).boundingBox();expect(avatarBounds!.width).toBeGreaterThanOrEqual(accountBounds!.width-3);expect(await img.evaluate((el:HTMLImageElement)=>el.naturalHeight)).toBe(200);const badge=await bell.locator('.pt-notification-count').boundingBox();expect(badge!.x+badge!.width).toBeLessThanOrEqual(width);expect(badge!.y).toBeGreaterThanOrEqual(0);}
});
