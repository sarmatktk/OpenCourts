import {chooseOption} from './picker-helpers';
import {test,expect} from '@playwright/test';
for(const width of [375,1440])for(const colorScheme of ['light','dark'] as const){test(`scheduling blocks past dates and times in court timezone ${width} ${colorScheme}`,async({page})=>{
 await page.clock.install({time:new Date('2026-11-18T15:30:45Z')});await page.setViewportSize({width,height:800});await page.emulateMedia({colorScheme});
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player:{id:'host',displayName:'Host'},csrfToken:'csrf'}}));await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[]}}));
 await page.goto('/play-together/create');await chooseOption(page,page.getByRole('combobox',{name:'Time zone',exact:true}),'America/New York');await page.getByRole('button',{name:'Choose date and time',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Choose game date and time'});
 await expect(dialog.getByRole('button',{name:'November 17, 2026',exact:true})).toBeDisabled();await expect(dialog.getByRole('button',{name:'Previous month'})).toBeDisabled();await expect(dialog.getByRole('button',{name:'November 18, 2026',exact:true})).toBeEnabled();
 const hour=dialog.getByRole('textbox',{name:'Hour',exact:true}),minute=dialog.getByRole('textbox',{name:'Minute',exact:true});
 await hour.fill('9');await minute.fill('30');await expect(dialog.getByRole('button',{name:'Apply date and time'})).toBeDisabled();
 await hour.fill('10');await minute.fill('30');await expect(dialog.getByRole('button',{name:'Apply date and time'})).toBeDisabled();
 await minute.fill('31');await expect(dialog.getByRole('button',{name:'Apply date and time'})).toBeEnabled();
 await dialog.getByRole('button',{name:'Apply date and time'}).click();const field=page.getByLabel('Start date and time',{exact:true});await expect(field).toHaveValue('2026-11-18T10:31');await field.fill('2026-11-17T10:00');expect(await field.evaluate((e:HTMLInputElement)=>e.checkValidity())).toBe(false);
 await field.fill('2026-11-18T10:31');await page.clock.fastForward(120000);expect(await field.evaluate((e:HTMLInputElement)=>e.checkValidity())).toBe(false);
 await chooseOption(page,page.getByRole('combobox',{name:'Time zone',exact:true}),'Asia/Tokyo');await page.getByRole('button',{name:'Choose date and time',exact:true}).click();await expect(dialog.getByRole('button',{name:'November 18, 2026',exact:true})).toBeDisabled();await expect(dialog.getByRole('button',{name:'November 19, 2026',exact:true})).toBeEnabled();
 await dialog.getByRole('button',{name:'November 20, 2026',exact:true}).click();await dialog.getByRole('textbox',{name:'Hour',exact:true}).fill('12');await dialog.getByRole('textbox',{name:'Minute',exact:true}).fill('00');await dialog.getByRole('button',{name:'AM',exact:true}).click();await expect(dialog.getByRole('button',{name:'Apply date and time'})).toBeEnabled();await dialog.getByRole('button',{name:'Close calendar'}).click();
 });}
