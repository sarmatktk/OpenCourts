import {expect,test} from '@playwright/test';
const id='10000000-0000-4000-8000-000000000001';
const sample={id,title:'Saturday morning doubles',court:{id:'osm-way-40881080',name:'Park Tennis Courts',lat:48.84528395,lon:2.1901775,access:'public'},startsAt:'2030-06-15T08:00:00.000Z',endsAt:'2030-06-15T09:30:00.000Z',timeZone:'Europe/Paris',format:'doubles',capacity:4,skillPreference:'any',status:'scheduled',organizer:{displayName:'Court Friend'},playerCount:1,notes:'Bring a can of tennis balls. Warm up together before starting.'};
test.beforeEach(async({page})=>{
  await page.route('**/api/auth/me',route=>route.fulfill({json:{player:{id:'player-1',displayName:'Court Friend'},csrfToken:'test-csrf'}}));
  await page.route('**/api/geocode?**',route=>route.fulfill({json:{result:{display_name:'Paris, France',lat:'48.8453',lon:'2.1902',country_code:'fr'}}}));
  await page.route('**/api/games**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/games/courts')return route.fulfill({json:{courts:[{...sample.court,distanceMiles:.2,selectionToken:'test-only-court-proof'}]}});
    if(url.pathname==='/api/games/notifications')return route.fulfill({json:{notifications:[]}});
    if(url.pathname.endsWith('/guests'))return route.fulfill({json:{own:null,requests:[],isHost:false}});
    if(url.pathname.endsWith('/cancellations'))return route.fulfill({json:{players:[]}});
    if(url.pathname.endsWith('/participation'))return route.fulfill({json:{isOrganizer:false,joined:false,requestStatus:null,joinPolicy:'approval',version:1}});
    if(url.pathname===`/api/games/${id}`)return route.fulfill({json:{game:sample}});
    return route.fulfill({json:{games:[sample],nextCursor:null}});
  });
});
for(const colorScheme of ['light','dark'] as const){
  test(`public game discovery and details in ${colorScheme} mode`,async({page})=>{
    await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});
    await page.goto('/play-together');
    await expect(page.getByRole('heading',{name:sample.title})).toBeVisible();
    await expect(page).toHaveScreenshot(`games-${colorScheme}.png`,{fullPage:true,animations:'disabled'});
    await page.getByRole('link',{name:'View game'}).click();
    await expect(page).toHaveURL(new RegExp(`/play-together/game\\?id=${id}`));
    await expect(page.getByRole('heading',{name:sample.title})).toBeVisible();
    await expect(page.getByText('Europe/Paris',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Request to join',exact:true})).toBeVisible();
    await page.setViewportSize({width:393,height:852});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
    await expect(page).toHaveScreenshot(`game-mobile-${colorScheme}.png`,{fullPage:true,animations:'disabled'});
  });
  test(`creates a public game with existing court and acknowledgements in ${colorScheme} mode`,async({page})=>{
    await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await page.setViewportSize({width:393,height:852});
    let submitted:any=null;
    await page.route('**/api/games',async route=>{
      if(route.request().method()==='POST'){submitted=route.request().postDataJSON();expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');return route.fulfill({status:201,json:{game:sample}});}
      return route.fulfill({json:{games:[],nextCursor:null}});
    });
    await page.goto('/play-together/create');
    await expect(page.getByRole('heading',{name:'1. Choose a court'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Create public game'})).toBeDisabled();
    await page.getByRole('combobox',{name:'Address, city or ZIP code'}).fill('Paris, France');await page.getByRole('button',{name:'Find courts',exact:true}).click();
    await page.getByRole('radio').check();
    await page.getByLabel('Game title').fill(sample.title);await page.getByLabel('Start date and time').fill('2030-06-15T10:00');await page.getByLabel('Time zone',{exact:false}).fill('Europe/Paris');
    await page.getByLabel('Notes',{exact:false}).fill(sample.notes);await page.getByRole('checkbox',{name:/does not reserve/}).check();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
    await page.evaluate(()=>window.scrollTo(0,0));
    await expect(page).toHaveScreenshot(`create-mobile-${colorScheme}.png`,{fullPage:true,animations:'disabled'});
    await page.getByRole('button',{name:'Create public game'}).click();
    await expect(page.getByRole('status').filter({hasText:'Your public game is created'})).toBeVisible();
    expect(submitted).toMatchObject({courtToken:'test-only-court-proof',acknowledgeNoReservation:true,format:'doubles',capacity:4,timeZone:'Europe/Paris'});
    expect(submitted.organizerId).toBeUndefined();expect(submitted.visibility).toBe('public');
  });
}
test('game filters send location, dates, format and skill to the local API',async({page})=>{
  await page.goto('/play-together');await expect(page.getByRole('link',{name:'View game'})).toBeVisible();
  await page.getByLabel('City or area').fill('Paris');await page.getByLabel('Format',{exact:true}).selectOption('singles');await page.getByLabel('Skill preference').selectOption('intermediate');await page.getByLabel('Date',{exact:true}).fill('2030-06-15');
  const request=page.waitForRequest(r=>r.url().includes('/api/games?')&&r.url().includes('lat='));
  await page.getByRole('button',{name:'Find games',exact:true}).click();
  const params=new URL((await request).url()).searchParams;expect(params.get('lat')).toBe('48.8453');expect(params.get('format')).toBe('singles');expect(params.get('skill')).toBe('intermediate');expect(params.has('from')).toBe(true);
});
test('signed-out creation, empty listings and API errors are explicit',async({page})=>{
  await page.route('**/api/auth/me',route=>route.fulfill({json:{player:null,csrfToken:null}}));
  await page.goto('/play-together/create');await expect(page.getByRole('heading',{name:'Sign in to organize a game'})).toBeVisible();await expect(page.getByLabel('Game title')).toHaveCount(0);
  await page.route('**/api/games?**',route=>route.fulfill({json:{games:[],nextCursor:null}}));await page.goto('/play-together');await expect(page.getByText('No upcoming games found.')).toBeVisible();
  await page.route('**/api/games?**',route=>route.fulfill({status:503,json:{error:'Game service is unavailable.'}}));await page.reload();await expect(page.getByRole('alert')).toContainText('Game service is unavailable.');await expect(page.getByText('No upcoming games found.')).toHaveCount(0);
});
test('all game pages fit a 320px screen and follow device theme changes',async({page})=>{
  await page.setViewportSize({width:320,height:800});
  for(const path of ['/play-together','/play-together/create',`/play-together/game?id=${id}`]){
    await page.emulateMedia({colorScheme:'light'});await page.goto(path);await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('.app')).toHaveClass('app dark');
  }
});

test('court search suggests locations and uses the selected coordinates',async({page})=>{
 await page.route('**/api/suggest?**',r=>r.fulfill({json:{suggestions:[{label:'Paris, France',title:'Paris',detail:'France',lat:48.8453,lon:2.1902,countryCode:'fr'}]}}));
 await page.goto('/play-together/create');await page.getByRole('combobox',{name:'Address, city or ZIP code'}).fill('Paris');
 await page.getByRole('combobox',{name:'Address, city or ZIP code'}).press('ArrowDown');
 await expect(page.getByRole('option',{name:/Paris/})).toBeVisible();
 const request=page.waitForRequest(r=>r.url().includes('/api/games/courts?'));await page.getByRole('option',{name:/Paris/}).click();
 expect(new URL((await request).url()).searchParams.get('lat')).toBe('48.8453');await expect(page.getByRole('radio')).toBeVisible();
});


test('paired game controls align on desktop and fit on mobile',async({page})=>{
 await page.goto('/play-together/create');
 for(const width of [1280,393]){
  await page.setViewportSize({width,height:1000});
  const boxes=await page.locator('.pt-create-details .pt-filter-grid input, .pt-create-details .pt-filter-grid select').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,height:r.height};}));
  expect(boxes).toHaveLength(4);
  for(const box of boxes)expect(box.height).toBe(48);
  if(width===1280){expect(boxes[0].top).toBe(boxes[1].top);expect(boxes[2].top).toBe(boxes[3].top);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 }
});

