import {test,expect,devices} from '@playwright/test';
const profiles=[{name:'iPhone-sized touch',options:{...devices['iPhone 13']}},{name:'Android Pixel 7',options:{...devices['Pixel 7']}},{name:'Android Galaxy S9',options:{...devices['Galaxy S9+']}},{name:'tablet touch',options:{viewport:{width:768,height:1024},hasTouch:true,isMobile:true}},{name:'desktop',options:{viewport:{width:1440,height:900},hasTouch:false,isMobile:false}}];
for(const profile of profiles)for(const colorScheme of ['light','dark'] as const){test(`one site dropdown per touch with no native select focus ${profile.name} ${colorScheme}`,async({browser})=>{
 const context=await browser.newContext({...profile.options,colorScheme});const page=await context.newPage();
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;return r.fulfill({json:p==='/api/auth/me'?{player:{id:'host',displayName:'Host'},csrfToken:'csrf'}:{games:[],notifications:[],players:[],groups:[]}});});
 for(const path of ['/play-together#search','/play-together/create','/play-together/players']){
 await page.goto(path);const controls=page.locator('.oc-select-trigger:visible');await expect(controls.first()).toBeVisible();
 for(const trigger of await controls.all()){
 await trigger.scrollIntoViewIfNeeded();await (profile.options.hasTouch?trigger.tap():trigger.click());await expect(page.getByRole('listbox')).toHaveCount(1);await expect(trigger).toBeFocused();expect(await page.evaluate(()=>document.activeElement?.tagName)).toBe('BUTTON');
 const native=trigger.locator('..').locator('select');await expect(native).toBeHidden();await expect(native).toHaveAttribute('aria-hidden','true');await expect(native).toHaveAttribute('tabindex','-1');
 const bounds=await page.getByRole('listbox').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
 const blocked=await page.locator('select').evaluateAll(nodes=>nodes.every(e=>getComputedStyle(e).display==='none'));expect(blocked).toBe(true);
 const options=page.getByRole('listbox').getByRole('option');const target=await options.evaluateAll(rows=>rows.findIndex((e,i)=>i>0&&e.getAttribute('aria-disabled')!=='true'));
 if(target>=0){const text=await options.nth(target).locator('span').innerText();await (profile.options.hasTouch?options.nth(target).tap():options.nth(target).click());await expect(trigger).toHaveText(text);}else await page.keyboard.press('Escape');
 await expect(page.getByRole('listbox')).toHaveCount(0);
 }
 }
 await page.goto('/play-together/create');const visibility=page.getByRole('combobox',{name:'Who can find this game?',exact:true});await visibility.focus();await page.keyboard.press('Space');await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(visibility).toHaveText('Unlisted');
 await page.getByRole('button',{name:'Choose date and time',exact:true}).click();const hour=page.getByRole('dialog').getByRole('textbox',{name:'Hour',exact:true});await hour.fill('3');await page.getByRole('dialog').getByRole('button',{name:'PM',exact:true}).click();await expect(hour).toHaveValue('3');await expect(page.getByRole('listbox')).toHaveCount(0);await context.close();
 });}
