import {mkdir,writeFile,access} from 'node:fs/promises';
import {generateVapidKeys} from '@mmmike/web-push/vapid';
// Local-only. Never upload these keys to Git, logs, a browser bundle, or a production environment.
const output=new URL('../.wrangler/push-dev-secrets.json',import.meta.url);
try{await access(output);throw new Error('Development push keys already exist; refusing to rotate them.');}
catch(e){if(e.code!=='ENOENT')throw e;}
const pair=await generateVapidKeys();
await mkdir(new URL('../.wrangler/',import.meta.url),{recursive:true});
await writeFile(output,JSON.stringify({PUSH_VAPID_PUBLIC_KEY:pair.publicKey,PUSH_VAPID_PRIVATE_KEY:pair.privateKey},null,2)+'\n',{flag:'wx'});
await writeFile(new URL('../.wrangler/push-worker-secrets.json',import.meta.url),JSON.stringify({PUSH_VAPID_PRIVATE_KEY:pair.privateKey})+'\n',{flag:'wx'});
console.log('Created development VAPID keys in ignored .wrangler/push-dev-secrets.json. No keys printed or resources created.');
