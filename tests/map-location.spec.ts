import {test,expect} from '@playwright/test';
for(const colorScheme of ['light','dark'] as const){
 test(`Map requests device location and searches nearby in ${colorScheme}`,async({page,context})=>{
 await page.setViewportSize({width:440,height:956});await page.emulateMedia({colorScheme});await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:38.8766,longitude:-77.3848});
 await page.route('**/api/**',r=>r.fulfill({json:{elements:[],periods:[],alerts:[],assessments:[],notifications:[],player:null}}));await page.goto('/');
 const nearby=page.waitForRequest(r=>{const u=new URL(r.url());return u.pathname==='/api/courts'&&u.searchParams.get('lat')==='38.8766';});await page.getByRole('button',{name:'Show court map',exact:true}).click();const request=await nearby;expect(new URL(request.url()).searchParams.get('lon')).toBe('-77.3848');await expect(page.locator('.results-head h2')).toHaveText('Your location');
 });
 test(`Map shows location denial inside map in ${colorScheme}`,async({page})=>{
 await page.setViewportSize({width:375,height:800});await page.emulateMedia({colorScheme});await page.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(_success:unknown,error:(e:{code:number})=>void)=>error({code:1})}});});
 await page.route('**/api/**',r=>r.fulfill({json:{elements:[],periods:[],alerts:[],assessments:[],notifications:[],player:null}}));await page.goto('/');await page.getByRole('button',{name:'Show court map',exact:true}).click();await expect(page.locator('.map-location-notice')).toContainText('disabled or blocked');await expect(page.getByRole('button',{name:'Show court map',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Search instead',exact:true}).click();await expect(page.getByRole('combobox',{name:'Search by address, city, or ZIP code'})).toBeFocused();
 });
}
