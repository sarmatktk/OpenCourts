import { expect, test } from '@playwright/test';

const player = { id:'demo-player',displayName:'Court Friend',bio:'Weekend doubles.',generalLocation:'Fairfax',skillLevel:'intermediate',discoverable:false };
test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me',route=>route.fulfill({ json:{ player:null,csrfToken:null,providers:{ google:true,apple:true },connectedProviders:[] } }));
  await page.route('**/api/games?**',route=>route.fulfill({json:{games:[],nextCursor:null}}));
});
test('Play Together opens the community home and account settings have a separate entry',async ({ page })=>{
  await page.setViewportSize({ width:393,height:852 });
  await page.goto('/play-together');
  await expect(page.getByRole('heading',{ name:'Find your next game.' })).toBeVisible();
  await expect(page.getByLabel('Display name')).toHaveCount(0);
  await expect(page.getByRole('button',{ name:'Continue with Google' })).toHaveCount(0);
  await expect(page.getByRole('heading',{ name:'Games near you' })).toBeVisible();
  await expect(page.getByRole('heading',{ name:'Your tennis groups' })).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
  await page.getByRole('link',{ name:'Account and settings' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('button',{ name:'Continue with Google' })).toBeVisible();
  await page.getByRole('navigation',{name:'Play Together quick navigation'}).getByRole('link',{name:'Find games',exact:true}).click();
  await expect(page).toHaveURL(/\/play-together#search$/);
});
for (const colorScheme of ['light','dark'] as const) {
  test(`sign-in matches the existing ${colorScheme} theme`,async ({ page })=>{
    await page.emulateMedia({ colorScheme,reducedMotion:'reduce' });
    await page.setViewportSize({ width:1280,height:900 });
    await page.goto('/account');
    await expect(page.getByRole('button',{ name:'Continue with Google' })).toBeDisabled();await page.getByRole('checkbox',{name:'I confirm I am 18 or older.'}).check();await expect(page.getByRole('button',{ name:'Continue with Google' })).toBeEnabled();
    await expect(page.getByRole('button',{ name:'Continue with Apple' })).toBeEnabled();
    await expect(page.getByRole('button',{ name:/password|email sign/i })).toHaveCount(0);
    await expect(page.locator('.app')).toHaveClass(colorScheme==='dark' ? 'app dark' : 'app');
    const contrast = await page.locator('.pt-panel p').first().evaluate(element => {
      const luminance = (color:string) => {
        const values=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{ const x=v/255; return x<=.04045?x/12.92:((x+.055)/1.055)**2.4; });
        return values[0]*.2126+values[1]*.7152+values[2]*.0722;
      };
      const canvas=document.createElement('canvas'); const context=canvas.getContext('2d')!;
      // Canvas resolves color-mix() to a numerical color in current browsers.
      const rgb=(value:string)=>{context.fillStyle=value;context.fillRect(0,0,1,1);const p=context.getImageData(0,0,1,1).data;return `rgb(${p[0]},${p[1]},${p[2]})`;};
      const a=luminance(rgb(getComputedStyle(element).color));
      const b=luminance(rgb(getComputedStyle(element.closest('.pt-panel')!).backgroundColor));
      return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await expect(page).toHaveScreenshot(`signin-${colorScheme}.png`,{ fullPage:true,animations:'disabled' });
  });
  test(`profile is editable and mobile friendly in ${colorScheme} mode`,async ({ page })=>{
    await page.emulateMedia({ colorScheme,reducedMotion:'reduce' });
    await page.setViewportSize({ width:393,height:852 });
    let saved = { ...player };
    await page.route('**/api/auth/me',async route=>{
      if (route.request().method()==='PATCH') {
        expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
        saved={ ...saved,...route.request().postDataJSON() };
        return route.fulfill({ json:{ player:saved } });
      }
      return route.fulfill({ json:{ player:saved,csrfToken:'test-csrf',providers:{ google:true,apple:true },connectedProviders:['google'] } });
    });
    await page.goto('/account');
    await expect(page.getByLabel('Display name')).toHaveValue('Court Friend');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
    await expect(page).toHaveScreenshot(`profile-mobile-${colorScheme}.png`,{ fullPage:true,animations:'disabled' });
    await page.getByLabel('Display name').fill('Doubles Friend');
    await page.getByRole('button',{ name:'Save profile' }).click();
    await expect(page.getByRole('status')).toHaveText('Your player profile has been saved.');
    expect(saved.displayName).toBe('Doubles Friend');
    await page.getByRole('button',{ name:'Delete my account' }).click();
    await expect(page.getByRole('button',{ name:'Permanently delete',exact:true })).toBeDisabled();
    await page.getByLabel('Type DELETE to confirm').fill('DELETE');
    await expect(page.getByRole('button',{ name:'Permanently delete',exact:true })).toBeEnabled();
    await page.getByRole('button',{ name:'Keep my account' }).click();
    await expect(page.getByLabel('Type DELETE to confirm')).toHaveCount(0);
  });
}
test('device theme wins over old overrides and updates live across pages',async ({ page })=>{
  await page.emulateMedia({ colorScheme:'light' });
  await page.addInitScript(()=>localStorage.setItem('opencourts-theme','dark'));
  await page.goto('/account');
  await expect(page.locator('.app')).toHaveClass('app');
  await expect(page.getByRole('button',{ name:/Use (dark|light|device) theme/ })).toHaveCount(0);
  await page.emulateMedia({ colorScheme:'dark' });
  await expect(page.locator('.app')).toHaveClass('app dark');
  await page.reload(); await expect(page.locator('.app')).toHaveClass('app dark');
  await page.emulateMedia({ colorScheme:'light' });
  await expect(page.locator('.app')).toHaveClass('app');
  await page.route('**/api/**',route=>route.fulfill({ json:{ elements:[],periods:[],alerts:[],assessments:[] } }));
  await page.goto('/');
  await expect(page.locator('.app')).toHaveClass('app');
  await expect(page.locator('.theme-toggle')).toHaveCount(0);
  await page.emulateMedia({ colorScheme:'dark' });
  await expect(page.locator('.app')).toHaveClass('app dark');
});
test('all narrow sign-in layouts fit, menu remains keyboard accessible, and unavailable providers are explicit',async ({ page })=>{
  await page.route('**/api/auth/me',route=>route.fulfill({ json:{ player:null,csrfToken:null,providers:{ google:false,apple:false },connectedProviders:[] } }));
  for (const width of [320,393,768]) {
    await page.setViewportSize({ width,height:800 }); await page.goto('/account');
    await expect(page.getByRole('button',{ name:'Continue with Google' })).toBeDisabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width:393,height:800 });
  await expect(page.getByRole('button',{ name:'Toggle menu' })).toBeHidden();
  await expect(page.getByRole('navigation',{name:'Play Together quick navigation'}).getByRole('link',{name:'Find games',exact:true})).toBeVisible();
});
test('does not send profile mutations to another origin or retain an expired profile',async ({ page })=>{
  let active=true;
  await page.route('**/api/auth/me',route=>route.fulfill({ json:{ player:active?player:null,csrfToken:active?'test-csrf':null,providers:{ google:true,apple:true },connectedProviders:active?['google']:[] } }));
  const remoteRequests:string[]=[];
  page.on('request',request=>{ if (request.url().includes('/api/auth/') && !request.url().startsWith('http://127.0.0.1:4173/')) remoteRequests.push(request.url()); });
  await page.goto('/account'); await expect(page.getByLabel('Display name')).toHaveValue('Court Friend');
  active=false; await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.getByLabel('Display name')).toHaveCount(0);
  expect(remoteRequests).toEqual([]);
});

test('profile save button reflects edits and persisted values after refresh',async({page})=>{
 let saved={...player};
 await page.route('**/api/auth/me',async route=>{
  if(route.request().method()==='PATCH'){saved={...saved,...route.request().postDataJSON()};return route.fulfill({json:{player:saved}});}
  return route.fulfill({json:{player:saved,csrfToken:'test-csrf',providers:{google:true,apple:true},connectedProviders:['google']}});
 });
 await page.goto('/account');
 await expect(page.getByRole('button',{name:'Profile saved',exact:true})).toBeDisabled();
 await page.getByLabel('Display name').fill('Updated Player');
 await expect(page.getByRole('button',{name:'Save profile',exact:true})).toBeEnabled();
 await page.getByLabel('Display name').fill(player.displayName);
 await expect(page.getByRole('button',{name:'Profile saved',exact:true})).toBeDisabled();
 await page.getByLabel('Display name').fill('Updated Player');
 await page.getByRole('button',{name:'Save profile',exact:true}).click();
 await expect(page.getByRole('button',{name:'Profile saved',exact:true})).toBeDisabled();
 await page.reload();
 await expect(page.getByLabel('Display name')).toHaveValue('Updated Player');
 await expect(page.getByRole('button',{name:'Profile saved',exact:true})).toBeDisabled();
});

test('optional photo upload shows preview, saves and removes independently of profile fields',async({page})=>{
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player,csrfToken:'test-csrf',providers:{google:true,apple:true},connectedProviders:['google']}}));
 await page.route('**/api/media/player/**',r=>{if(r.request().method()==='PUT'){expect(r.request().headers()['x-csrf-token']).toBe('test-csrf');return r.fulfill({json:{ok:true,url:'/api/media/player/demo-player?v=1'}});}if(r.request().method()==='DELETE')return r.fulfill({json:{ok:true,url:null}});return r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=','base64')});});
 await page.goto('/account');await page.locator('input[type=file]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=','base64')});await page.getByRole('button',{name:'Save photo',exact:true}).click();await expect(page.getByText('Photo saved.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Remove photo',exact:true}).click();await expect(page.getByText('Photo removed.',{exact:true})).toBeVisible();await expect(page.getByLabel('Display name')).toHaveValue(player.displayName);
});

