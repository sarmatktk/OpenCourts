import {discussionModeration} from './group-discussions';
import {chatModeration} from './chat-moderation';
import {AuthError,checkOrigin,checkCsrf,json,readJson,type AuthDatabase,type Session} from './auth';
export async function moderation(request:Request,db:AuthDatabase,origin:string,actor:Session,path:string,staff:string[]){
 if(!staff.includes(actor.id))throw new AuthError(403,'Site moderator access required.');
 const discussion=await discussionModeration(request,db,origin,actor,path);if(discussion)return discussion;
 const chat=await chatModeration(request,db,origin,actor,path);if(chat)return chat;
 if(request.method==='GET'){
  if(path==='accounts'){
   const query=new URL(request.url).searchParams.get('q')?.trim()??'';
   if(query.length>100)throw new AuthError(400,'Search up to 100 characters.');
   const players=(await db.prepare("SELECT id,display_name AS displayName,status FROM players WHERE (?='' AND status='disabled') OR (?!='' AND (id=? OR instr(lower(display_name),lower(?))>0)) ORDER BY updated_at DESC,id LIMIT 100").bind(query,query,query,query).all()).results;
   return json({players});
  }
  if(path==='history')return json({actions:(await db.prepare("SELECT a.id,a.player_id AS playerId,COALESCE(p.display_name,'Deleted account') AS displayName,a.moderator_id AS moderatorId,COALESCE(m.display_name,'Former moderator') AS moderatorName,a.action,a.reason,a.created_at AS createdAt FROM account_moderation_actions a LEFT JOIN players p ON p.id=a.player_id LEFT JOIN players m ON m.id=a.moderator_id ORDER BY a.created_at DESC,a.id LIMIT 100").all()).results});
 }
 if(request.method!=='POST'||!['suspend','restore'].includes(path))throw new AuthError(404,'Not found.');
 checkOrigin(request,origin);checkCsrf(request,actor);const body=await readJson(request,4096);
 if(typeof body.playerId!=='string'||!body.playerId||body.playerId.length>100||body.playerId===actor.id)throw new AuthError(400,'Choose another account.');
 if(path==='suspend'&&staff.includes(body.playerId))throw new AuthError(403,'A site moderator cannot be suspended. Remove their moderator access first.');
 if(typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.reason))throw new AuthError(400,'Explain this decision in up to 500 characters.');
 const before=path==='suspend'?'active':'disabled',after=path==='suspend'?'disabled':'active',now=Date.now(),id=crypto.randomUUID();
 await db.batch([
  db.prepare("INSERT INTO account_moderation_actions(id,player_id,moderator_id,action,reason,created_at) SELECT ?,p.id,?,?,?,? FROM players p WHERE p.id=? AND p.status=? AND EXISTS(SELECT 1 FROM auth_sessions s JOIN players m ON m.id=s.player_id WHERE s.token_hash=? AND s.player_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND m.status='active')").bind(id,actor.id,path,body.reason.trim(),now,body.playerId,before,actor.token_hash,actor.id,now),
  db.prepare('UPDATE players SET status=?,updated_at=? WHERE id=? AND status=? AND EXISTS(SELECT 1 FROM account_moderation_actions WHERE id=?)').bind(after,now,body.playerId,before,id)
 ]);
 if(!await db.prepare('SELECT id FROM account_moderation_actions WHERE id=?').bind(id).first())throw new AuthError(409,'Account or permissions changed. Refresh and try again.');
 return json({ok:true,status:after});
}
