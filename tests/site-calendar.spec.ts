import {test,expect} from '@playwright/test';
for(const width of [320,375,440,768,1440])for(const colorScheme of ['light','dark'] as const){test(`site calendar fits and selects date/time ${width} ${colorScheme}`,async({page})=>{
 await page.clock.install({time:new Date('2026-11-19T12:00:00Z')});await page.setViewportSize({width,height:800});await page.emulateMedia({colorScheme});
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player:{id:'host',displayName:'Host'},csrfToken:'csrf'}}));await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[]}}));
 await page.goto('/play-together/create');await page.getByRole('button',{name:'Choose date and time',exact:true}).click();const calendar=page.getByRole('dialog',{name:'Choose game date and time'});await expect(calendar).toBeVisible();const box=await calendar.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(800);
 const today=new Date();const label=new Date(today.getFullYear(),today.getMonth(),20).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});await calendar.getByRole('button',{name:label,exact:true}).click();
 await calendar.getByRole('textbox',{name:'Hour',exact:true}).fill('6');await calendar.getByRole('textbox',{name:'Minute',exact:true}).fill('30');await calendar.getByRole('button',{name:'PM',exact:true}).click();
 if(width===375)await page.screenshot({path:`.wrangler/qa-audit/calendar-${colorScheme}.png`});
 await calendar.getByRole('button',{name:'Apply date and time'}).click();await expect(calendar).not.toBeVisible();await expect(page.getByLabel('Start date and time',{exact:true})).toHaveValue(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-20T18:30`);
 await page.getByRole('button',{name:'Choose date and time',exact:true}).click();await page.keyboard.press('Escape');await expect(calendar).not.toBeVisible();await expect(page.getByRole('button',{name:'Choose date and time',exact:true})).toBeFocused();
 });}
