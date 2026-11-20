import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {it,expect} from 'vitest';
import {communityHtml,communityRoutes} from '../scripts/community-metadata.mjs';
const script=readFileSync('public/site-analytics.js','utf8');
function run(pathname='/play-together/game',hostname='opencourts.us'){
 const scripts:any[]=[];const window:any={};const context={window,location:{hostname,pathname,search:'?id=PRIVATE-GAME&email=private@example.com',hash:'#PRIVATE-INVITATION'},document:{title:'PRIVATE PLAYER NAME',createElement:()=>({}),head:{appendChild:(s:any)=>scripts.push(s)}}};
 runInNewContext(script,context);runInNewContext(script,context);
 return {window,scripts,commands:(window.dataLayer||[]).map((a:any)=>Array.from(a))};
}
it('records exactly one sanitized page view without IDs, names, queries, hashes or referrers',()=>{
 const {scripts,commands}=run();expect(scripts).toHaveLength(1);expect(scripts[0].referrerPolicy).toBe('no-referrer');
 expect(commands.filter((a:any)=>a[0]==='event'&&a[1]==='page_view')).toHaveLength(1);
 const config:any=commands.find((a:any)=>a[0]==='config')![2];expect(config).toMatchObject({page_location:'https://opencourts.us/play-together/game',page_title:'Game details | OpenCourts',page_referrer:'',send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
 expect(JSON.stringify(commands)).not.toMatch(/PRIVATE|private@example|\?|#/);
 for(const path of ['/account','/play-together/invitation','/play-together/game-invitation'])expect(run(path).scripts).toHaveLength(1);
 expect(JSON.stringify(run('/private-name-in-path').commands)).not.toContain('private-name-in-path');expect(JSON.stringify(run('/private-name-in-path').commands)).toContain('/404');
});
it('does not load production analytics on local or Preview hosts',()=>{
 for(const host of ['localhost','127.0.0.1','feature-play-together.opencourts.pages.dev'])expect(run('/',host).scripts).toHaveLength(0);
});
it('all public and generated community pages declare one analytics loader and valid shared icons',()=>{
 const pages=[['index',readFileSync('index.html','utf8')],...readdirSync('public').filter(f=>f.endsWith('.html')).map(f=>[f,readFileSync('public/'+f,'utf8')]),...Object.keys(communityRoutes).map(route=>[route,communityHtml(readFileSync('index.html','utf8'),route)])];
 for(const [name,html] of pages){expect(html.match(/src="\/site-analytics\.js"/g),name).toHaveLength(1);expect(html,name).not.toContain('googletagmanager.com');
  for(const file of ['favicon.ico','favicon.svg','apple-touch-icon.png','site.webmanifest']){expect(html,name).toContain('href="/'+file+'"');expect(existsSync('public/'+file)).toBe(true);}
  if(name!=='404.html'){expect(html,name).toContain('property="og:image"');expect(html,name).toContain('name="twitter:image"');}
 }
 const png=readFileSync('public/social-preview-v2.png');expect([png.readUInt32BE(16),png.readUInt32BE(20)]).toEqual([1200,630]);expect(png.length).toBeLessThan(1_000_000);
});
