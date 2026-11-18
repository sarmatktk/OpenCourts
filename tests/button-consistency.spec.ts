import {test,expect,type Locator} from '@playwright/test';

for(const theme of ['light','dark'] as const)for(const width of [390,1440]){
 test(`primary search actions match court discovery in ${theme} at ${width}px`,async({page})=>{
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  await page.setViewportSize({width,height:1000});
  await page.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const json=path==='/api/auth/me'?{player:{id:'qa',displayName:'QA'},csrfToken:'csrf'}:
    path==='/api/players/blocks'?{players:[],moderator:false}:
    {elements:[],periods:[],timeZone:'UTC',assessments:[],alerts:[],notifications:[],games:[],groups:[],players:[],next:null,nextCursor:null};
   return route.fulfill({json});
  });
  const appearance=(button:Locator)=>button.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,color:s.color,radius:s.borderRadius};});
  await page.goto('/');
  const original=page.locator('.search-submit');
  const normal=await appearance(original);
  expect(normal.color).toBe('rgb(255, 255, 255)');
  await original.hover();await expect(original).toHaveCSS('background-color','rgb(32, 86, 70)');
  const hover=await appearance(original);
  for(const [path,label] of [['/play-together','Find games'],['/play-together/players','Find players'],['/play-together/groups','Search groups'],['/play-together/create','Find courts']]){
   await page.goto(path);const action=page.getByRole('button',{name:label,exact:true});
   await expect(action).toBeEnabled();expect(await appearance(action)).toEqual(normal);
   await action.hover();await expect.poll(()=>appearance(action)).toEqual(hover);
   await action.focus();await expect(action).toHaveCSS('outline-style','solid');
   await action.evaluate(el=>(el as HTMLButtonElement).disabled=true);
   await expect(action).toHaveCSS('opacity','0.6');await expect(action).toHaveCSS('cursor','not-allowed');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.goto('/support.html');const support=page.locator('.support-page-button');expect(await appearance(support)).toEqual(normal);await support.hover();await expect.poll(()=>appearance(support)).toEqual(hover);
 });
}
