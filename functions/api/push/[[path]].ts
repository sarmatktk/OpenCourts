import {handlePush,type PushEnv} from '../../lib/push';
export const onRequest:PagesFunction<PushEnv>=({request,env})=>handlePush(request,env);
