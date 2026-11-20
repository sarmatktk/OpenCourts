import {test,expect} from '@playwright/test';
for(const width of [320,390,1440])for(const theme of ['light','dark'] as const)test(`sign-in recovery is a button ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});let status=401;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;
  if(p==='/api/auth/me')return r.fulfill({json:{player:null,csrfToken:null,providers:{google:true,apple:true},connectedProviders:[]}});
  if(p==='/api/players/blocks')return status===401?r.fulfill({status:401,json:{error:'Please sign in again.'}}):r.fulfill({json:{players:[],moderator:false}});
  if(p==='/api/players')return r.fulfill({status,json:status===200?{players:[],next:null}:{error:status===401?'Please sign in again.':'Search is temporarily unavailable.'}});
  return r.fulfill({status:401,json:{error:'Please sign in again.'}});
 });
 await page.goto('/play-together/players');const alert=page.getByRole('alert');await expect(alert).toHaveCount(1);await expect(alert).toContainText('An account is required to find players.');const link=alert.getByRole('link',{name:'Sign in',exact:true});await expect(link).toHaveClass(/pt-primary/);await expect(link).toHaveAttribute('href','/account');expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(await link.evaluate(e=>getComputedStyle(e).backgroundColor===getComputedStyle(e.parentElement!).backgroundColor)).toBe(false);
 await link.focus();await expect(link).toHaveCSS('outline-style','solid');await expect(page.getByText('Search could not be completed.',{exact:true})).toHaveCount(0);
 await page.addScriptTag({path:'.wrangler/qa-audit/axe.min.js'});expect(await alert.evaluate(async e=>(await (window as any).axe.run(e,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map((v:any)=>v.id))).toEqual([]);
 if((width===390&&theme==='light')||(width===320&&theme==='dark'))await alert.screenshot({path:`docs/qa-evidence/sign-in-recovery-${width}-${theme}.png`});await link.click();await expect(page).toHaveURL(/\/account$/);await expect(page.getByRole('button',{name:'Continue with Google',exact:true})).toBeVisible();
 status=503;await page.goto('/play-together/players');await expect(page.getByRole('alert')).toContainText('Search is temporarily unavailable.');await expect(page.getByRole('alert').getByRole('link',{name:'Sign in',exact:true})).toHaveCount(0);status=200;await page.getByRole('button',{name:'Retry search',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('.pt-search-status')).toHaveText('0 players found.');
 status=401;for(const path of ['/play-together/my-games','/play-together/groups','/play-together/feed']){await page.goto(path);const action=page.getByRole('alert').getByRole('link',{name:'Sign in',exact:true});await expect(action).toBeVisible();await expect(action).toHaveClass(/pt-primary/);expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);}
 expect(errors).toEqual([]);
});
