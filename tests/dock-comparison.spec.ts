import {test,expect,type Locator} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const fingerprint=(control:Locator)=>control.evaluate(el=>{
 const s=getComputedStyle(el),icon=el.querySelector('svg')!,i=getComputedStyle(icon),svg=getComputedStyle(icon);
 return {minHeight:s.minHeight,gap:s.gap,font:s.fontSize,weight:s.fontWeight,label:getComputedStyle(el.lastElementChild!).color,background:s.backgroundColor,outline:s.outlineStyle,outlineWidth:s.outlineWidth,outlineOffset:s.outlineOffset,icon:{width:i.width,height:i.height,margin:i.marginTop,radius:i.borderRadius,border:i.borderWidth,borderColor:i.borderColor,background:i.backgroundColor,color:svg.color,shadow:i.boxShadow,stroke:svg.strokeWidth}};
});
for(const theme of ['light','dark'] as const)for(const width of [375,390]){
 test(`floating search matches the main court control in ${theme} at ${width}px`,async({page})=>{
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width,height:900});
  await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname==='/api/auth/me'?{player:{id:'qa',displayName:'QA'},csrfToken:'csrf'}:{elements:[],periods:[],assessments:[],games:[],groups:[],notifications:[],timeZone:'UTC'}}));
  await page.goto('/');await page.mouse.move(0,0);
  const main=page.getByRole('navigation',{name:'Quick navigation'}).locator('.mobile-nav-search');
  const normal=await fingerprint(main);await main.click();await expect(main).toHaveAttribute('aria-current','location');await page.mouse.move(0,0);await main.blur();await expect(main).toHaveCSS('background-color','rgb(237, 242, 232)');await expect(main.locator('span').last()).toHaveCSS('color','rgb(38, 75, 57)');const selected=await fingerprint(main);await page.keyboard.press('Tab');await main.focus();await expect(main).toBeFocused();await expect(main).toHaveCSS('outline-style','solid');await expect(main).toHaveCSS('outline-width','2px');await expect(main).toHaveCSS('outline-offset','3px');const focused=await fingerprint(main);
  await page.goto('/play-together/feed');await page.mouse.move(0,0);
  const play=page.getByRole('navigation',{name:'Play Together quick navigation'}).locator('.mobile-nav-search');
  const actualNormal=await fingerprint(play);
  await page.goto('/play-together?find=1');await page.mouse.move(0,0);await expect(play).toHaveAttribute('aria-current','page');await expect(play).toHaveCSS('background-color','rgb(237, 242, 232)');await expect(play.locator('span').last()).toHaveCSS('color','rgb(38, 75, 57)');const actualSelected=await fingerprint(play);await page.keyboard.press('Tab');await play.focus();await expect(play).toBeFocused();await expect(play).toHaveCSS('outline-style','solid');await expect(play).toHaveCSS('outline-width','2px');await expect(play).toHaveCSS('outline-offset','3px');const actualFocused=await fingerprint(play);
  mkdirSync('docs/qa-evidence',{recursive:true});writeFileSync(`docs/qa-evidence/dock-comparison-${width}-${theme}.json`,JSON.stringify({main:{normal,selected,focused},playTogether:{normal:actualNormal,selected:actualSelected,focused:actualFocused}},null,2));
  expect(actualNormal).toEqual(normal);expect(actualSelected).toEqual(selected);expect(actualFocused).toEqual(focused);
 });
}
