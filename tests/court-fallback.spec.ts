import {test,expect} from '@playwright/test';
for(const width of [320,440,768,1440])for(const colorScheme of ['light','dark'] as const){test(`court fallback and compact selects ${width} ${colorScheme}`,async({page})=>{
 await page.setViewportSize({width,height:956});await page.emulateMedia({colorScheme});
 let submission:any=null;
 await page.route('**/api/**',r=>{
 const path=new URL(r.request().url()).pathname;
 if(path==='/api/auth/me')return r.fulfill({json:{player:{id:'host',displayName:'Host'},csrfToken:'csrf'}});
 if(path==='/api/geocode')return r.fulfill({json:{result:{display_name:'Fairfax, VA 22033',lat:'38.87',lon:'-77.38',country_code:'us',postcode:'22033'}}});
 if(path==='/api/suggest')return r.fulfill({json:{suggestions:[]}});
 if(path==='/api/games'&&r.request().method()==='POST'){submission=r.request().postDataJSON();return r.fulfill({status:400,json:{error:'Synthetic submission captured'}});}
 if(path==='/api/games/courts')return r.fulfill({status:503,json:{error:'Court selection is temporarily unavailable.'}});
 return r.fulfill({json:{notifications:[]}});
 });
 await page.goto('/play-together/create');await page.getByRole('combobox',{name:'Address, city or ZIP code'}).fill('22033');await page.getByRole('button',{name:'Find courts',exact:true}).click();await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
 await page.getByRole('button',{name:'Enter a court manually'}).click();await page.getByLabel('Court or facility name').fill('Franklin Glen Park');await page.getByLabel('Court address or location').fill('Fairfax, VA 22033');await page.getByRole('button',{name:'Locate court address'}).click();await expect(page.getByRole('status')).toContainText('Map location:');
 await expect(page.getByRole('combobox',{name:'Who can find this game?'})).toHaveText('PublicUnlisted');
 await page.getByRole('combobox',{name:'Who can find this game?'}).selectOption('unlisted');await expect(page.getByRole('button',{name:'Create unlisted game',exact:true})).toBeDisabled();
 if(width===320&&colorScheme==='light'){
 await page.getByLabel('Game title').fill('Morning tennis');await page.getByLabel('Start date and time').fill('2026-12-15T10:00');
 await page.getByRole('checkbox',{name:'I will check that this court'}).check();await page.getByRole('checkbox',{name:'I understand that creating'}).check();
 await page.getByRole('button',{name:'Create unlisted game',exact:true}).click();await expect(page.getByText('Synthetic submission captured')).toBeVisible();expect(submission.manualCourt).toEqual({name:'Franklin Glen Park',address:'Fairfax, VA 22033',lat:38.87,lon:-77.38});expect(submission.courtToken).toBeUndefined();
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
 for(const select of await page.locator('select:visible').all()){const box=await select.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);}
 });}
