import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
for(const width of [320,390,768,1440])for(const colorScheme of ['light','dark'] as const){test(`information pages reflect community privacy at ${width} ${colorScheme}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
 for(const path of ['/privacy.html','/about.html','/contact.html','/support.html','/play-together-help.html','/terms.html','/delete-account.html']){
 await page.goto(path);await expect(page.locator('h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.locator('html').getAttribute('data-theme')).toBe(colorScheme);
 await expect(page.getByRole('navigation',{name:'Footer'}).getByRole('link',{name:'Play Together help',exact:true})).toHaveAttribute('href','/play-together-help');
 }
 await page.goto('/privacy.html');await expect(page.locator('article')).toContainText('Last updated November 24, 2026');await expect(page.locator('article')).toContainText('Group owners, co-owners, group organizers');await expect(page.locator('article')).toContainText('Public and private groups');await expect(page.locator('article')).toContainText('seven days');await expect(page.locator('article')).toContainText('does not currently provide a separate analytics-consent toggle');await expect(page.locator('article')).toContainText('Group covers are public');await expect(page.locator('article')).toContainText('OpenAI');await expect(page.locator('article')).toContainText('Cloudflare Workers AI');await expect(page.locator('article')).toContainText('up to 30 days');
 await page.goto('/terms.html');await expect(page.locator('article')).toContainText('automated text checks');await expect(page.locator('article')).toContainText('Privacy policy');
 await page.getByRole('navigation',{name:'Privacy sections'}).getByRole('link',{name:'Your choices and deletion',exact:true}).click();await expect(page).toHaveURL(/#choices$/);await expect(page.locator('#choices')).toBeVisible();
 await expect(page.locator('#choices')).toBeFocused();
 for(const [path,label] of [['/privacy.html','Privacy sections'],['/play-together-help.html','Help sections'],['/terms.html','Terms sections']]){
  await page.goto(path);const nav=page.getByRole('navigation',{name:label});await expect(nav.getByText('On this page',{exact:true})).toBeVisible();
  const links=nav.getByRole('link');expect(await links.count()).toBeGreaterThanOrEqual(8);
  for(const link of await links.all()){
   await expect(link).toHaveCSS('text-decoration-line','none');const box=await link.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
   const href=await link.getAttribute('href');await expect(page.locator(href!)).toHaveCount(1);
  }
  await links.first().focus();await expect(links.first()).toHaveCSS('outline-style','solid');await page.keyboard.press('Tab');await expect(links.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');const target=await links.nth(1).getAttribute('href');await expect(page.locator(target!)).toBeFocused();await expect(page.locator(target!)).toBeVisible();
  const paragraphLink=page.locator('article p > .page-inline-link').first();await expect(paragraphLink).toHaveCSS('text-decoration-line','underline');
  await expect(page.locator('article > p').last()).toHaveCSS('font-size','16px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await nav.screenshot({path:'.wrangler/qa-audit/info-design-menu-'+(path.includes('privacy')?'privacy':'help')+'-'+width+'-'+colorScheme+'.png'});
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'.wrangler/qa-audit/info-design-'+(path.includes('privacy')?'privacy':'help')+'-'+width+'-'+colorScheme+'.png'});
 }
 });}

test('information navigation supports enlarged text and reduced motion',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.goto('/privacy.html');await page.addStyleTag({content:'html{font-size:200%}'});
 await expect(page.locator('html')).toHaveCSS('scroll-behavior','auto');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 expect(await page.locator('.policy-contents-links').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
 const nav=page.getByRole('navigation',{name:'Privacy sections'});await nav.getByRole('link',{name:'Your choices and deletion',exact:true}).click();await expect(page.locator('#choices')).toBeVisible();await expect(page.locator('#choices')).toBeFocused();
});

for(const colorScheme of ['light','dark'] as const)test(`information-page accessibility ${colorScheme}`,async({page})=>{
 test.skip(!existsSync('.wrangler/qa-audit/axe.min.js'),'Local axe audit asset unavailable');test.setTimeout(90000);
 await page.setViewportSize({width:390,height:900});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
 for(const path of ['/privacy.html','/play-together-help.html','/about.html','/contact.html','/support.html','/terms.html','/delete-account.html']){
  await page.goto(path);await page.evaluate(()=>document.fonts.ready);await page.addScriptTag({path:'.wrangler/qa-audit/axe.min.js'});
  const violations=await page.evaluate(async()=>{const result=await (window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)}));});
  expect(violations,'Accessibility violations on '+path).toEqual([]);
 }
});

for(const width of [390,1440])for(const colorScheme of ['light','dark'] as const)test(`shared information footer preserves guide layouts ${width} ${colorScheme}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
 for(const path of ['best-time-to-play-tennis','tennis-courts-after-rain','public-tennis-courts-fairfax-va','public-tennis-courts-atlanta','public-tennis-courts-dallas','public-tennis-courts-los-angeles','public-tennis-courts-miami']){
  await page.goto('/'+path+'.html');await expect(page.locator('h1')).toBeVisible();await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth),path).toBeLessThanOrEqual(width);
  for(const link of await page.getByRole('navigation',{name:'Footer'}).getByRole('link').all())expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 }
});
