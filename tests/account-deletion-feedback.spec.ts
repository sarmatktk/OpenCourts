import {test,expect} from '@playwright/test';
for(const colorScheme of ['light','dark'] as const)for(const width of [320,390,1440]){
 test(`deletion errors remain by the controls ${width} ${colorScheme}`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
  let attempts=0;
  await page.route('**/api/**',r=>{
   if(new URL(r.request().url()).pathname==='/api/auth/me'){
    if(r.request().method()==='DELETE'){attempts++;return r.fulfill({status:409,json:{error:attempts===1?'Archive your active groups before deleting your account.':'For your security, sign out and sign back in, then try deleting your account again.'}});}
    return r.fulfill({json:{player:{id:'test-player',displayName:'Sam',bio:'',generalLocation:'',skillLevel:'unspecified',discoverable:false},csrfToken:'csrf',providers:{google:true,apple:true},connectedProviders:['google']}});
   }
   return r.fulfill({json:{notifications:[]}});
  });
  await page.goto('/account');await page.getByRole('button',{name:'Delete my account',exact:true}).click();await page.getByLabel('Type DELETE to confirm').fill('DELETE');await page.getByRole('button',{name:'Permanently delete',exact:true}).click();
  const error=page.locator('.pt-delete [role=alert]');await expect(error).toHaveText('Archive your active groups before deleting your account.Manage my groups');await expect(error).toBeFocused();await expect(error).toBeInViewport();const recovery=error.getByRole('link',{name:'Manage my groups'});await expect(recovery).toHaveClass('pt-secondary');expect((await recovery.boundingBox())!.y).toBeGreaterThan((await error.locator(':scope > div').first().boundingBox())!.y+(await error.locator(':scope > div').first().boundingBox())!.height);await expect(recovery).toHaveAttribute('href','/play-together/my-groups');await expect(page.locator('main > [role=alert]')).toHaveCount(0);
  await page.getByRole('button',{name:'Permanently delete',exact:true}).click();await expect(error).toHaveText('For your security, sign out and sign back in, then try deleting your account again.');await expect(error).toBeInViewport();await expect(error.getByRole('link')).toHaveCount(0);
  await page.getByRole('button',{name:'Keep my account'}).click();await expect(error).toHaveCount(0);await page.getByRole('button',{name:'Delete my account',exact:true}).click();await expect(page.locator('.pt-delete [role=alert]')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 });
}
