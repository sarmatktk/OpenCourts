import {test,expect,type Locator} from '@playwright/test';

const gameId='10000000-0000-4000-8000-000000000001',groupId='20000000-0000-4000-8000-000000000001';
const appearance=(button:Locator)=>button.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,color:s.color,border:s.borderColor,borderWidth:s.borderWidth,radius:s.borderRadius,font:s.fontSize,weight:s.fontWeight,padding:s.padding,minHeight:s.minHeight,height:s.height,shadow:s.boxShadow,outline:s.outline,outlineOffset:s.outlineOffset,opacity:s.opacity,cursor:s.cursor};});
for(const colorScheme of ['light','dark'] as const)for(const width of [320,390,1280])test(`request decisions share styles ${colorScheme} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
 await page.route('**/api/**',r=>{
  const path=new URL(r.request().url()).pathname;
  const game={id:gameId,title:'QA game',visibility:'group',groupVisibility:'public',groupId,isHost:true,court:{name:'QA Court',lat:38,lon:-77,access:'public'},startsAt:'2030-06-15T14:00:00Z',endsAt:'2030-06-15T15:00:00Z',timeZone:'UTC',format:'doubles',capacity:4,playerCount:1,status:'scheduled',skillPreference:'any',organizer:{displayName:'QA Host'}};
  let data:unknown={players:[],games:[],notifications:[],invitations:[]};
  if(path==='/api/auth/me')data={player:{id:'host',displayName:'QA Host'},csrfToken:'qa',providers:{},connectedProviders:[]};
  else if(path==='/api/games/'+gameId)data={game};
  else if(path.endsWith('/participation'))data={isOrganizer:true,joined:true,isGroupMember:true,joinPolicy:'instant',version:1};
  else if(path.endsWith('/guests'))data={isHost:true,own:null,requests:[{playerId:'guest',displayName:'QA Guest',guestCount:1}]};
  else if(path.endsWith('/requests'))data={players:[{id:'requester',displayName:'QA Player'},{id:'long',displayName:'A player with a very long name that should wrap without hiding any request actions'},{id:'third',displayName:'Sam'}]};
  else if(path==='/api/groups/'+groupId)data={group:{id:groupId,name:'QA Group',visibility:'public',publicDescription:'QA',generalLocation:'Fairfax'},membership:{status:'active',role:'owner'},content:{description:'QA',skillPreference:'any',version:1}};
  else if(path==='/api/games/notifications')data={notifications:[{id:'note',gameId,gameTitle:'QA game',displayName:'QA Player',kind:'requested',createdAt:1,readAt:null,actionPlayerId:'requester',requestStatus:'pending'}]};
  return r.fulfill({json:data});
 });
 await page.goto('/play-together/game?id='+gameId);
 const baseline=page.getByRole('button',{name:'Approve QA Player',exact:true});await expect(baseline).toBeVisible();await page.mouse.move(0,0);
 const normal=await appearance(baseline);await baseline.hover();const hover=await appearance(baseline);await page.mouse.move(0,0);await baseline.focus();const focus=await appearance(baseline);await baseline.evaluate(el=>(el as HTMLButtonElement).disabled=true);const disabled=await appearance(baseline);await baseline.evaluate(el=>(el as HTMLButtonElement).disabled=false);await baseline.blur();
 async function compare(button:Locator){
  await expect(button).toBeVisible();await page.mouse.move(0,0);await button.blur();expect(await appearance(button)).toEqual(normal);
  await button.hover();await expect.poll(()=>appearance(button)).toEqual(hover);await page.mouse.move(0,0);await button.focus();expect(await appearance(button)).toEqual(focus);
  await button.evaluate(el=>(el as HTMLButtonElement).disabled=true);expect(await appearance(button)).toEqual(disabled);await button.evaluate(el=>(el as HTMLButtonElement).disabled=false);await button.blur();
 }
 await compare(page.getByRole('button',{name:'Reject QA Player',exact:true}));
 await compare(page.getByRole('button',{name:'Approve guests for QA Guest',exact:true}));
 await compare(page.getByRole('button',{name:'Reject guests for QA Guest',exact:true}));
 async function checkRows(){
  const rows=page.locator('.pt-request-list').first().locator(':scope > li');await expect(rows).toHaveCount(3);
  const first=rows.first(),name=await first.locator('span').boundingBox(),approve=await first.getByRole('button',{name:'Approve QA Player',exact:true}).boundingBox(),reject=await first.getByRole('button',{name:'Reject QA Player',exact:true}).boundingBox();
  await expect(first.getByRole('button',{name:'Approve QA Player',exact:true})).toHaveText('Approve');await expect(first.getByRole('button',{name:'Reject QA Player',exact:true})).toHaveText('Reject');
  // The name and first action share a line; Reject wraps individually if needed.
  expect(name!.x+name!.width).toBeLessThanOrEqual(approve!.x);
  expect(Math.abs(name!.y+name!.height/2-approve!.y-approve!.height/2)).toBeLessThan(2);
  if(width>=390)expect(reject!.y).toBe(approve!.y);else expect(reject!.y).toBeGreaterThanOrEqual(approve!.y);
  const long=rows.nth(1);await expect(long.locator('span')).toContainText('without hiding any request actions');await expect(long).toHaveCSS('border-top-width','1px');await expect(first).toHaveCSS('border-top-width','0px');
  for(const row of await rows.all())for(const button of await row.getByRole('button').all()){const box=await button.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x+box!.width).toBeLessThanOrEqual(width);}
 }
 await checkRows();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.screenshot({path:`.wrangler/qa-audit/request-buttons-game-${width}-${colorScheme}.png`,fullPage:true});
 await page.goto('/play-together/group?id='+groupId);await compare(page.getByRole('button',{name:'Approve QA Player',exact:true}));await compare(page.getByRole('button',{name:'Reject QA Player',exact:true}));await checkRows();
 await page.goto('/play-together/notifications');await compare(page.getByRole('button',{name:'Approve',exact:true}));await compare(page.getByRole('button',{name:'Reject',exact:true}));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.screenshot({path:`.wrangler/qa-audit/request-buttons-inbox-${width}-${colorScheme}.png`,fullPage:true});
});