test('requests a place and can withdraw without claiming a confirmed spot',async({page})=>{
 let status:string|null=null;
 await page.route('**/api/games/'+id+'/participation',r=>r.fulfill({json:{isOrganizer:false,joined:false,requestStatus:status,joinPolicy:'approval',version:1}}));
 await page.route('**/api/games/'+id+'/join',r=>{expect(r.request().headers()['x-csrf-token']).toBe('test-csrf');status='pending';return r.fulfill({json:{ok:true}});});
 await page.route('**/api/games/'+id+'/leave',r=>{status=null;return r.fulfill({json:{ok:true}});});
 await page.goto('/play-together/game?id='+id);await page.getByRole('button',{name:'Request to join',exact:true}).click();
 await expect(page.getByText('Your request is awaiting organizer approval.')).toBeVisible();
 await page.getByRole('button',{name:'Withdraw request'}).click();await expect(page.getByRole('button',{name:'Request to join',exact:true})).toBeVisible();
});
test('My Games distinguishes pending requests and organizer games',async({page})=>{
 await page.route('**/api/games/mine*',r=>r.fulfill({json:{games:[{id,title:sample.title,starts_at:Date.parse(sample.startsAt),time_zone:sample.timeZone,court_name:sample.court.name,status:'scheduled',joined:0,request_status:'pending',isOrganizer:false}]}}));
 await page.goto('/play-together/my-games');await expect(page.getByRole('heading',{name:'My Games',exact:true})).toBeVisible();await page.getByRole('group',{name:'Schedule views'}).getByRole('button',{name:'Requests',exact:true}).click();await expect(page.getByText('Awaiting approval',{exact:true})).toBeVisible();
});

