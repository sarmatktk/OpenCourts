import {test,expect} from '@playwright/test';
for(const width of [320,375,440,768,1440])for(const colorScheme of ['light','dark'] as const){
 test(`open dropdowns stay within viewport ${width} ${colorScheme}`,async({page})=>{
 await page.setViewportSize({width,height:800});await page.emulateMedia({colorScheme});
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player:{id:'host',displayName:'Host'},csrfToken:'csrf'}}));
 await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[]}}));
 await page.goto('/play-together/create');

 const selects=page.locator('.oc-select-trigger:visible');await expect(selects).toHaveCount(7);
 for(const select of await selects.all()){
 await select.scrollIntoViewIfNeeded();await select.click();
 await expect(select).toHaveAttribute('aria-expanded','true');if(width===375&&colorScheme==='dark')await page.screenshot({path:'.wrangler/qa-audit/site-dropdown-dark.png'});
 const boxes=await page.locator('.oc-options [role=option]').evaluateAll(options=>options.map(e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width};}));
 for(const box of boxes){expect(box.width).toBeGreaterThan(0);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(width);}
 await page.keyboard.press('Escape');await expect(select).toHaveAttribute('aria-expanded','false');
 }
 const visibility=page.getByRole('combobox',{name:'Who can find this game?'});await visibility.focus();await page.keyboard.press('Space');await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(visibility).toHaveText('Unlisted');
 // Long invitation/group labels must wrap inside the same shared picker.
 const format=selects.nth(3);await format.locator('..').locator('select').evaluate(e=>{const o=document.createElement('option');o.value='long-test';o.textContent='A very long game or group name with a date and invitation status that must wrap within a narrow phone viewport';e.appendChild(o);});
 await format.scrollIntoViewIfNeeded();await format.click();const long=await page.locator('.oc-options [role=option]').last().boundingBox();expect(long!.x).toBeGreaterThanOrEqual(0);expect(long!.x+long!.width).toBeLessThanOrEqual(width);await page.keyboard.press('Escape');
 });
}
