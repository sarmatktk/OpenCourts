import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {communityRoutes,communityHtml} from '../scripts/community-metadata.mjs';

it('emits distinct route metadata without inheriting the court finder canonical or schema',()=>{
 const shell=readFileSync('index.html','utf8');
 for(const [path,[title,description,indexable]] of Object.entries(communityRoutes)){
  const html=communityHtml(shell,path);expect(html).toContain(`<title>${title.replaceAll('&','&amp;')}</title>`);
  expect(html).toContain(`rel="canonical" href="https://opencourts.us${path}"`);
  expect(html).toContain(`property="og:url" content="https://opencourts.us${path}"`);
  expect(html).toContain(description);expect(html).toContain(`content="${indexable?'index,follow':'noindex,follow'}"`);
  expect(html).not.toContain('application/ld+json');expect(html.match(/rel="canonical"/g)).toHaveLength(1);
 }
});
it('includes only public community entry pages in the sitemap',()=>{
 const sitemap=readFileSync('public/sitemap.xml','utf8');
 for(const path of ['/play-together','/play-together/groups','/play-together-help'])expect(sitemap).toContain(`<loc>https://opencourts.us${path}</loc>`);
 for(const [path,[,,indexable]] of Object.entries(communityRoutes))if(!indexable)expect(sitemap).not.toContain(`<loc>https://opencourts.us${path}</loc>`);
 for(const [,url] of sitemap.matchAll(/<loc>(.*?)<\/loc>/g))expect(url).not.toMatch(/pages\.dev|\?|#/);
});
it('removes staging copy from customer-facing pages without dropping privacy disclosures',()=>{
 for(const file of ['privacy','about','contact','support','play-together-help']){
  const html=readFileSync('public/'+file+'.html','utf8');expect(html).not.toMatch(/separate test environment|test feedback|first-release|development or testing environments/i);
 }
 const privacy=readFileSync('public/privacy.html','utf8');expect(privacy).toContain('Google Analytics');expect(privacy).toContain('account deletion');expect(privacy).toContain('support@opencourts.us');
});