test('photo pencil opens the same picker for adding and replacing an image',async({page})=>{
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player,csrfToken:'test-csrf',providers:{google:true,apple:true},connectedProviders:['google']}}));
 await page.route('**/api/media/player/**',r=>r.fulfill({status:404}));
 await page.goto('/account');const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Add or change player photo'}).click();await(await chooser).setFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=','base64')});
 await expect(page.getByText('Unsaved preview')).toBeVisible();await expect(page.getByRole('button',{name:'Add or change player photo'})).toBeVisible();await page.getByRole('button',{name:'Discard selection'}).click();await expect(page.getByText('Unsaved preview')).toHaveCount(0);
});

test('saved player photo replaces header icon and removal restores fallback',async({page})=>{
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player,csrfToken:'test-csrf',providers:{google:true,apple:true},connectedProviders:['google']}}));
 let present=true;await page.route('**/api/media/player/**',r=>present?r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=','base64')}):r.fulfill({status:404}));
 await page.goto('/account');await expect(page.getByRole('link',{name:'Account and settings'}).locator('img')).toBeVisible();present=false;await page.evaluate(()=>window.dispatchEvent(new Event('opencourts-photo-changed')));await expect(page.getByRole('link',{name:'Account and settings'}).locator('img')).toHaveCount(0);await expect(page.getByRole('link',{name:'Account and settings'}).locator('svg')).toBeVisible();
});
for(const theme of ['light','dark'] as const){test('portrait editor matches circular header framing in '+theme,async({page})=>{
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player,csrfToken:'csrf',providers:{google:true,apple:true},connectedProviders:['google']}}));
 await page.route('**/api/games/notifications',r=>r.fulfill({json:{notifications:[]}}));
 await page.route('**/api/media/player/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400"><rect width="200" height="400" fill="#b5c6ba"/><circle cx="100" cy="130" r="65" fill="#334b40"/><path d="M25 400V300Q100 190 175 300V400" fill="#334b40"/></svg>'}));
 for(const width of [320,393,1280]){await page.setViewportSize({width,height:1000});await page.goto('/account');const photo=page.getByRole('region',{name:'Player photo',exact:true});await expect(photo.getByRole('img')).toBeVisible();await expect(photo.getByRole('img')).toHaveCSS('object-fit','cover');await expect(photo.getByRole('img')).toHaveCSS('object-position','50% 25%');await expect(photo.locator('.pt-photo-preview')).toHaveCSS('border-radius','50%');const frame=await photo.locator('.pt-photo-preview').boundingBox(),img=await photo.getByRole('img').boundingBox();expect(Math.abs(frame!.height-img!.height)).toBeLessThan(3);expect(Math.abs(frame!.width-img!.width)).toBeLessThan(3);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);if(width===393)await expect(photo).toHaveScreenshot('portrait-editor-'+theme+'.png');}
});}
for(const theme of ['light','dark'] as const){test('avatar crop saves the selected framing in '+theme,async({page})=>{
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width:393,height:1000});
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player,csrfToken:'csrf',providers:{google:true,apple:true},connectedProviders:['google']}}));
 let uploaded:Buffer|null=null;await page.route('**/api/media/player/**',r=>{if(r.request().method()==='PUT'){uploaded=r.request().postDataBuffer();expect(r.request().headers()['content-type']).toBe('image/png');return r.fulfill({json:{ok:true,url:'/api/media/player/demo-player?v=crop'}});}return r.fulfill({status:404,body:''});});
 await page.goto('/account');const source=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=200;const x=c.getContext('2d')!;x.fillStyle='red';x.fillRect(0,0,100,100);x.fillStyle='blue';x.fillRect(0,100,100,100);return c.toDataURL('image/png').split(',')[1];});
 await page.locator('input[type=file]').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(source,'base64')});
 const vertical=page.getByLabel('Move up or down',{exact:true});await expect(vertical).toBeEnabled();await vertical.focus();await page.keyboard.press('End');await expect(vertical).toHaveValue('100');
 await page.getByLabel('Zoom',{exact:true}).fill('2');const crop=page.locator('.pt-avatar-crop-window');await crop.scrollIntoViewIfNeeded();const box=await crop.boundingBox();await page.mouse.move(box!.x+70,box!.y+70);await page.mouse.down();await page.mouse.move(box!.x+90,box!.y+70);await page.mouse.up();expect(Number(await page.getByLabel('Move left or right',{exact:true}).inputValue())).toBeLessThan(50);
 await page.getByRole('button',{name:'Reset framing',exact:true}).click();await vertical.focus();await page.keyboard.press('End');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
 for(const width of [320,440,1280]){await page.setViewportSize({width,height:1000});const section=page.locator('.pt-photo-cropping');const controls=section.locator('.pt-photo-controls');expect((await controls.boundingBox())!.width).toBeGreaterThan((await section.boundingBox())!.width-5);await controls.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(controls).toHaveScreenshot('crop-actions-'+width+'-'+theme+'.png');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);}
 await page.getByRole('button',{name:'Save photo',exact:true}).click();await expect(page.getByText('Photo saved.',{exact:true})).toBeVisible();expect(uploaded).not.toBeNull();const encoded=uploaded!.toString('base64');const pixel=await page.evaluate(async b64=>{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d')!;ctx.drawImage(bitmap,0,0);return {width:bitmap.width,height:bitmap.height,pixel:[...ctx.getImageData(256,256,1,1).data]};},encoded);expect(pixel).toEqual({width:512,height:512,pixel:[0,0,255,255]});
});}
test('account shows connected sign-in emails privately including Apple relay',async({page})=>{
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player,csrfToken:'csrf',providers:{google:true,apple:true},connectedProviders:['google','apple'],connectedAccounts:[{provider:'google',email:'private-google@example.invalid'},{provider:'apple',email:'private-relay@privaterelay.appleid.com'}]}}));
 await page.goto('/account');await expect(page.getByText('private-google@example.invalid',{exact:true})).toBeVisible();await expect(page.getByText('private-relay@privaterelay.appleid.com',{exact:true})).toBeVisible();for(const width of [320,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);}
});

