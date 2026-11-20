import {test,expect} from '@playwright/test';
const id='10000000-0000-4000-8000-000000000001';
for(const direct of [true,false])for(const width of [320,1440])for(const theme of ['light','dark'] as const)test(`guest ${direct?'direct':'request'} controls ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
 let confirmed=0,status:string|null=null;
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;let json:unknown={players:[],notifications:[],invitations:[]};
 if(path==='/api/auth/me')json={player:{id:'me',displayName:'Me'},csrfToken:'csrf'};
 if(path===`/api/games/${id}`)json={game:{id,title:'Tennis with guests',court:{name:'Park courts',lat:38,lon:-77,access:'public'},visibility:'public',startsAt:'2030-06-15T18:00:00Z',endsAt:'2030-06-15T19:00:00Z',timeZone:'UTC',format:'doubles',capacity:4,courtCount:1,playerCount:1+confirmed,status:'scheduled',notes:'',organizer:{id:direct?'me':'other',displayName:direct?'Me':'Other'}}};
 if(path.endsWith('/participation'))json={isOrganizer:direct,joined:true,version:1};
 if(path.endsWith('/chat'))json={available:false};
 if(path.endsWith('/request-guests')){expect(r.request().headers()['x-csrf-token']).toBe('csrf');expect(r.request().postDataJSON()).toEqual({guestCount:2});confirmed=direct?2:0;status=direct?'approved':'pending';json={ok:true};}
 if(path.endsWith('/cancel-guests')){confirmed=0;status='cancelled';json={ok:true};}
 if(path.endsWith('/guests'))json={isHost:direct,canAddGuestsDirectly:direct,own:{confirmed,requested:status?2:null,status},requests:[]};
 return r.fulfill({json});});
 await page.goto('/play-together/game?id='+id);const guests=page.getByRole('region',{name:'Guest places'});
 await guests.getByRole('button',{name:'2 guests',exact:true}).click();await guests.getByRole('button',{name:direct?'Add guest places':'Request guest places',exact:true}).click();
 await expect(guests.getByRole('status')).toContainText(direct?'Guest places confirmed. No approval needed.':'Guest request sent.');await expect(guests.getByText(direct?'2 guest places confirmed.':'2 guests awaiting approval.',{exact:true})).toBeVisible();
 await guests.getByRole('button',{name:'Cancel guest places',exact:true}).click();await expect(guests.getByRole('button',{name:direct?'Add guest places':'Request guest places',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
