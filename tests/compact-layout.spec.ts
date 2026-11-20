import {test,expect} from '@playwright/test';
const groupId='20000000-0000-4000-8000-000000000001';
for(const width of [320,390,768,1440])for(const theme of ['light','dark'] as const)test(`compact layouts preserve controls ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;let json:unknown={players:[],notifications:[],games:[],next:null};
  if(p==='/api/auth/me')json={player:{id:'me',displayName:'Organizer',bio:'Weekend tennis',generalLocation:'Fairfax',skillLevel:'intermediate',discoverable:true},csrfToken:'csrf',providers:{google:true,apple:true},connectedProviders:['google']};
  if(p==='/api/players/blocks')json={players:[],moderator:false};
  if(p==='/api/players')json={players:[{id:'other',displayName:'Another tennis player',generalLocation:'Fairfax',skillLevel:'intermediate',bio:'Friendly tennis'}],next:null};
  if(p==='/api/push/settings')json={available:false};
  if(p.startsWith('/api/media/'))return r.fulfill({status:404,body:''});
  if(p==='/api/groups/'+groupId)json={group:{id:groupId,name:'Local tennis',publicDescription:'Friendly local tennis',visibility:'private',generalLocation:'Fairfax'},membership:{role:'owner',status:'active'},archived:false,content:{description:'Members coordinate tennis',skillPreference:'any',version:1}};
  if(p.endsWith('/invitations'))json={invitations:[{id:'invitation-id',createdAt:Date.now(),expiresAt:null,revokedAt:null}]};
  return r.fulfill({json});
 });
 await page.goto('/account');await expect(page.getByRole('heading',{name:'Account & privacy'})).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 {const geometry=await page.locator('.pt-account-actions').evaluate(el=>{const buttons=[...el.querySelectorAll('button')];return {out:buttons[0].getBoundingClientRect().toJSON(),all:buttons[1].getBoundingClientRect().toJSON(),width:el.getBoundingClientRect().width};});if(geometry.out.width+geometry.all.width+8<=geometry.width+1)expect(Math.abs(geometry.out.y-geometry.all.y)).toBeLessThan(2);else expect(geometry.all.y).toBeGreaterThan(geometry.out.y);}
 if(width<=1100){await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await expect.poll(async()=>{const footer=await page.locator('.pt-footer').boundingBox(),dock=await page.locator('.pt-bottom-nav').boundingBox();return footer!.y+footer!.height<=dock!.y;}).toBe(true);expect(await page.locator('.app').evaluate(el=>getComputedStyle(el).paddingBottom)).toBe('0px');}
 await page.goto('/play-together/group?id='+groupId);const edit=page.getByRole('button',{name:'Edit group',exact:true}),archive=page.getByRole('button',{name:'Archive group',exact:true});await expect(archive).toBeVisible();await page.evaluate(()=>document.fonts.ready);expect(await page.locator('.pt-section-actions').first().evaluate(el=>{const buttons=el.querySelectorAll('button');return Math.abs(buttons[0].getBoundingClientRect().y-buttons[1].getBoundingClientRect().y);})).toBeLessThan(2);
 const invitation=page.locator('.pt-invitation-row'),trigger=invitation.getByRole('button',{name:/Actions for Membership link/});expect(await invitation.evaluate(el=>Math.abs(el.querySelector('.pt-invitation-menu-trigger')!.getBoundingClientRect().y-el.querySelector('.pt-invitation-info')!.getBoundingClientRect().y))).toBeLessThan(2);await trigger.click();await expect(invitation.getByRole('button',{name:'Revoke invitation',exact:true})).toBeVisible();
 {const expiry=page.getByRole('combobox',{name:'Invitation expires'}),create=page.getByRole('button',{name:'Create invitation link',exact:true});await expect(expiry).toBeVisible();await expect(create).toBeVisible();expect((await expiry.boundingBox())!.height).toBeLessThanOrEqual(50);if(width>=768)expect(await page.locator('.pt-inline-form').evaluate(el=>Math.abs(el.querySelector('[role=combobox]')!.getBoundingClientRect().y-el.querySelector(':scope>button')!.getBoundingClientRect().y))).toBeLessThan(3);}
 await page.goto('/play-together/players');await expect(page.getByText('Another tennis player',{exact:true})).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 if(width>=1100){const search=page.locator('.pt-player-search'),name=search.getByLabel('Player name (optional)'),location=search.getByRole('combobox',{name:'City, address or ZIP code'}),skill=search.getByRole('combobox',{name:'Skill preference'});expect(Math.abs((await name.boundingBox())!.y-(await location.boundingBox())!.y)).toBeLessThan(3);expect(Math.abs((await name.boundingBox())!.y-(await skill.boundingBox())!.y)).toBeLessThan(3);}
 for(const control of await page.locator('.pt-player-actions button,.pt-player-actions summary').all()){if(await control.isVisible())expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
