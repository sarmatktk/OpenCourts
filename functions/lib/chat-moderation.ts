import {AuthError,checkOrigin,checkCsrf,json,readJson,type AuthDatabase,type Session} from './auth';
const DAY=86400000;
export async function chatReportQueue(db:AuthDatabase){return (await db.prepare("SELECT 'chat:'||r.id AS id,'message' AS subjectType,r.message_id AS subjectId,r.author_id AS reportedPlayerId,COALESCE(p.display_name,'Deleted player') AS subjectName,p.status AS playerStatus,r.category,r.details,r.created_at AS createdAt FROM game_chat_reports r LEFT JOIN players p ON p.id=r.author_id WHERE r.status='open' ORDER BY r.created_at LIMIT 100").all<Record<string,unknown>>()).results;}
export async function chatModeration(request:Request,db:AuthDatabase,origin:string,actor:Session,path:string):Promise<Response|null>{
 if(!path.startsWith('chat-'))return null;const now=Date.now();
 if(request.method==='GET'){
  if(path==='chat-health'){const row=await db.prepare("SELECT value FROM notification_worker_state WHERE name='chat_cleanup_last_at'").first<{value:string}>();return json({lastCleanupAt:row?Number(row.value):null});}
  if(path==='chat-cases')return json({cases:(await db.prepare("SELECT id,status,category,created_at AS createdAt,resolved_at AS resolvedAt,legal_hold AS held,hold_review_at AS reviewAt FROM game_chat_reports WHERE status='open' OR legal_hold=1 OR resolved_at>? ORDER BY legal_hold DESC,created_at DESC LIMIT 100").bind(now-90*DAY).all()).results});
  if(path==='chat-evidence'){
   const q=new URL(request.url).searchParams,id=q.get('reportId')?.replace(/^chat:/,'');
   const r=await db.prepare("SELECT * FROM game_chat_reports WHERE id=? AND (status='open' OR legal_hold=1 OR resolved_at>?)").bind(id??'',now-90*DAY).first<{id:string;game_id:string;context_json:string;legal_hold:number;resolved_at:number|null;hold_review_at:number|null;status:string}>();if(!r)throw new AuthError(404,'Evidence unavailable or expired.');
   let messages=JSON.parse(r.context_json);
   if(q.get('scope')==='conversation'){
    if(!r.legal_hold)throw new AuthError(403,'A documented preservation hold is required.');const before=Number(q.get('before')??Number.MAX_SAFE_INTEGER);if(!Number.isSafeInteger(before)||before<1)throw new AuthError(400,'Invalid cursor.');
    messages=(await db.prepare("SELECT m.seq,m.body,m.created_at AS createdAt,COALESCE(p.display_name,'Deleted player') AS displayName,m.hidden_at AS hiddenAt FROM game_chat_messages m LEFT JOIN players p ON p.id=m.author_id JOIN game_chat_rooms cr ON cr.game_id=m.game_id WHERE m.game_id=? AND cr.legal_hold=1 AND m.seq<? ORDER BY m.seq DESC LIMIT 50").bind(r.game_id,before).all()).results.reverse();
   }
   return json({messages,held:!!r.legal_hold,reviewAt:r.hold_review_at,status:r.status,expiresAt:r.resolved_at?r.resolved_at+90*DAY:null,actions:(await db.prepare('SELECT action,reason,created_at AS createdAt FROM game_chat_report_actions WHERE report_id=? ORDER BY created_at DESC LIMIT 50').bind(r.id).all()).results});
  }
 }
 if(request.method!=='POST'||!['chat-review','chat-hold','chat-hide'].includes(path))throw new AuthError(404,'Not found.');
 checkOrigin(request,origin);checkCsrf(request,actor);const body=await readJson(request,4096),id=typeof body.id==='string'?body.id.replace(/^chat:/,''):'';
 const reason=path==='chat-review'?'Report resolved':body.reason;if(typeof reason!=='string'||!reason.trim()||reason.length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(reason))throw new AuthError(400,'Record a reason of up to 500 characters.');
 if(path==='chat-hold'&&typeof body.held!=='boolean')throw new AuthError(400,'Choose a preservation action.');
 const report=await db.prepare("SELECT game_id,message_id FROM game_chat_reports WHERE id=? AND (status='open' OR legal_hold=1 OR resolved_at>?)").bind(id,now-90*DAY).first<{game_id:string;message_id:string}>();if(!report)throw new AuthError(404,'Report unavailable or expired.');
 const audit=crypto.randomUUID(),action=path==='chat-review'?'resolved':path==='chat-hide'?'hidden':body.held?'hold':'release';
 const statements=[db.prepare("INSERT INTO game_chat_report_actions(id,report_id,moderator_id,action,reason,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_sessions s JOIN players p ON p.id=s.player_id WHERE s.token_hash=? AND s.player_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND p.status='active')").bind(audit,id,actor.id,action,reason.trim(),now,actor.token_hash,actor.id,now)];
 const authorized='EXISTS(SELECT 1 FROM game_chat_report_actions WHERE id=?)';
 if(path==='chat-review')statements.push(db.prepare(`UPDATE game_chat_reports SET status='resolved',resolved_at=COALESCE(resolved_at,?) WHERE id=? AND ${authorized}`).bind(now,id,audit));
 if(path==='chat-hide')statements.push(db.prepare(`UPDATE game_chat_messages SET hidden_at=? WHERE id=? AND ${authorized}`).bind(now,report.message_id,audit));
 if(path==='chat-hold'){
  statements.push(db.prepare(`UPDATE game_chat_reports SET legal_hold=?,hold_review_at=? WHERE id=? AND ${authorized}`).bind(body.held?1:0,body.held?now+30*DAY:null,id,audit));
  statements.push(db.prepare(`UPDATE game_chat_rooms SET legal_hold=EXISTS(SELECT 1 FROM game_chat_reports WHERE game_id=? AND legal_hold=1) WHERE game_id=? AND ${authorized}`).bind(report.game_id,report.game_id,audit));
 }
 await db.batch(statements);if(!await db.prepare('SELECT id FROM game_chat_report_actions WHERE id=?').bind(audit).first())throw new AuthError(409,'Moderator access changed.');return json({ok:true});
}
