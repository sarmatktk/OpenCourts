import {test,expect} from '@playwright/test';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
test.describe.configure({mode:'parallel'});
test.skip(!existsSync(resolve('.wrangler/qa-audit/axe.min.js')), 'Optional audit requires axe-core 4.10.3 in .wrangler/qa-audit/axe.min.js; see docs/QA_AUDIT.md.');
const groupId='20000000-0000-4000-8000-000000000001',gameId='10000000-0000-4000-8000-000000000001';
const densityPhase=process.env.OPENCOURTS_DENSITY_AUDIT;
const output=densityPhase?resolve('.wrangler/qa-audit/density-'+densityPhase):resolve('docs/qa-evidence');
const player={id:'qa-owner',displayName:'QA Organizer',bio:'Friendly weekend doubles.',generalLocation:'Fairfax, Virginia',skillLevel:'intermediate',discoverable:true};
const game={id:gameId,title:'Saturday morning doubles at Franklin Glen',court:{id:'qa-court',name:'Franklin Glen Park',lat:38.87,lon:-77.38,access:'public'},startsAt:'2030-06-15T14:00:00Z',endsAt:'2030-06-15T16:00:00Z',timeZone:'America/New_York',format:'doubles',capacity:4,skillPreference:'intermediate',status:'scheduled',organizer:{displayName:'QA Organizer'},playerCount:3,notes:'Bring balls and water.',visibility:'group',groupId,isHost:true};
const group={id:groupId,name:'Fairfax Weekend Tennis',publicDescription:'Friendly local tennis.',generalLocation:'Fairfax, Virginia',visibility:'private'};
const courts=[{type:'node',id:101,lat:38.87,lon:-77.38,tags:{leisure:'pitch',sport:'tennis',name:'Franklin Glen Park',lit:'yes',access:'yes'}}];
const routes=[['courts','/'],['discovery','/play-together'],['feed','/play-together/feed'],['create-game','/play-together/create'],['game-host','/play-together/game?id='+gameId],['game-member','/play-together/game?id='+gameId+'&qa=member'],['schedule','/play-together/my-games'],['inbox','/play-together/notifications'],['account','/account'],['signin','/account?qa=signedout'],['groups','/play-together/groups'],['my-groups','/play-together/my-groups'],['create-group','/play-together/create-group'],['group-owner','/play-together/group?id='+groupId],['group-preview','/play-together/group?id='+groupId+'&qa=visitor'],['group-invitation','/play-together/invitation#'+'a'.repeat(64)],['game-invitation','/play-together/game-invitation#'+'a'.repeat(64)],['players-moderator','/play-together/players'],['about','/about.html'],['support','/support.html'],['privacy','/privacy.html'],['contact','/contact.html'],['court-guide','/public-tennis-courts-fairfax-va.html'],['rain-guide','/tennis-courts-after-rain.html'],['timing-guide','/best-time-to-play-tennis.html']];
if(densityPhase)routes.push(['game-search','/play-together?find=1'],['terms','/terms.html'],['help','/play-together-help.html'],['delete-account','/delete-account.html'],['manage-series','/play-together/manage-series?id='+gameId],...(densityPhase!=='before'?[['community-welcome','/play-together']]:[]));
if(densityPhase&&process.env.OPENCOURTS_DENSITY_VIEWS){const selected=process.env.OPENCOURTS_DENSITY_VIEWS.split(',');for(let i=routes.length-1;i>=0;i--)if(!selected.includes(routes[i][0]))routes.splice(i,1);}
for(const width of (densityPhase?(process.env.OPENCOURTS_DENSITY_WIDTHS?.split(',').map(Number)??[320,390,1440]):[320,375,390,430,768,1024,1440]))for(const theme of ['light','dark'] as const){test(`audit matrix ${width} ${theme}`,async({page})=>{
 test.setTimeout(240000);mkdirSync(output,{recursive:true});await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});let mode='owner';
 await page.route('**/api/**',async r=>{const u=new URL(r.request().url()),path=u.pathname;let data:any={};
 if(path==='/api/auth/me')data={player:mode==='signedout'?null:player,csrfToken:'qa-csrf',providers:{google:true,apple:true},connectedProviders:['google','apple'],connectedAccounts:[{provider:'google',email:'synthetic@example.invalid'},{provider:'apple',email:'synthetic@privaterelay.appleid.com'}]};
 else if(path.startsWith('/api/media/'))return r.fulfill({status:404,body:''});
 else if(path==='/api/games'||path==='/api/games/feed')data={games:[{...game,groupName:group.name,joined:true,isOrganizer:true}],nextCursor:null};
 else if(path==='/api/games/courts')data={courts:[{...game.court,distanceMiles:1,selectionToken:'qa-proof'}]};
 else if(path==='/api/games/'+gameId)data={game:{...game,isHost:mode!=='member'}};
 else if(path.endsWith('/series'))data={seriesId:null,games:[{id:gameId,title:game.title,startsAt:game.startsAt,startLocal:'2030-06-15T10:00',timeZone:game.timeZone,status:'scheduled',editable:true,capacity:4,playerCount:3}]};
 else if(path.endsWith('/participation'))data={isOrganizer:mode!=='member',joined:true,joinPolicy:'instant',version:1,requestStatus:null};
 else if(path.endsWith('/participants'))data={players:[{id:player.id,displayName:player.displayName},{id:'qa-member',displayName:'QA Member',guestCount:1}]};
 else if(path.endsWith('/waitlist'))data={players:[]};
 else if(path.endsWith('/guests'))data={own:{confirmed:0,requested:null,status:null},requests:mode==='member'?[]:[{playerId:'qa-member',displayName:'QA Member',guestCount:1}],isHost:mode!=='member'};
 else if(path==='/api/games/mine')data={games:[{...game,starts_at:Date.parse(game.startsAt),ends_at:Date.parse(game.endsAt),time_zone:game.timeZone,court_name:game.court.name,isOrganizer:true,joined:1,section:'upcoming'}],nextCursor:null};
 else if(path==='/api/games/notifications')data={notifications:Array.from({length:25},(_,i)=>({id:'note'+i,gameId,gameTitle:game.title,displayName:'QA Player '+i,kind:'requested',requestStatus:'pending',actionPlayerId:'qa-member',createdAt:Date.UTC(2026,10,17,17,0)-i*1000,readAt:null}))};
 else if(path.endsWith('/cancellations'))data={players:[{displayName:'QA Member',reason:'Plans changed',cancelledAt:Date.now()}]};
 else if(path==='/api/groups'||path==='/api/groups/mine')data={groups:[{...group,membershipStatus:'active',role:'owner',status:'active'}],next:null};
 else if(path==='/api/groups/invitation-preview')data={group};
 else if(path.endsWith('/invitations'))data={invitations:[{id:'invite',createdAt:Date.UTC(2026,10,17),expiresAt:null,revokedAt:null}]};
 else if(path.endsWith('/members'))data={players:[{id:player.id,displayName:player.displayName,role:'owner'},{id:'qa-member',displayName:'QA Member',role:'member'},{id:'qa-organizer',displayName:'QA Event Organizer',role:'organizer'}],next:null};
 else if(path.endsWith('/requests'))data={players:[{id:'qa-pending',displayName:'QA Pending Player'}]};
 else if(path==='/api/groups/'+groupId)data={group,membership:{status:mode==='visitor'?'none':'active',role:'owner'},archived:false,...(mode==='visitor'?{}:{content:{description:'Members coordinate friendly tennis. Private content.',skillPreference:'intermediate',version:1}})};
 else if(path==='/api/players')data={players:[{id:'qa-member',displayName:'QA Member',generalLocation:'Fairfax',skillLevel:'intermediate',bio:'Weekend tennis.'}],next:null};
 else if(path==='/api/players/blocks')data={players:[],moderator:mode!=='signedout'};
 else if(path==='/api/players/reports')data={reports:[{id:'qa-report',subjectType:'group',subjectId:groupId,category:'other',details:'Synthetic audit report.'}]};
 else if(path==='/api/courts')data={elements:courts};
 else if(path==='/api/court-context')data={elements:[]};
 else if(path==='/api/rain')data={assessments:[]};
 else if(path==='/api/weather')data={periods:Array.from({length:72},(_,i)=>({time:new Date(Date.now()+i*3600000).toISOString(),endTime:new Date(Date.now()+(i+1)*3600000).toISOString(),temp:65,wind:5,precip:0,humidity:45,short:'Clear',icon:''})),timeZone:'America/New_York'};
 else if(path==='/api/weather-alerts')data={alerts:[],supported:false};
 else if(path==='/api/suggest')data={suggestions:[]};
 else data={ok:true};return r.fulfill({json:data});});
 const records:any[]=[];
 for(const [name,path] of routes){mode=(name==='signin'||name==='community-welcome')?'signedout':name==='group-preview'?'visitor':name==='game-member'?'member':'owner';const errors:string[]=[];const onError=(e:Error)=>errors.push(e.message);page.on('pageerror',onError);const started=Date.now();await page.goto(path);await expect(page.locator('h1').first(), 'Visible heading for audit route '+name+' ('+path+')').toBeVisible({timeout:15000});await page.waitForTimeout(220);await page.evaluate(()=>document.fonts.ready);const measurements=await page.evaluate(()=>{
 const visible=(el:Element)=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;};
 const selector=(el:Element)=>el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.trim().replace(/\s+/g,'.'):'');
 return {pageHeight:document.documentElement.scrollHeight,panels:[...document.querySelectorAll('.pt-panel,.page-card,.pt-notification-card,.pt-member-row,.pt-game-card')].filter(visible).map(el=>({selector:selector(el),height:Math.round(el.getBoundingClientRect().height),padding:getComputedStyle(el).padding})),scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,title:document.title,headings:[...document.querySelectorAll('h1')].filter(visible).length,overflow:[...document.querySelectorAll('body *')].filter(el=>visible(el)&&el.getBoundingClientRect().right>innerWidth+2&&!el.closest('.pt-location-options,.pt-feed-filters,.maplibregl-map')).slice(0,8).map(selector),smallTargets:[...document.querySelectorAll('a,button,input,select,summary')].filter(visible).map(el=>({selector:selector(el),label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,70),w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)})).filter(x=>x.h<24||x.w<24).slice(0,20),themeBackground:getComputedStyle(document.querySelector('.app')||document.body).backgroundColor,requests:performance.getEntriesByType('resource').filter((e:any)=>e.name.includes('/api/auth/me')).length};
 });
 await page.addScriptTag({path:resolve('.wrangler/qa-audit/axe.min.js')});const axe=await page.evaluate(async()=>{const a=await (window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:a.violations.map((v:any)=>({id:v.id,impact:v.impact,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.slice(0,8).map((n:any)=>({target:n.target,summary:n.failureSummary,html:n.html.slice(0,300)}))})),incomplete:a.incomplete.map((v:any)=>({id:v.id,count:v.nodes.length}))};});
 if(densityPhase||[390,1440].includes(width)&&['account','game-host','group-owner','players-moderator','courts','inbox','signin','support'].includes(name))await page.screenshot({path:resolve(output,`${name}-${width}-${theme}.png`),fullPage:true});
 records.push({name,path,width,theme,ms:Date.now()-started,errors,...measurements,...axe});page.off('pageerror',onError);expect(errors,'No JavaScript errors for audit route '+name+' ('+path+')').toEqual([]);
 }
 writeFileSync(resolve(output,`matrix-${width}-${theme}.json`),JSON.stringify(records,null,2));expect(records).toHaveLength(routes.length);expect(records.flatMap(r=>r.violations.filter((v:any)=>["color-contrast","aria-allowed-attr"].includes(v.id)).map((v:any)=>({page:r.name,rule:v.id,nodes:v.nodes})))).toEqual([]);
});}
