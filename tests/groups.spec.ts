import {test,expect} from '@playwright/test';
const id='20000000-0000-4000-8000-000000000001';
const group={id,name:'Fairfax Tennis Friends',publicDescription:'A local tennis community.',generalLocation:'Fairfax, VA',visibility:'private'};
const content={description:'Members play friendly doubles together.',skillPreference:'intermediate',version:1};
test.beforeEach(async({page})=>{
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player:{id:'member',displayName:'Tennis Friend'},csrfToken:'csrf',providers:{google:true,apple:true},connectedProviders:['google']}}));
 await page.route('**/api/games/feed?**',r=>r.fulfill({json:{games:[],nextCursor:null}}));
 await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[]}}));
 await page.route('**/api/groups**',r=>{const url=new URL(r.request().url());if(url.pathname==='/api/groups')return r.fulfill({json:{groups:[group],next:null}});if(url.pathname==='/api/groups/mine')return r.fulfill({json:{groups:[{...group,membershipStatus:'active',role:'member',status:'active'}]}});if(url.pathname.endsWith('/invitations'))return r.fulfill({json:{invitations:[]}});if(url.pathname.endsWith('/members'))return r.fulfill({json:{players:[{id:'member',displayName:'Tennis Friend',role:'member'},{id:'owner',displayName:'Group Owner',role:'owner'}]}});if(url.pathname.endsWith('/requests'))return r.fulfill({json:{players:[{id:'pending',displayName:'Pending Player',role:'member'}]}});return r.fulfill({json:{group,membership:{status:'none',role:null},archived:false}});});
});
for(const theme of ['light','dark'] as const){
 test('group previews fit mobile and preserve privacy in '+theme,async({page})=>{
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width:393,height:852});await page.goto('/play-together/groups');await expect(page.getByRole('heading',{name:group.name})).toBeVisible();await page.getByRole('link',{name:'View group preview'}).click();await expect(page.getByRole('button',{name:'Request to join group'})).toBeVisible();await expect(page.getByText(content.description)).toHaveCount(0);await expect(page.getByText('Group Owner',{exact:false})).toHaveCount(0);await expect(page).toHaveScreenshot('private-group-preview-'+theme+'.png',{fullPage:true});
 await page.setViewportSize({width:320,height:852});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 });
}
test('membership requests remain pending and can be withdrawn',async({page})=>{
 let pending=false;
 await page.route('**/api/groups/'+id,r=>r.fulfill({json:{group,membership:{status:pending?'pending':'none',role:null},archived:false}}));
 await page.route('**/api/groups/'+id+'/request',r=>{expect(r.request().headers()['x-csrf-token']).toBe('csrf');pending=true;return r.fulfill({json:{ok:true}});});
 await page.route('**/api/groups/'+id+'/leave',r=>{pending=false;return r.fulfill({json:{ok:true}});});
 await page.goto('/play-together/group?id='+id);await page.getByRole('button',{name:'Request to join group'}).click();await expect(page.getByText('Your membership request is awaiting approval.')).toBeVisible();await expect(page.getByRole('heading',{name:'Members-only information'})).toHaveCount(0);await page.getByRole('button',{name:'Withdraw membership request'}).click();await expect(page.getByRole('button',{name:'Request to join group'})).toBeVisible();
});
test('member-only content disappears when membership is revoked',async({page})=>{
 let active=true;
 await page.route('**/api/groups/'+id,r=>r.fulfill({json:{group,membership:{status:active?'active':'removed',role:active?'member':null},archived:false,...(active?{content}:{})}}));
 await page.goto('/play-together/group?id='+id);await expect(page.getByText(content.description)).toBeVisible();await expect(page.locator('.pt-member-identity').filter({hasText:'Tennis Friend'})).toBeVisible();active=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByText(content.description)).toHaveCount(0);await expect(page.locator('.pt-member-identity').filter({hasText:'Tennis Friend'})).toHaveCount(0);
});
test('owner can approve requests and only sends editable fields',async({page})=>{
 let approved=false;
 await page.route('**/api/groups/'+id,r=>r.fulfill({json:{group,membership:{status:'active',role:'owner'},archived:false,content}}));
 await page.route('**/api/groups/'+id+'/requests',r=>r.fulfill({json:{players:approved?[]:[{id:'pending',displayName:'Pending Player',role:'member'}]}}));
 await page.route('**/api/groups/'+id+'/approve',r=>{approved=true;return r.fulfill({json:{ok:true}});});
 await page.route('**/api/groups/'+id+'/edit',r=>{const body=r.request().postDataJSON();expect(body.id).toBeUndefined();expect(body.version).toBe(1);return r.fulfill({json:{ok:true}});});
 await page.goto('/play-together/group?id='+id);await page.getByRole('button',{name:'Approve Pending Player'}).click();await expect(page.getByText('No pending membership requests.')).toBeVisible();await page.getByRole('button',{name:'Edit group',exact:true}).click();await page.getByLabel('Members-only description').fill('Updated member details');await page.getByRole('button',{name:'Save group',exact:true}).click();await expect(page.getByText('Group updated.',{exact:true})).toBeVisible();
});
test('creates a private group with separate public and member descriptions',async({page})=>{
 await page.route('**/api/groups',r=>{if(r.request().method()==='POST'){expect(r.request().postDataJSON()).toMatchObject({visibility:'private',name:'New tennis group',publicDescription:'Public introduction',description:'Members only',generalLocation:'Fairfax, VA'});return r.fulfill({json:{id}});}return r.fulfill({json:{groups:[],next:null}});});
 await page.goto('/play-together/create-group');await page.getByLabel('Group name',{exact:true}).fill('New tennis group');await page.getByLabel('Public description (optional)').fill('Public introduction');await page.getByLabel('General location',{exact:false}).fill('Fairfax, VA');await page.getByLabel('Members-only description').fill('Members only');await page.getByRole('button',{name:'Create group',exact:true}).click();await expect(page).toHaveURL(new RegExp('/play-together/group\\?id='+id));
});
test('My Groups and theme switching work on narrow screens',async({page})=>{
 await page.setViewportSize({width:320,height:852});await page.goto('/play-together/my-groups');await expect(page.getByRole('heading',{name:group.name})).toBeVisible();const nav=page.getByRole('navigation',{name:'Group navigation'});await expect(nav.getByRole('link',{name:'My Groups'})).toHaveAttribute('aria-current','page');for(const colorScheme of ['light','dark'] as const){await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await expect(nav).toHaveScreenshot('group-buttons-mobile-'+colorScheme+'.png');}await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('.app')).toHaveClass(/dark/);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('primary Owner explicitly assigns a Co-owner with confirmation',async({page})=>{
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player:{id:'owner',displayName:'Group Owner'},csrfToken:'csrf'}}));
 await page.route('**/api/groups/'+id,r=>r.fulfill({json:{group,membership:{status:'active',role:'owner'},archived:false,content}}));
 await page.route('**/api/groups/'+id+'/role',r=>{expect(r.request().postDataJSON()).toEqual({playerId:'member',role:'coowner'});return r.fulfill({json:{ok:true}});});
 await page.goto('/play-together/group?id='+id);await page.getByLabel('Manage Tennis Friend',{exact:true}).click();await page.getByLabel('Role for Tennis Friend').selectOption('coowner');await expect(page.getByText('Change Tennis Friend to Co-owner?',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByText('Group updated.',{exact:true})).toBeVisible();
});


