import {handleDiscussions} from '../../lib/group-discussions';
import type {AuthEnv} from '../../lib/auth';
export const onRequest:PagesFunction<AuthEnv>=({request,env})=>handleDiscussions(request,env);
