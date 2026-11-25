// Real application rendering with synthetic, browser-local API responses only.
// Never creates accounts, games, groups or messages on the server.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const profile=process.env.STORE_CAPTURE_PROFILE||'phone';
if(!['phone','tablet-7-inch','tablet-10-inch'].includes(profile))throw Error('Unknown capture profile');
const tablet=profile!=='phone';
const viewport=profile==='tablet-7-inch'?{width:800,height:1280}:profile==='tablet-10-inch'?{width:1280,height:800}:{width:432,height:864};
const scale=profile==='tablet-7-inch'?1.5:profile==='tablet-10-inch'?2:2.5;
const out=path.resolve('android-app/play-store/'+(tablet?profile:'screenshots'));
const id='10000000-0000-4000-8000-000000000001';
const court={id:'sample-court',name:'Fair Woods Park',lat:38.86,lon:-77.36,access:'public'};
const game={id,title:'Saturday morning doubles',visibility:'public',court,startsAt:'2027-06-19T13:00:00Z',endsAt:'2027-06-19T14:30:00Z',timeZone:'America/New_York',format:'doubles',capacity:4,skillPreference:'any',status:'scheduled',organizer:{id:'alex',displayName:'Alex'},playerCount:3,notes:'Friendly doubles. Bring water and tennis balls. Meet by court 2.'};
const groups=[{id:'group-one',name:'Fairfax Tennis Friends',generalLocation:'Fairfax, VA',publicDescription:'Friendly weekly doubles and good company. All skill levels welcome.',visibility:'public'},{id:'group-two',name:'Weekend Rally Club',generalLocation:'Arlington, VA',publicDescription:'Find your next hitting partner and keep your weekends active.',visibility:'public'}];
if(profile==='tablet-7-inch')groups.push({id:'group-three',name:'Morning Tennis Crew',generalLocation:'Vienna, VA',publicDescription:'Start your day with a friendly hit. Singles, doubles and weekly games.',visibility:'public'},{id:'group-four',name:'After-work Tennis',generalLocation:'Reston, VA',publicDescription:'Meet local players for evening rallies and relaxed doubles.',visibility:'public'});
const people=[{id:'alex',displayName:'Alex',role:'organizer'},{id:'me',displayName:'Taylor',role:'player'},{id:'jordan',displayName:'Jordan',role:'player'}];
const bodies=[['alex','Alex','Hi everyone! See you at court 2 on Saturday.'],['jordan','Jordan','Looking forward to it! I can bring a fresh can of balls.'],['me','Taylor','Perfect. I’ll be there a few minutes early to warm up.'],['alex','Alex','Great! Friendly doubles, then we can switch partners.'],['jordan','Jordan','Sounds good. See you on the court!'],['me','Taylor','See you both Saturday!']];
const messages=bodies.map(([authorId,displayName,body],i)=>({id:'sample-'+i,seq:i+1,authorId,displayName,body,createdAt:Date.parse('2027-06-18T18:00:00Z')+i*60000,hiddenAt:null}));
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.OPENCOURTS_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});const manifest=[];
try{for(const screen of [...(tablet?[{file:'01-court-discovery.png',route:'/',ready:'.court-list-card',main:true},{file:'02-court-map.png',route:'/',ready:'.court-list-card',main:true,scroll:'#explore'},{file:'03-weather.png',route:'/#conditions',ready:'.weather-overview',main:true,scroll:'#conditions'}]:[]),{file:(tablet?'04':'01')+'-find-games.png',route:'/play-together?find=1',ready:'.pt-game-card',scroll:'.pt-results-title'},{file:(tablet?'05':'02')+'-game-details.png',route:'/play-together/game?id='+id,ready:'.pt-game-facts'},{file:(tablet?'06':'03')+'-tennis-groups.png',route:'/play-together/groups',ready:'.pt-game-grid article'},{file:(tablet?'07':'04')+'-game-chat.png',route:'/play-together/game?id='+id+'#chat',ready:'.pt-chat-message',dark:true}]){
 const page=await browser.newPage({viewport,deviceScaleFactor:scale,isMobile:true,hasTouch:true,colorScheme:screen.dark?'dark':'light',timezoneId:'America/New_York',reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(screen.main)await page.addInitScript(()=>localStorage.setItem('opencourts-place-v2',JSON.stringify({label:'Fairfax, VA',lat:38.8462,lon:-77.3064,countryCode:'us'})));
 await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname;let json={};
 if(screen.main&&['/api/courts','/api/weather','/api/weather-alerts','/api/rain','/api/court-context','/api/geocode','/api/suggest'].includes(p))return r.continue();
 if(p==='/api/auth/me')json={player:{id:'me',displayName:'Taylor',ageConfirmed:true},csrfToken:'sample-only',providers:{google:true,apple:true},connectedProviders:['google']};
 else if(p==='/api/players/blocks')json={players:[],moderator:false};
 else if(p==='/api/games/notifications')json={notifications:[]};
 else if(p==='/api/games')json={games:[game,{...game,id:'second-game',title:'After-work singles',startsAt:'2027-06-21T22:00:00Z',endsAt:'2027-06-21T23:00:00Z',format:'singles',capacity:2,playerCount:1,court:{...court,name:'Van Dyck Park'},notes:'A relaxed hit after work.'}],nextCursor:null};
 else if(p==='/api/groups')json={groups,next:null};
 else if(p==='/api/games/'+id)json={game};
 else if(p.endsWith('/participation'))json={isOrganizer:false,joined:true,requestStatus:'approved',joinPolicy:'approval',version:1};
 else if(p.endsWith('/participants'))json={players:people};
 else if(p.endsWith('/guests'))json={own:null,requests:[],isHost:false};
 else if(p.endsWith('/cancellations'))json={players:[]};
 else if(p.endsWith('/chat'))json={available:true,canSend:true,series:false,audience:people,messages,viewerId:'me',unread:0,hasOlder:false,muted:false,expiresAt:Date.parse('2027-07-19'),closesAt:Date.parse('2027-06-20')};
 else if(p.endsWith('/chat/read'))json={ok:true};
 else if(p.includes('/push'))json={available:true,enabled:true,subscribed:true};
 else if(p.endsWith('/invitations'))json={invitations:[]};
 return r.fulfill({json});});
 await page.goto('https://opencourts.us'+screen.route);await page.locator(screen.ready).first().waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);
 if(screen.main){await page.locator('.maplibregl-canvas').waitFor();await page.waitForTimeout(2500);}
 if(screen.scroll&&(!tablet||screen.main||profile==='tablet-10-inch'))await page.locator(screen.scroll).evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-80));
 await page.waitForTimeout(600);if(errors.length)throw Error(JSON.stringify(errors));if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
 await page.screenshot({path:path.join(out,screen.file),animations:'disabled'});manifest.push({file:screen.file,route:screen.route,theme:screen.dark?'dark':'light',width:viewport.width*scale,height:viewport.height*scale,syntheticData:!screen.main,applicationCssModified:false});await page.close();
}}finally{await browser.close();}fs.writeFileSync(path.join(out,'capture-manifest.json'),JSON.stringify({capturedAt:new Date().toISOString(),profile,source:'Live production interface; public court/weather data live, community API responses intercepted locally with sample data; no real account session',screens:manifest},null,2)+'\n');console.log(JSON.stringify(manifest));})().catch(e=>{console.error(e);process.exitCode=1});


