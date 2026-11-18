import {handlePlayers} from '../../lib/players';
import type {AuthEnv} from '../../lib/auth';
export const onRequest=({request,env}:{request:Request;env:AuthEnv&{MODERATOR_PLAYER_IDS?:string}})=>handlePlayers(request,env);
