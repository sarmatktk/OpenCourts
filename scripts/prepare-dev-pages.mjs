import { copyFile, mkdir } from 'node:fs/promises';
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
