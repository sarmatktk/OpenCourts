import type {AuthDatabase,AuthStatement} from './auth';

// Context exists only inside the same atomic D1 batch as the mutation. It cannot
// leak into another request or survive a failed mutation/transaction rollback.
export async function notificationBatch(db:AuthDatabase,actorId:string,statements:AuthStatement[]){
 const results=await db.batch([
  db.prepare('INSERT INTO notification_action_context(id,actor_id) VALUES (1,?)').bind(actorId),
  ...statements,
  db.prepare('DELETE FROM notification_action_context WHERE id=1'),
 ]);
 return results.slice(1,-1);
}
export async function notificationRun(db:AuthDatabase,actorId:string,statement:AuthStatement){
 return (await notificationBatch(db,actorId,[statement]))[0] as {meta:{changes:number}};
}