for(const width of [390,1440])test('photo upload failure preserves the crop for retry '+width,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player,csrfToken:'csrf',providers:{google:true},connectedProviders:['google']}}));
 let attempts=0;await page.route('**/api/media/player/**',r=>{if(r.request().method()==='PUT'){attempts++;expect(r.request().headers()['content-type']).toBe('image/png');expect(r.request().postDataBuffer()!.byteLength).toBeGreaterThan(0);return attempts===1?r.fulfill({status:502,contentType:'text/html',body:'<html>Gateway unavailable</html>'}):r.fulfill({json:{ok:true,url:'/api/media/player/demo-player?v=retry'}});}return r.fulfill({status:404});});
 await page.goto('/account');await page.locator('input[type=file]').setInputFiles({name:'phone.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=','base64')});await expect(page.getByRole('img',{name:'Circular avatar preview'})).toBeVisible();await page.getByRole('button',{name:'Save photo',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Your photo could not be saved. Please try again.'})).toBeVisible();await expect(page.getByText('Unsaved preview')).toBeVisible();await expect(page.getByText('Photo saved.',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Save photo',exact:true}).click();await expect(page.getByText('Photo saved.',{exact:true})).toBeVisible();expect(attempts).toBe(2);
});

test('binary photo upload preserves the mobile crop pixels',async({page})=>{
 await page.setViewportSize({width:390,height:1000});await page.route('**/api/auth/me',r=>r.fulfill({json:{player,csrfToken:'csrf',providers:{google:true},connectedProviders:['google']}}));let uploaded:Buffer|null=null;
 await page.route('**/api/media/player/**',r=>{if(r.request().method()==='PUT'){uploaded=r.request().postDataBuffer();return r.fulfill({json:{ok:true,url:'/api/media/player/demo-player?v=bytes'}});}return r.fulfill({status:404});});
 await page.goto('/account');const source=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=200;const x=c.getContext('2d')!;x.fillStyle='red';x.fillRect(0,0,100,100);x.fillStyle='blue';x.fillRect(0,100,100,100);return c.toDataURL('image/png').split(',')[1];});await page.locator('input[type=file]').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(source,'base64')});const vertical=page.getByLabel('Move up or down',{exact:true});await expect(vertical).toBeEnabled();await vertical.focus();await page.keyboard.press('End');await page.getByRole('button',{name:'Save photo',exact:true}).click();await expect(page.getByText('Photo saved.',{exact:true})).toBeVisible();expect(uploaded).not.toBeNull();const pixel=await page.evaluate(async b64=>{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d')!;ctx.drawImage(bitmap,0,0);return {width:bitmap.width,height:bitmap.height,pixel:[...ctx.getImageData(256,256,1,1).data]};},uploaded!.toString('base64'));expect(pixel).toEqual({width:512,height:512,pixel:[0,0,255,255]});
});

