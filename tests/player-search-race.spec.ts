import {test,expect} from '@playwright/test';

test('a late player search cannot overwrite the latest query or its result count',async({page})=>{
 let releaseOld:()=>void=()=>{};
 const oldResponse=new Promise<void>(resolve=>{releaseOld=resolve;});
 let oldStarted=false;
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/auth/me')return route.fulfill({json:{player:{id:'qa',displayName:'QA'},csrfToken:'csrf'}});
  if(url.pathname==='/api/players/blocks')return route.fulfill({json:{players:[],moderator:false}});
  if(url.pathname==='/api/players'){
   const name=url.searchParams.get('name');
   if(name==='Old'){oldStarted=true;await oldResponse;}
   return route.fulfill({json:{players:name?[{id:name,displayName:name+' Player',generalLocation:'Fairfax',skillLevel:'intermediate'}]:[],next:null}}).catch(()=>{});
  }
  return route.fulfill({json:{notifications:[]}});
 });
 await page.goto('/play-together/players');
 const form=page.locator('form').first(),name=page.getByLabel('Player name (optional)');
 await expect(page.getByRole('button',{name:'Find players',exact:true})).toBeEnabled();
 await name.fill('Old');await form.evaluate(form=>(form as HTMLFormElement).requestSubmit());
 await expect.poll(()=>oldStarted).toBe(true);
 await name.fill('New');await form.evaluate(form=>(form as HTMLFormElement).requestSubmit());
 await expect(page.getByText('New Player',{exact:true})).toBeVisible();
 releaseOld();
 // Wait for the old fetch to settle, rather than merely asserting before it arrives.
 await page.waitForTimeout(250);
 await expect(page.getByText('Old Player',{exact:true})).toHaveCount(0);
 await expect(page.getByText('New Player',{exact:true})).toBeVisible();
 await expect(page.locator('.pt-search-status')).toHaveText('1 player found.');
});
