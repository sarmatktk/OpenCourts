import {drainAPNs} from './lib/apns-delivery';
import type {PushEnv} from './lib/push';

export default {
  async scheduled(_event: unknown, env: PushEnv) {
    if (!env.COURTS_DB) return;
    await drainAPNs(env.COURTS_DB, env);
  },
  fetch() {
    return new Response('Not found', {status: 404});
  },
};
