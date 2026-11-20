import {cleanupDiscussions} from './lib/group-discussions';
import {cleanupChat} from './lib/game-chat';
import {cleanupMedia} from './lib/media-cleanup';
import {productionCommunityEnabled} from './lib/auth';
import {drainPush} from './lib/push-delivery';
import type {PushEnv} from './lib/push';
export default {
 async scheduled(_event:unknown,env:PushEnv){const development=env.AUTH_ORIGIN==='https://feature-play-together.opencourts.pages.dev'&&env.PUSH_ENVIRONMENT==='development'&&env.PLAY_TOGETHER_ENVIRONMENT!=='production'&&env.CF_PAGES_BRANCH!=='main';if(!env.COURTS_DB||(!development&&!productionCommunityEnabled(env)))return;try{await drainPush(env.COURTS_DB,env);}finally{await cleanupChat(env.COURTS_DB);await cleanupDiscussions(env.COURTS_DB);if(env.PLAY_TOGETHER_MEDIA){const result=await cleanupMedia(env.COURTS_DB,env.PLAY_TOGETHER_MEDIA);if(result.failed)console.warn('Media cleanup retries pending',{failed:result.failed});}}},
 fetch(){return new Response('Not found',{status:404});},
};
