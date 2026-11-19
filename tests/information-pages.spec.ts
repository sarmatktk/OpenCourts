import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1440])for(const colorScheme of ['light','dark'] as const){test(`information pages reflect community privacy at ${width} ${colorScheme}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme});
 for(const path of ['/privacy.html','/about.html','/contact.html','/support.html','/play-together-help.html']){
 await page.goto(path);await expect(page.locator('h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.locator('html').getAttribute('data-theme')).toBe(colorScheme);
 await expect(page.getByRole('navigation',{name:'Footer'}).getByRole('link',{name:'Play Together help',exact:true})).toHaveAttribute('href','/play-together-help');
 }
 await page.goto('/privacy.html');await expect(page.locator('article')).toContainText('Last updated November 18, 2026');await expect(page.locator('article')).toContainText('Public and private groups');await expect(page.locator('article')).toContainText('seven days');await expect(page.locator('article')).toContainText('does not currently provide a separate analytics-consent toggle');await expect(page.locator('article')).toContainText('Group covers are public');
 await page.getByRole('navigation',{name:'Privacy sections'}).getByRole('link',{name:'Your choices and deletion',exact:true}).click();await expect(page).toHaveURL(/#choices$/);await expect(page.locator('#choices')).toBeVisible();
 });}
