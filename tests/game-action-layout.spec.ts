import {test,expect} from '@playwright/test';
const id='10000000-0000-4000-8000-000000000001';
for(const width of [320,375,1440])for(const theme of ['light','dark'] as const)test(`game actions share rows ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;let json:unknown={players:[],notifications:[],requests:[],invitationCount:0};
  if(path==='/api/auth/me')json={player:{id:'me',displayName:'Organizer'},csrfToken:'csrf',providers:{google:true,apple:true}};
  if(path==='/api/players/blocks')json={players:[],moderator:false};
  if(path==='/api/games/'+id)json={game:{id,isHost:true,title:'Compact actions doubles',visibility:'public',court:{id:'court',name:'A court with a longer facility name',lat:38,lon:-77,access:'public'},startsAt:'2030-06-15T10:00:00Z',endsAt:'2030-06-15T11:00:00Z',timeZone:'UTC',format:'doubles',capacity:4,skillPreference:'any',status:'scheduled',organizer:{displayName:'Organizer'},playerCount:1}};
  if(path.endsWith('/participation'))json={isOrganizer:true,isGameOrganizer:true,joined:true,version:1,joinPolicy:'approval',availablePlaces:3};
  if(path.endsWith('/guests'))json={isHost:true,own:null,requests:[]};
  if(path.endsWith('/chat'))json={available:false};
  return r.fulfill({json});
 });
 await page.goto('/play-together/game?id='+id);await expect(page.getByLabel('Game title',{exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Guest places',exact:true})).toBeVisible();await page.evaluate(()=>document.fonts.ready);const tools=page.getByRole('region',{name:'Game actions',exact:true}),invite=tools.getByRole('button',{name:'Invite players',exact:true}),share=tools.getByRole('button',{name:'Share game',exact:true});await expect(invite).toBeVisible();await expect(share).toBeVisible();expect(Math.abs((await invite.boundingBox())!.y-(await share.boundingBox())!.y)).toBeLessThan(2);
 const nav=page.getByRole('navigation',{name:'Game navigation',exact:true}),mine=nav.getByRole('link',{name:'My Games',exact:true}),browse=nav.getByRole('link',{name:'Browse public games',exact:true});expect(Math.abs((await mine.boundingBox())!.y-(await browse.boundingBox())!.y)).toBeLessThan(2);for(const control of [invite,share,mine,browse])expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 await tools.screenshot({path:'.wrangler/qa-audit/game-actions-'+width+'-'+theme+'.png'});await invite.click();await expect(tools.getByLabel('Player name, city or ZIP code',{exact:true})).toBeVisible();expect((await tools.locator('.pt-invite-picker').boundingBox())!.width).toBeLessThanOrEqual((await tools.boundingBox())!.width);await invite.click();await tools.getByRole('button',{name:'Report game',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Report game',exact:true});await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Cancel report',exact:true}).click();await expect(dialog).toBeHidden();
 await page.addScriptTag({path:'.wrangler/qa-audit/axe.min.js'});expect(await tools.evaluate(async node=>(await (window as any).axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map((v:any)=>v.id))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