test('organizer approves a request and confirms cancellation',async({page})=>{
 let pending=true,cancelled=false;
 await page.route('**/api/games/'+id+'/participation',r=>r.fulfill({json:{isOrganizer:true,joined:true,requestStatus:null,joinPolicy:'approval',version:1}}));
 await page.route('**/api/games/'+id+'/participants',r=>r.fulfill({json:{players:[{id:'player-1',displayName:'Court Friend'},...(!pending?[{id:'guest',displayName:'Guest Player'}]:[])]}}));
 await page.route('**/api/games/'+id+'/requests',r=>r.fulfill({json:{players:pending?[{id:'guest',displayName:'Guest Player'}]:[]}}));
 await page.route('**/api/games/'+id+'/approve',r=>{expect(r.request().postDataJSON()).toEqual({playerId:'guest'});pending=false;return r.fulfill({json:{ok:true}});});
 await page.route('**/api/games/'+id+'/cancel',r=>{cancelled=true;return r.fulfill({json:{ok:true}});});
 await page.route('**/api/games/'+id,r=>r.fulfill({json:{game:{...sample,status:cancelled?'cancelled':'scheduled',playerCount:pending?1:2}}}));
 await page.goto('/play-together/game?id='+id);await page.getByRole('button',{name:'Approve Guest Player'}).click();await expect(page.getByText('No pending requests.')).toBeVisible();
 await page.getByRole('button',{name:'Cancel game',exact:true}).click();await page.getByRole('button',{name:'Keep game'}).click();expect(cancelled).toBe(false);
 await page.getByRole('button',{name:'Cancel game',exact:true}).click();await page.getByRole('button',{name:'Confirm cancellation'}).click();await expect(page.getByRole('heading',{name:'This game was cancelled.'})).toBeVisible();
});

test('confirmed player can leave with an optional reason',async({page})=>{
 let joined=true;
 await page.route('**/api/games/'+id+'/participation',r=>r.fulfill({json:{isOrganizer:false,joined,requestStatus:joined?'approved':null,joinPolicy:'approval',version:1}}));
 await page.route('**/api/games/'+id+'/leave',r=>{expect(r.request().postDataJSON()).toEqual({reason:'Schedule changed'});joined=false;return r.fulfill({json:{ok:true}});});
 await page.goto('/play-together/game?id='+id);await page.getByRole('button',{name:'Leave game',exact:true}).click();
 await page.getByLabel('Reason for cancelling (optional)').fill('Schedule changed');await page.getByRole('button',{name:'Confirm leaving'}).click();await expect(page.getByRole('button',{name:'Request to join',exact:true})).toBeVisible();
});

