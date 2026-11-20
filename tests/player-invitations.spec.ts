import {test,expect} from '@playwright/test';
const id='10000000-0000-4000-8000-000000000001';
for(const theme of ['light','dark'] as const){
 test(`discovered players can be invited from a phone in ${theme}`,async({page})=>{
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width:375,height:800});let sent=0,pickerReads=0;
  await page.route('**/api/**',route=>{
   const u=new URL(route.request().url());let json:unknown={notifications:[]};
   if(u.pathname==='/api/auth/me')json={player:{id:'host',displayName:'Host'},csrfToken:'csrf'};
   else if(u.pathname==='/api/players')json={players:[{id:'target',displayName:'Tom Tennis',generalLocation:'Fairfax',skillLevel:'intermediate'}],next:null};
   else if(u.pathname==='/api/players/blocks')json={players:[],moderator:false};
   else if(u.pathname==='/api/players/invitable-games'){pickerReads++;expect(u.searchParams.get('playerId')).toBe('target');json={games:[{id,title:'Public doubles',startsAt:Date.parse('2030-06-15T10:00:00Z'),timeZone:'UTC',invited:sent>0}]};}
   else if(u.pathname==='/api/players/invite-game'){expect(route.request().postDataJSON()).toEqual({playerId:'target',gameId:id});expect(route.request().headers()['x-csrf-token']).toBe('csrf');sent++;json={ok:true};}
   return route.fulfill({json});
  });
  await page.goto('/play-together/players');await expect(page.getByText('Tom Tennis',{exact:true})).toBeVisible();expect(pickerReads).toBe(0);
  await page.getByLabel('Invite Tom Tennis to a game',{exact:true}).click();await expect(page.getByRole('combobox',{name:'Your upcoming public games'})).toContainText('Public doubles');expect(sent).toBe(0);
  await page.getByRole('button',{name:'Send invitation',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Invitation sent.'})).toBeVisible();expect(sent).toBe(1);await expect(page.getByRole('button',{name:'Invitation sent',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
 });
}
test('recipient uses a normal join request from an invitation in their inbox',async({page})=>{
 let requested=false,read=false;
 await page.route('**/api/**',route=>{
  const p=new URL(route.request().url()).pathname;let json:unknown={};
  if(p==='/api/auth/me')json={player:{id:'target',displayName:'Tom'},csrfToken:'csrf'};
  else if(p==='/api/games/notifications')json={notifications:[{id:'invite:qa',gameId:id,gameTitle:'Public doubles',displayName:'Host',kind:'game_invited',invitationStatus:requested?'requested':'available',createdAt:Date.now(),readAt:read?Date.now():null}]};
  else if(p==='/api/games/'+id+'/join'){expect(route.request().headers()['x-csrf-token']).toBe('csrf');requested=true;json={ok:true};}
  else if(p==='/api/games/notifications/read'){expect(route.request().postDataJSON()).toEqual({id:'invite:qa'});read=true;json={ok:true};}
  return route.fulfill({json});
 });
 await page.goto('/play-together/notifications');await expect(page.getByText('New: Host invited you to a game')).toBeVisible();await page.getByRole('button',{name:'Request a place',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Join request sent.'})).toBeVisible();await expect(page.getByText('Awaiting approval',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Request a place',exact:true})).toHaveCount(0);expect(requested&&read).toBe(true);
});
test('no eligible games and server rejection are explicit without sending an invitation',async({page})=>{
 let allowPicker=false,posts=0;
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;let json:unknown={notifications:[]};if(p==='/api/auth/me')json={player:{id:'host',displayName:'Host'},csrfToken:'csrf'};else if(p==='/api/players')json={players:[{id:'target',displayName:'Tom'}],next:null};else if(p==='/api/players/blocks')json={players:[],moderator:false};else if(p==='/api/players/invitable-games')json={games:allowPicker?[{id,title:'Public game',startsAt:Date.parse('2030-06-15T10:00:00Z'),timeZone:'UTC',invited:false}]:[]};else if(p==='/api/players/invite-game'){posts++;return r.fulfill({status:404,json:{error:'This invitation is unavailable.'}});}return r.fulfill({json});});
 await page.goto('/play-together/players');const toggle=page.getByLabel('Invite Tom to a game',{exact:true});await toggle.click();await expect(page.getByText('No eligible public games.',{exact:false})).toBeVisible();expect(posts).toBe(0);await toggle.click();allowPicker=true;await toggle.click();await page.getByRole('button',{name:'Send invitation',exact:true}).click();await expect(page.getByRole('alert')).toContainText('This invitation is unavailable.');expect(posts).toBe(1);
});

test('expired, completed and cancelled invitations stay in history without an unread badge',async({page})=>{
 await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname==='/api/auth/me'?{player:{id:'target',displayName:'Tom'},csrfToken:'csrf'}:{notifications:['expired','completed','cancelled'].map((state,i)=>({id:'invite:'+i,gameId:id,gameTitle:'Old '+state,displayName:'Host',kind:'game_invited',invitationStatus:state,archived:true,createdAt:Date.now()-3*86400000,readAt:null}))}}));
 await page.goto('/play-together/notifications');await expect(page.getByRole('heading',{name:'Notifications (0 unread)'})).toBeVisible();await expect(page.locator('.pt-notification-card')).toHaveCount(0);await expect(page.getByLabel('Notifications, 0 unread')).toBeVisible();await expect(page.locator('.pt-notification-count')).toHaveCount(0);
 await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.pt-notification-card')).toHaveCount(3);for(const label of ['Expired','Completed','Cancelled'])await expect(page.getByText(label,{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Request a place',exact:true})).toHaveCount(0);await expect(page.getByText('New:',{exact:false})).toHaveCount(0);
 await page.getByRole('button',{name:'Unread',exact:true}).click();await expect(page.locator('.pt-notification-card')).toHaveCount(0);
});
