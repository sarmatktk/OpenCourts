import type {AuthDatabase} from './auth';
export interface MediaCleanupBucket {delete(key:string):Promise<unknown>}
/** Retry queued, unreferenced objects without waiting for another user upload. */
export async function cleanupMedia(db:AuthDatabase,bucket:MediaCleanupBucket){
 const rows=(await db.prepare('SELECT object_key FROM media_cleanup WHERE NOT EXISTS (SELECT 1 FROM media_assets WHERE media_assets.object_key=media_cleanup.object_key) ORDER BY queued_at LIMIT 100').all<{object_key:string}>()).results;
 let removed=0,failed=0;
 for(const row of rows){try{await bucket.delete(row.object_key);await db.prepare('DELETE FROM media_cleanup WHERE object_key=?').bind(row.object_key).run();removed++;}catch{failed++;}}
 return {removed,failed};
}
