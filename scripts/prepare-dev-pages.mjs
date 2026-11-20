import {communityRoutes,communityHtml} from './community-metadata.mjs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Pages has a custom 404.html, so it does not use Vite's SPA fallback. Export only
// the approved development route without altering production redirects/settings.
const output = new URL('../dist/', import.meta.url);
await mkdir(output, { recursive: true });
await copyFile(new URL('index.html', output), new URL('play-together.html', output));
await copyFile(new URL('index.html', output), new URL('account.html', output));
await mkdir(new URL('play-together/', output), { recursive:true });
await copyFile(new URL('index.html', output), new URL('play-together/index.html', output));
await copyFile(new URL('index.html', output), new URL('play-together/create.html', output));
await copyFile(new URL('index.html', output), new URL('play-together/game.html', output));
console.log(`Prepared development account route in ${fileURLToPath(output)}`);

await copyFile(new URL('index.html', output), new URL('play-together/my-games.html', output));

for (const route of ['groups','my-groups','create-group','group']) await copyFile(new URL('index.html', output), new URL('play-together/'+route+'.html', output));

await copyFile(new URL('index.html', output), new URL('play-together/invitation.html', output));

await copyFile(new URL('index.html', output), new URL('play-together/feed.html', output));

for(const route of ['players','game-invitation'])await copyFile(new URL('index.html',output),new URL('play-together/'+route+'.html',output));

await copyFile(new URL('index.html',output),new URL('play-together/notifications.html',output));

await copyFile(new URL('index.html',output),new URL('play-together/manage-series.html',output));

// Associate only the separate development APK in development builds. Production assetlinks is untouched.
const assetLinksUrl=new URL('.well-known/assetlinks.json',output);
const links=JSON.parse(await readFile(assetLinksUrl,'utf8'));
links.push({relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:'us.opencourts.app.dev',sha256_cert_fingerprints:['DF:B6:C2:18:D7:52:E5:F0:3F:2E:AC:6B:A4:82:00:44:C7:E9:BC:EA:2D:00:5B:4D:E6:37:D8:11:FD:BF:06:DC']}});
await writeFile(assetLinksUrl,JSON.stringify(links,null,2)+'\n');

// Emit route-specific HTML before publishing; private activity routes stay noindex.
const shell=await readFile(new URL('index.html',output),'utf8');
for(const path of Object.keys(communityRoutes)){const target=path.slice(1)+'.html';await writeFile(new URL(target,output),communityHtml(shell,path));}
await writeFile(new URL('play-together/index.html',output),communityHtml(shell,'/play-together'));
// Feature Preview must never compete with production in search.
const headersUrl=new URL('_headers',output);await writeFile(headersUrl,(await readFile(headersUrl,'utf8'))+'\n/*\n  X-Robots-Tag: noindex, nofollow\n');
