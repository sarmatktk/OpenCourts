import {test,expect} from '@playwright/test';
const id='10000000-0000-4000-8000-000000000001';
for(const width of [320,390,1440])for(const theme of ['light','dark'] as const)test(`chat scroll ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
 let muted=false,reported=false,unread=1,available=true;
 const messages=Array.from({length:120},(_,i)=>({id:'message-'+(i+1),seq:i+1,authorId:'other',displayName:'Player',body:'Message '+(i+1)+' '+('Long message content that wraps across narrow screens. '.repeat(i%3+1)),createdAt:Date.now(),hiddenAt:null}));
 await page.route('**/api/**',r=>{const u=new URL(r.request().url()),path=u.pathname;let json:unknown={players:[],notifications:[],games:[],requests:[],own:null};
  if(path==='/api/auth/me')json={player:{id:'me',displayName:'Me'},csrfToken:'csrf',providers:{google:true,apple:true}};
  if(path.endsWith('/participation'))json={isOrganizer:false,joined:true,requestStatus:'approved',joinPolicy:'approval',version:1};
  if(path==='/api/players/blocks')json={players:[],moderator:false};
  if(path==='/api/games/'+id)json={game:{id,title:'Chat doubles',visibility:'public',court:{id:'court',name:'Park Court',lat:38,lon:-77,access:'public'},startsAt:'2030-06-15T10:00:00Z',endsAt:'2030-06-15T11:00:00Z',timeZone:'UTC',format:'doubles',capacity:4,skillPreference:'any',status:'scheduled',organizer:{displayName:'Host'},playerCount:2}};
  if(path==='/api/games/'+id+'/chat'){
   if(r.request().method()==='POST'){const b=r.request().postDataJSON();expect(r.request().headers()['x-csrf-token']).toBe('csrf');messages.push({id:'sent',seq:messages.at(-1)!.seq+1,authorId:'me',displayName:'Me',body:b.body,createdAt:Date.now(),hiddenAt:null});json={id:'sent',seq:2};}
   else json={audience:[{id:'me',displayName:'Me',role:'organizer'},{id:'other',displayName:'Player with a very long name that should wrap safely',role:'player'},{id:'invitee',displayName:'Invited player name',role:'invitee'}],available,canSend:true,expiresAt:Date.now()+30*86400000,closesAt:Date.now()+86400000,muted,unread,messages:u.searchParams.has('state')?[]:messages.filter(m=>m.seq<Number(u.searchParams.get('before')||Infinity)).slice(-50),hasOlder:!u.searchParams.has('state')&&messages.filter(m=>m.seq<Number(u.searchParams.get('before')||Infinity)).length>50,viewerId:'me'};
  }
  if(path.endsWith('/chat/read')){unread=0;json={ok:true};}
  if(path.endsWith('/chat/mute')){muted=r.request().postDataJSON().muted;json={ok:true};}
  if(path.endsWith('/chat/report')){expect(r.request().postDataJSON()).toMatchObject({messageId:'message-id',details:'Please review the unsafe message.'});reported=true;json={ok:true};}
  return r.fulfill({json});
 });

 await page.goto('/play-together/game?id='+id+'#chat');
 const chat=page.getByRole('region',{name:'Game chat',exact:true}),log=chat.getByRole('log');
 const bottom=()=>log.evaluate(e=>e.scrollHeight-e.clientHeight-e.scrollTop);
 await expect(log.locator('article')).toHaveCount(50);await expect.poll(bottom).toBeLessThan(2);
 await log.evaluate(e=>{(e.firstElementChild as HTMLElement).style.paddingBottom='180px';e.dispatchEvent(new Event('scroll'));});await expect.poll(bottom).toBeLessThan(2);await log.evaluate(e=>{(e.firstElementChild as HTMLElement).style.paddingBottom='';});await expect.poll(bottom).toBeLessThan(2);
 messages.push({...messages[0],id:'message-121',seq:121,body:'New arrival'});unread=1;
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(log.locator('article').last()).toContainText('New arrival');await expect.poll(bottom).toBeLessThan(2);
 await log.dispatchEvent('wheel',{deltaY:-300});await log.evaluate(e=>{e.scrollTop=300;e.dispatchEvent(new Event('scroll'));});
 await expect(chat.getByRole('button',{name:'Latest messages'})).toBeVisible();
 const position=()=>log.evaluate(e=>{const n=[...e.querySelectorAll<HTMLElement>('article')].find(n=>n.getBoundingClientRect().bottom>e.getBoundingClientRect().top+2)!;return {id:n.dataset.chatMessage,y:n.getBoundingClientRect().top-e.getBoundingClientRect().top};});
 const before=await position();
 await chat.getByRole('button',{name:'Older messages',exact:true}).click();
 await expect(log.locator('article')).toHaveCount(100);
 expect((await position()).id).toBe(before.id);expect(Math.abs((await position()).y-before.y)).toBeLessThan(2);
 messages.push({...messages[0],id:'message-122',seq:122,body:'Unread while reading'});unread=1;
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(log.locator('article').last()).toContainText('Unread while reading');
 expect(await log.locator('article').count()).toBeGreaterThanOrEqual(100);
 expect((await position()).id).toBe(before.id);expect(Math.abs((await position()).y-before.y)).toBeLessThan(2);
 await expect(chat.getByRole('button',{name:'Latest messages (1 unread)',exact:true})).toBeVisible();expect(unread).toBe(1);
 await chat.getByRole('button',{name:'Latest messages (1 unread)',exact:true}).click();await expect.poll(bottom).toBeLessThan(2);await expect.poll(()=>unread).toBe(0);
 await page.setViewportSize({width:width===1440?1024:375,height:800});await expect.poll(bottom).toBeLessThan(2);
 await chat.getByRole('button',{name:'Close chat',exact:true}).click();await expect(log).toBeHidden();
 await chat.locator(':scope > button.pt-chat-toggle').click();await expect(log.locator('article')).toHaveCount(50);await expect.poll(bottom).toBeLessThan(2);
 await log.dispatchEvent('wheel',{deltaY:-300});await log.evaluate(e=>{e.scrollTop=200;e.dispatchEvent(new Event('scroll'));});
 await page.setViewportSize({width:width===1440?1440:width,height:600});
 await chat.getByLabel('Message the game',{exact:true}).fill('My new message');
 await chat.getByRole('button',{name:'Send message',exact:true}).click();
 await expect(log.locator('article').last()).toContainText('My new message');await expect.poll(bottom).toBeLessThan(2);
 await expect.poll(()=>log.locator('article').last().evaluate(e=>{const r=e.getBoundingClientRect(),dialog=e.closest('dialog')!,log=e.closest('.pt-chat-log')!.getBoundingClientRect(),composer=dialog.querySelector('.pt-chat-compose-footer')!.getBoundingClientRect();return r.top>=log.top&&r.bottom<=composer.top;})).toBe(true);

 available=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(log).toHaveCount(0);await expect(chat).not.toContainText('My new message');
});