test('large phone photos are bounded before upload and cropped before sending',async({page})=>{
 await page.setViewportSize({width:390,height:1000});await page.route('**/api/auth/me',r=>r.fulfill({json:{player,csrfToken:'csrf',providers:{google:true},connectedProviders:['google']}}));let uploads=0,bytes=0;
 await page.route('**/api/media/player/**',r=>{if(r.request().method()==='PUT'){uploads++;bytes=r.request().postDataBuffer()!.byteLength;return r.fulfill({json:{ok:true,url:'/api/media/player/demo-player?v=large'}});}return r.fulfill({status:404});});await page.goto('/account');const picker=page.locator('input[type=file]');
 await picker.setInputFiles({name:'too-large.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024+1)});await expect(page.getByRole('alert').filter({hasText:'Choose a JPEG, PNG or WebP smaller than 5 MB.'})).toBeVisible();await expect(page.getByRole('button',{name:'Save photo',exact:true})).toHaveCount(0);expect(uploads).toBe(0);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=','base64');const padded=Buffer.concat([png,Buffer.alloc(5*1024*1024-png.length)]);await picker.setInputFiles({name:'at-limit.png',mimeType:'image/png',buffer:padded});await expect(page.getByRole('img',{name:'Circular avatar preview'})).toBeVisible();await page.getByRole('button',{name:'Save photo',exact:true}).click();await expect(page.getByText('Photo saved.',{exact:true})).toBeVisible();expect(uploads).toBe(1);expect(bytes).toBeGreaterThan(0);expect(bytes).toBeLessThan(1024*1024);
});

for(const theme of ['light','dark'] as const)test('touch upload never activates the replacement remove action '+theme,async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:1000},hasTouch:true,isMobile:true,colorScheme:theme});const page=await context.newPage();const methods:string[]=[];
 await page.route('**/api/auth/me',r=>r.fulfill({json:{player,csrfToken:'csrf',providers:{google:true},connectedProviders:['google']}}));
 await page.route('**/api/media/player/**',r=>{const method=r.request().method();if(['PUT','DELETE'].includes(method)){methods.push(method);return r.fulfill({json:{ok:true,url:method==='DELETE'?null:'/api/media/player/demo-player?v=touch'}});}return r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=','base64')});});
 await page.goto('/account');const photo=page.getByRole('region',{name:'Player photo',exact:true});const remove=photo.getByRole('button',{name:'Remove photo',exact:true});await expect(remove).toBeVisible();const original=await remove.elementHandle();const chooser=page.waitForEvent('filechooser');await photo.getByRole('button',{name:'Add or change player photo',exact:true}).tap();await(await chooser).setFiles({name:'touch.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=','base64')});await expect(remove).toHaveCount(0);await expect(page.getByRole('img',{name:'Circular avatar preview'})).toBeVisible();const save=photo.getByRole('button',{name:'Save photo',exact:true});const saveNode=await save.elementHandle();await save.tap();await expect(photo.getByText('Photo saved.',{exact:true})).toBeVisible();await expect(remove).toBeVisible();expect(methods).toEqual(['PUT']);expect(await original!.evaluate(el=>el.isConnected)).toBe(false);expect(await saveNode!.evaluate(el=>el.isConnected)).toBe(false);expect(await remove.evaluate(el=>el===document.activeElement)).toBe(false);expect(await remove.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');await page.keyboard.press('Tab');await remove.focus();await expect(remove).toBeFocused();await expect(remove).toHaveCSS('outline-style','solid');await context.close();
});