test('host sees cancellation notifications privately in the separate inbox',async({page})=>{
 await page.route('**/api/games/mine*',r=>r.fulfill({json:{games:[]}}));
 await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[{id:'note1',gameId:id,gameTitle:sample.title,displayName:'Tom',kind:'cancelled',reason:'Schedule changed',placesReleased:1,createdAt:Date.now(),readAt:null}]}}));
 await page.route('**/api/games/notifications/read',r=>r.fulfill({json:{ok:true}}));
 await page.goto('/play-together/notifications');await expect(page.getByRole('heading',{name:'Notifications (1 unread)'})).toBeVisible();await expect(page.getByText('Reason: Schedule changed')).toBeVisible();await page.getByRole('button',{name:'Mark as read'}).click();await expect(page.getByRole('heading',{name:'Notifications (0 unread)'})).toBeVisible();
});

test('header bell shows unread requests and opens host inbox',async({page})=>{
 await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[{id:'request-note',gameId:id,gameTitle:sample.title,displayName:'Tom',kind:'requested',actionPlayerId:'guest',requestStatus:'pending',reason:'',placesReleased:0,createdAt:Date.now(),readAt:null}]}}));
 await page.route('**/api/games/mine*',r=>r.fulfill({json:{games:[]}}));
 await page.goto('/play-together');await expect(page.getByRole('link',{name:'Notifications, 1 unread'})).toBeVisible();await page.getByRole('link',{name:'Notifications, 1 unread'}).click();await expect(page.getByText('New: Tom requested to join')).toBeVisible();await expect(page.getByText('Awaiting your approval',{exact:false})).toBeVisible();
 await page.setViewportSize({width:320,height:852});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('requester sees an approval alert in their own inbox and header bell',async({page})=>{
 await page.route('**/api/games/mine*',r=>r.fulfill({json:{games:[]}}));
 await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[{id:'approval',gameId:id,gameTitle:sample.title,displayName:'Host Player',kind:'approved',reason:'',placesReleased:0,createdAt:Date.now(),readAt:null}]}}));
 await page.goto('/play-together/notifications');await expect(page.getByRole('link',{name:'Notifications, 1 unread'})).toBeVisible();await expect(page.getByText('New: Host Player approved your request')).toBeVisible();await expect(page.getByText('Your place is confirmed.')).toBeVisible();
});

