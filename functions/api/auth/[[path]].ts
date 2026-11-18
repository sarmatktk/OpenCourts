import { handleAuth, type AuthEnv } from '../../lib/auth';

export const onRequest: PagesFunction<AuthEnv> = ({ request, env }) => handleAuth(request, env);
