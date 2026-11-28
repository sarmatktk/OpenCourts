import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {communityRoutes,communityHtml} from './community-metadata.mjs';

// Build artifact only: does not deploy, access credentials or enable production APIs.
const outputName=process.argv[2]??'dist-release';
if(!['dist','dist-release','dist-frontend'].includes(outputName))throw new Error('Unexpected production artifact directory.');
const output=new URL('../'+outputName+'/',import.meta.url);
const shell=await readFile(new URL('index.html',output),'utf8');
const associations=JSON.parse(await readFile(new URL('.well-known/assetlinks.json',output),'utf8'));
if(associations.some(item=>item.target?.package_name==='us.opencourts.app.dev'))throw new Error('Refusing a production artifact with the debug package association.');
const headers=await readFile(new URL('_headers',output),'utf8');
if(/X-Robots-Tag:\s*noindex/i.test(headers))throw new Error('Refusing Preview noindex headers in the production candidate.');
await mkdir(new URL('play-together/',output),{recursive:true});
for(const path of Object.keys(communityRoutes))await writeFile(new URL(path.slice(1)+'.html',output),communityHtml(shell,path));
await writeFile(new URL('play-together/index.html',output),communityHtml(shell,'/play-together'));
console.log('Prepared production route/SEO candidate in '+outputName+'. Production APIs remain guarded; this is not a deployment or release approval.');

for(const path of ['/privacy','/terms','/delete-account']){
 const html=await readFile(new URL(path.slice(1)+'.html',output),'utf8');
 if(!html.includes('rel="canonical" href="https://opencourts.us'+path+'"')||!html.includes('Big Data Analytica LLC'))throw new Error('Missing production policy identity/canonical: '+path);
}
const assets=await readdir(new URL('assets/',output));
if(!assets.some(file=>/^maplibre-gl-worker-.*\.js$/.test(file)))throw new Error('Missing bundled map worker in production artifact.');
console.log('Verified policy/deletion pages, operator identity and bundled map worker.');
