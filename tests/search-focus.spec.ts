import {test,expect,type Locator} from '@playwright/test';
const id='20000000-0000-4000-8000-000000000001';
for(const theme of ['light','dark'] as const)for(const width of [390,1440]){
 test(`search focus has one shared boundary and top links do not stay filled in ${theme} at ${width}px`,async({page})=>{
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});
  await page.route('**/api/**',route=>{
   const p=new URL(route.request().url()).pathname;
   const json=p==='/api/auth/me'?{player:{id:'qa',displayName:'QA'},csrfToken:'csrf'}:
    p==='/api/groups/'+id?{group:{id,name:'QA Group',visibility:'private',generalLocation:'Fairfax'},membership:{status:'active',role:'member'},content:{description:'Private',skillPreference:'any',version:1}}:
    {elements:[],periods:[],timeZone:'UTC',players:[],groups:[],games:[],notifications:[],assessments:[],alerts:[],next:null,nextCursor:null};
   return route.fulfill({json});
  });
  const boundary=(el:Locator)=>el.evaluate(node=>{const s=getComputedStyle(node);return {border:s.borderTopColor,glow:s.boxShadow,outline:s.outlineStyle};});
  await page.goto('/');const main=page.locator('.searchbox input');await main.focus();
  await expect(page.locator('.searchbox')).toHaveCSS('border-top-color',theme==='light'?'rgb(85, 116, 95)':'rgb(189, 215, 139)');
  const reference=await boundary(page.locator('.searchbox'));
  expect(reference.outline).toBe('none');expect(reference.glow).not.toBe('none');
  await expect(main).toHaveCSS('outline-style','none');await expect(main).toHaveCSS('box-shadow','none');await expect(main).toHaveCSS('border-top-width','0px');
  await page.goto('/play-together');const wrapped=page.locator('.pt-search-input input');await wrapped.focus();
  await expect.poll(()=>boundary(page.locator('.pt-search-input'))).toEqual(reference);
  await expect(wrapped).toHaveCSS('outline-style','none');await expect(wrapped).toHaveCSS('box-shadow','none');await expect(wrapped).toHaveCSS('border-top-width','0px');
  for(const [path,selector] of [['/play-together/players','.pt-autocomplete>input'],['/play-together/players','input[type=search]'],['/play-together/groups','.pt-game-search input'],['/play-together/create','.pt-location-search input'],['/play-together/group?id='+id,'.pt-member-search input']]){
   await page.goto(path);const input=page.locator(selector).first();await input.focus();await expect.poll(()=>boundary(input)).toEqual(reference);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  if(width===1440){
   await page.goto('/play-together/groups');const nav=page.getByRole('navigation',{name:'Main navigation'});
   const current=nav.getByRole('link',{name:'Groups',exact:true});await expect(current).toHaveAttribute('aria-current','page');await expect(current).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
   await current.hover();await expect(current).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
   await nav.getByRole('link',{name:'My Feed',exact:true}).click();await expect(page).toHaveURL(/\/feed$/);
   const active=page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'My Feed',exact:true});await page.mouse.move(0,0);await expect(active).toHaveAttribute('aria-current','page');await expect(active).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await active.focus();await expect(active).toHaveCSS('outline-style','solid');
  }
 });
}
