import {test,expect,type Locator} from '@playwright/test';
for(const theme of ['light','dark'] as const)for(const width of [320,375,390]){
 test(`leftmost search focuses a typing caret consistently in ${theme} at ${width}px`,async({page})=>{
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width,height:800});
  await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname==='/api/auth/me'?{player:{id:'qa',displayName:'QA'},csrfToken:'csrf'}:{elements:[],periods:[],assessments:[],alerts:[],games:[],groups:[],players:[],notifications:[],timeZone:'UTC',nextCursor:null}}));
  const outline=(el:Locator)=>el.evaluate(node=>{const s=getComputedStyle(node);return {border:s.borderTopColor,shadow:s.boxShadow,outline:s.outlineStyle};});
  await page.goto('/');const mainNav=page.getByRole('navigation',{name:'Quick navigation'});
  await expect(mainNav.locator('a,button').first()).toHaveAccessibleName('Search courts');
  await mainNav.getByRole('link',{name:'Search courts',exact:true}).click();
  const court=page.locator('#search input');await expect(court).toBeFocused();await page.keyboard.type('Fairfax');await expect(court).toHaveValue('Fairfax');
  await expect(page.locator('.searchbox')).toHaveCSS('border-top-color',theme==='light'?'rgb(85, 116, 95)':'rgb(189, 215, 139)');
  const reference=await outline(page.locator('.searchbox'));
  const caret=await court.evaluate(el=>getComputedStyle(el).caretColor);
  // Cross-page entry and same-page re-entry must both put focus on the input.
  await page.goto('/play-together/feed');const dock=page.getByRole('navigation',{name:'Play Together quick navigation'});
  await expect(dock.getByRole('link').first()).toHaveAccessibleName('Find games');
  await dock.getByRole('link',{name:'Find games',exact:true}).click();await expect(page).toHaveURL(/\/play-together#search$/);
  const game=page.locator('#search input[type=search]');await expect(game).toBeFocused();await page.keyboard.type('Fairfax');await expect(game).toHaveValue('Fairfax');
  await expect.poll(()=>outline(page.locator('.pt-search-input'))).toEqual(reference);await expect(game).toHaveCSS('caret-color',caret);await expect(game).toHaveCSS('outline-style','none');await expect(game).toHaveCSS('box-shadow','none');
  await game.blur();await dock.getByRole('link',{name:'Find games',exact:true}).click();await expect(game).toBeFocused();await expect(game).toHaveValue('Fairfax');await page.keyboard.type(' VA');await expect(game).toHaveValue('Fairfax VA');
  expect(await game.evaluate(el=>(el as HTMLInputElement).selectionStart)).toBe('Fairfax VA'.length);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 });
}
