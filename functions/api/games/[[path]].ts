import { handleGames, type GamesEnv } from '../../lib/games';
export const onRequest: PagesFunction<GamesEnv> = ({request,env})=>handleGames(request,env);
