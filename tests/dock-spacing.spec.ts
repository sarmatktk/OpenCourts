import {test,expect} from '@playwright/test';
for(const width of [320,390,768])for(const colorScheme of ['light','dark'] as const){
 test(`floating docks leave bottom breathing room ${width} ${colorScheme}`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
  await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname==='/api/auth/me'?{player:{id:'qa',displayName:'QA'},csrfToken:'csrf'}:{elements:[],periods:[],assessments:[],games:[],groups:[],notifications:[],alerts:[],timeZone:'UTC'}}));
  for(const path of ['/','/play-together/feed']){
   await page.goto(path);const nav=page.getByRole('navigation',{name:path==='/'?'Quick navigation':'Play Together quick navigation',exact:true});await expect(nav).toBeVisible();await expect(nav).toHaveCSS('bottom',path==='/'&&width<=620?'5px':'8px');const installedRules=await page.evaluate(()=>Array.from(document.styleSheets).flatMap(sheet=>{try{return Array.from(sheet.cssRules);}catch{return [];}}).filter(rule=>rule instanceof CSSMediaRule&&rule.conditionText.includes('display-mode: standalone')).map(rule=>Array.from((rule as CSSMediaRule).cssRules).map(r=>r.cssText).join('\n')).join('\n'));expect(installedRules).toContain('12px');await page.addStyleTag({content:installedRules});await expect(nav).toHaveCSS('bottom','12px');const box=(await nav.boundingBox())!;expect(844-box.y-box.height).toBeCloseTo(12,0);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
  }
 });
}
