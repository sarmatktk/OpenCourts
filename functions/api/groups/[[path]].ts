import {handleGroups} from '../../lib/groups';
import type {AuthEnv} from '../../lib/auth';
export const onRequest: PagesFunction<AuthEnv> = ({request,env})=>handleGroups(request,env);
