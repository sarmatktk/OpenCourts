import {handleMedia,type MediaEnv} from '../../lib/media';
export const onRequest:PagesFunction<MediaEnv>=({request,env})=>handleMedia(request,env);