test('invitation preview contains no member details and submits only a membership request',async({page})=>{
 const token='a'.repeat(64);await page.route('**/api/groups/invitation-preview',r=>{expect(r.request().postDataJSON()).toEqual({token});return r.fulfill({json:{group}});});
 await page.route('**/api/groups/invitation-accept',r=>{expect(r.request().headers()['x-csrf-token']).toBe('csrf');return r.fulfill({json:{groupId:id}});});
 await page.goto('/play-together/invitation#'+token);await expect(page.getByRole('heading',{name:group.name})).toBeVisible();await expect(page.getByText(content.description)).toHaveCount(0);await page.getByRole('button',{name:'Request membership',exact:true}).click();await expect(page).toHaveURL(url=>url.pathname==='/play-together/group'&&url.searchParams.get('id')===id);
});
test('group Owner creates and revokes an invitation link',async({page})=>{
 const token='b'.repeat(64);let created=false,revoked=false;
 await page.route('**/api/groups/'+id,r=>r.fulfill({json:{group,membership:{status:'active',role:'owner'},archived:false,content}}));
 await page.route('**/api/groups/'+id+'/invitations',r=>{if(r.request().method()==='POST'){created=true;return r.fulfill({json:{id:'invite',url:'https://example.test/play-together/invitation#'+token}});}return r.fulfill({json:{invitations:created?[{id:'invite',createdAt:Date.now(),expiresAt:null,revokedAt:revoked?Date.now():null}]:[]}});});
 await page.route('**/api/groups/'+id+'/revoke-invitation',r=>{expect(r.request().postDataJSON()).toEqual({invitationId:'invite'});revoked=true;return r.fulfill({json:{ok:true}});});
 await page.goto('/play-together/group?id='+id);await page.getByRole('button',{name:'Create invitation link'}).click();await expect(page.getByRole('textbox',{name:'Invitation link'})).toHaveValue('https://example.test/play-together/invitation#'+token);await page.getByRole('button',{name:'Revoke invitation'}).click();await expect(page.getByRole('button',{name:'Revoke invitation'})).toHaveCount(0);
});

test('personal feed displays group and participation state with filters',async({page})=>{
 const game={id,title:'Members doubles',court:{name:'Local Park'},startsAt:'2030-06-15T10:00:00Z',endsAt:'2030-06-15T11:00:00Z',timeZone:'UTC',status:'scheduled',visibility:'group',groupName:group.name,joined:true,isOrganizer:false,requestStatus:null,playerCount:2,capacity:4};
 await page.route('**/api/games/feed?**',r=>r.fulfill({json:{games:[game],nextCursor:null}}));await page.goto('/play-together/feed');await expect(page.getByRole('heading',{name:'Your tennis feed'})).toBeVisible();await expect(page.getByText('Going',{exact:true})).toBeVisible();await expect(page.getByText('By '+group.name,{exact:true})).toBeVisible();await page.getByRole('button',{name:'My Groups',exact:true}).click();await expect(page.getByRole('button',{name:'My Groups',exact:true})).toHaveAttribute('aria-pressed','true');await page.setViewportSize({width:320,height:852});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
for(const theme of ['light','dark'] as const){test('member directory uses compact rows in '+theme,async({page})=>{
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
 await page.route('**/api/groups/'+id,r=>r.fulfill({json:{group,membership:{status:'active',role:'member'},archived:false,content}}));
 for(const width of [393,1280]){await page.setViewportSize({width,height:1000});await page.goto('/play-together/group?id='+id);const list=page.locator('.pt-member-list');await expect(list.locator('li')).toHaveCount(2);for(const row of await list.locator('li').all()){expect((await row.boundingBox())!.height).toBeLessThanOrEqual(56);await expect(row).toHaveCSS('border-radius','0px');}await list.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(list).toHaveScreenshot('member-directory-'+width+'-'+theme+'.png');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);}
});}