test('host can approve or deny an organized notification card directly',async({page})=>{
 let decision:string|null=null;
 await page.route('**/api/games/mine*',r=>r.fulfill({json:{games:[]}}));
 await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[{id:'action-note',gameId:id,gameTitle:sample.title,displayName:'Tom',kind:'requested',actionPlayerId:decision?null:'guest',requestStatus:decision==='approve'?'approved':decision==='reject'?'rejected':'pending',reason:'',placesReleased:0,createdAt:Date.now(),readAt:decision?Date.now():null}]}}));
 await page.route('**/api/games/notifications/read',r=>r.fulfill({json:{ok:true}}));
 await page.route('**/api/games/'+id+'/approve',r=>{expect(r.request().postDataJSON()).toEqual({playerId:'guest'});expect(r.request().headers()['x-csrf-token']).toBe('test-csrf');decision='approve';return r.fulfill({json:{ok:true}});});
 await page.route('**/api/games/'+id+'/reject',r=>{decision='reject';return r.fulfill({json:{ok:true}});});
 await page.goto('/play-together/notifications');await page.getByRole('button',{name:'Approve',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Request approved. The requester has been notified.');await expect(page.getByRole('button',{name:'Approve',exact:true})).toHaveCount(0);
 decision=null;await page.reload();await page.getByRole('button',{name:'Deny',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Request denied. The requester has been notified.');await expect(page.getByRole('button',{name:'Deny',exact:true})).toHaveCount(0);
});
for(const theme of ['light','dark'] as const)test('notification cards fit mobile in '+theme,async({page})=>{
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width:393,height:852});
 await page.route('**/api/games/mine*',r=>r.fulfill({json:{games:[]}}));
 await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[{id:'layout-note',gameId:id,gameTitle:sample.title,displayName:'Tom',kind:'requested',actionPlayerId:'guest',requestStatus:'pending',createdAt:1794942000000,readAt:null}]}}));
 await page.goto('/play-together/notifications');await expect(page.getByRole('button',{name:'Approve',exact:true})).toBeVisible();await expect(page).toHaveScreenshot('notifications-mobile-'+theme+'.png',{fullPage:true});await page.setViewportSize({width:1280,height:900});await expect(page.getByRole('region',{name:'Notifications'})).toHaveScreenshot('notifications-desktop-'+theme+'.png');await page.setViewportSize({width:320,height:852});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('group administrator can approve a membership request from the inbox',async({page})=>{
 let pending=true;
 await page.route('**/api/games/mine*',r=>r.fulfill({json:{games:[]}}));
 await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[{id:'group:request',groupId:id,groupName:'Fairfax Tennis Friends',displayName:'Tom',kind:'group_requested',actionPlayerId:pending?'guest':null,requestStatus:pending?'pending':'active',createdAt:Date.now(),readAt:pending?null:Date.now()}]}}));
 await page.route('**/api/groups/'+id+'/approve',r=>{expect(r.request().postDataJSON()).toEqual({playerId:'guest'});pending=false;return r.fulfill({json:{ok:true}});});
 await page.route('**/api/games/notifications/read',r=>r.fulfill({json:{ok:true}}));
 await page.goto('/play-together/notifications');await page.getByRole('button',{name:'Approve',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Request approved. The requester has been notified.');await expect(page.getByRole('button',{name:'Approve',exact:true})).toHaveCount(0);
});
for(const theme of ['light','dark'] as const){test('confirmed player requests and cancels guest places in '+theme,async({page})=>{
 await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width:393,height:852});let status:string|null=null;
 await page.route('**/api/games/'+id+'/participation',r=>r.fulfill({json:{isOrganizer:false,joined:true,requestStatus:'approved',joinPolicy:'approval',version:1}}));
 await page.route('**/api/games/'+id+'/guests',r=>r.fulfill({json:{own:{confirmed:0,requested:status==='pending'?1:null,status},requests:[]}}));
 await page.route('**/api/games/'+id+'/request-guests',r=>{expect(r.request().headers()['x-csrf-token']).toBe('test-csrf');expect(r.request().postDataJSON()).toEqual({guestCount:1});status='pending';return r.fulfill({json:{ok:true}});});
 await page.route('**/api/games/'+id+'/cancel-guests',r=>{status='cancelled';return r.fulfill({json:{ok:true}});});
 await page.goto('/play-together/game?id='+id);await page.getByRole('button',{name:'Request guest places',exact:true}).click();await expect(page.getByText('1 guests awaiting approval.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Cancel guest places',exact:true}).click();await expect(page.getByRole('button',{name:'Request guest places',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
});}
test('host can approve guest requests from game management',async({page})=>{
 let approved=false;
 await page.route('**/api/games/'+id+'/participation',r=>r.fulfill({json:{isOrganizer:true,joined:true,requestStatus:null,joinPolicy:'instant',version:1}}));
 await page.route('**/api/games/'+id+'/participants',r=>r.fulfill({json:{players:[{id:'player-1',displayName:'Host'},{id:'tom',displayName:'Tom',guestCount:approved?1:0}]}}));
 await page.route('**/api/games/'+id+'/requests',r=>r.fulfill({json:{players:[]}}));
 await page.route('**/api/games/'+id+'/guests',r=>r.fulfill({json:{isHost:true,own:{confirmed:0,status:null,requested:null},requests:approved?[]:[{playerId:'tom',displayName:'Tom',guestCount:1}]}}));
 await page.route('**/api/games/'+id+'/approve-guests',r=>{expect(r.request().headers()['x-csrf-token']).toBe('test-csrf');expect(r.request().postDataJSON()).toEqual({playerId:'tom'});approved=true;return r.fulfill({json:{ok:true}});});
 await page.goto('/play-together/game?id='+id);await expect(page.getByRole('button',{name:'Request guest places',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Approve guests for Tom',exact:true}).click();await expect(page.getByRole('button',{name:'Approve guests for Tom',exact:true})).toHaveCount(0);await expect(page.getByText('Tom + 1 guests',{exact:true})).toBeVisible();
});
test('notifications do not push the schedule down and inbox shows a bounded page',async({page})=>{
 const notes=Array.from({length:100},(_,i)=>({id:'note-'+i,gameId:id,gameTitle:sample.title,displayName:'Player '+i,kind:'requested',createdAt:Date.now()-i*1000,readAt:i<5?null:Date.now()}));
 await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:notes}}));await page.route('**/api/games/mine*',r=>r.fulfill({json:{games:[{id,title:sample.title,starts_at:Date.parse(sample.startsAt),time_zone:sample.timeZone,court_name:sample.court.name,status:'scheduled',joined:1,request_status:'approved',isOrganizer:false}]}}));
 await page.setViewportSize({width:393,height:852});await page.goto('/play-together/my-games');await expect(page.getByRole('region',{name:'Notifications',exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:sample.title})).toBeInViewport();await page.getByRole('link',{name:'Open notifications',exact:true}).click();await expect(page.locator('.pt-notification-card')).toHaveCount(20);await page.getByRole('button',{name:'More notifications',exact:true}).click();await expect(page.locator('.pt-notification-card')).toHaveCount(40);await page.getByRole('group',{name:'Notification filters'}).getByRole('button',{name:'Unread',exact:true}).click();await expect(page.locator('.pt-notification-card')).toHaveCount(5);
});
for(const theme of ['light','dark'] as const){test('schedule tabs separate upcoming, requests, history and removals in '+theme,async({page})=>{
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width:393,height:852});
 const now=Date.now(),base={id,starts_at:now+86400000,ends_at:now+90000000,time_zone:'UTC',court_name:'Park Court',status:'scheduled',joined:0,request_status:null,isOrganizer:false};
 const rows=[{...base,id:'upcoming',title:'Confirmed upcoming',joined:1,section:'upcoming'},{...base,id:'pending',title:'Pending request',request_status:'pending',section:'requests'},{...base,id:'past',title:'Completed tennis',starts_at:now-7200000,ends_at:now-3600000,joined:1,section:'past'},{...base,id:'removed',title:'Removed tennis',request_status:'removed',section:'cancelled'},{...base,id:'left',title:'Left tennis',left_game:1,section:'cancelled'}];
 await page.route('**/api/games/mine?**',r=>{const view=new URL(r.request().url()).searchParams.get('view');return r.fulfill({json:{games:rows.filter(g=>g.section===view),nextCursor:null}});});
 await page.goto('/play-together/my-games');const tabs=page.getByRole('group',{name:'Schedule views'});await expect(tabs.getByRole('button',{name:'Upcoming',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('heading',{name:'Confirmed upcoming'})).toBeVisible();await expect(page.getByRole('heading',{name:'Removed tennis'})).toHaveCount(0);await tabs.getByRole('button',{name:'Upcoming',exact:true}).click();await expect(page.getByRole('heading',{name:'Confirmed upcoming'})).toBeVisible();
 await tabs.getByRole('button',{name:'Requests',exact:true}).click();await expect(page.getByText('Awaiting approval',{exact:true})).toBeVisible();await tabs.getByRole('button',{name:'Past',exact:true}).click();await expect(page.getByRole('heading',{name:'Completed tennis'})).toBeVisible();await tabs.getByRole('button',{name:'Cancelled',exact:true}).click();await expect(page.getByText('Removed',{exact:true})).toBeVisible();await expect(page.getByText('You left this game',{exact:true})).toBeVisible();await page.setViewportSize({width:320,height:852});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});}
