import {test,expect} from '@playwright/test';
const id='10000000-0000-4000-8000-000000000001';
for(const width of [375,1280])for(const visibility of ['public','unlisted'])test(`inline ${visibility} invitation at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});let sent=false;
 await page.route('**/api/**',r=>{const u=new URL(r.request().url());let json:unknown={notifications:[]};
 if(u.pathname==='/api/auth/me')json={player:{id:'host',displayName:'Host'},csrfToken:'csrf'};
 else if(u.pathname==='/api/games/'+id)json={game:{id,title:'Test doubles',visibility,status:'scheduled',isHost:true,organizer:{id:'host',displayName:'Host'},court:{name:'Park',lat:38,lon:-77,access:'public'},startsAt:'2030-06-15T10:00:00Z',endsAt:'2030-06-15T11:00:00Z',timeZone:'UTC',format:'doubles',capacity:4,playerCount:1,skillPreference:'any'}};
 else if(u.pathname==='/api/players/game-invitees'){expect(u.searchParams.get('gameId')).toBe(id);json={players:[{id:'tom',displayName:'Tom',generalLocation:'Fairfax',invited:sent}],invitationCount:sent?1:0};}
 else if(u.pathname==='/api/players/invite-game'){expect(r.request().postDataJSON()).toEqual({playerId:'tom',gameId:id});expect(r.request().headers()['x-csrf-token']).toBe('csrf');sent=true;json={ok:true};}
 else if(u.pathname.endsWith('/guests'))json={own:null,requests:[]};
 else if(u.pathname.endsWith('/share-links'))json={links:[{id:'link-example',recipientName:'Tom',createdAt:Date.now(),expiresAt:Date.now()+86400000,revokedAt:null}]};
 return r.fulfill({json});});
 await page.goto('/play-together/game?id='+id);await page.getByRole('button',{name:'Invite players',exact:true}).click();await expect(page.getByText('Tom',{exact:true})).toBeVisible();await page.getByLabel('Player name, city or ZIP code',{exact:true}).fill('22033');await page.getByRole('button',{name:'Find players',exact:true}).click();await page.getByRole('button',{name:'Invite',exact:true}).click();await expect(page.getByRole('button',{name:'Invited',exact:true})).toBeDisabled();await expect(page.getByRole('status').filter({hasText:'Invitation sent to Tom'})).toBeVisible();expect(sent).toBe(true);if(visibility==='unlisted'){await expect(page.getByText('Invitation to Tom',{exact:true})).toBeVisible();await page.getByLabel('Actions for Invitation to Tom',{exact:true}).click();await page.getByRole('button',{name:'Revoke invitation',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Confirm action'});await expect(dialog).toContainText('Test doubles');await expect(dialog).toContainText('Tom');await dialog.getByRole('button',{name:'Keep invitation'}).click();await expect(dialog).toHaveCount(0);}expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
