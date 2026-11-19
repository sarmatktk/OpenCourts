import {groupEventViewSql} from './group-game-access';
import {myWaitlistedGames} from './game-waitlist';
import {AuthError,json,type AuthDatabase} from './auth';
import {unlistedAccessSql} from './game-sharing';
export async function myGames(request:Request,db:AuthDatabase,playerId:string){
 const params=new URL(request.url).searchParams,view=params.get('view')??'all';if(view==='waitlisted')return myWaitlistedGames(db,playerId);if(!['all','upcoming','requests','past','cancelled'].includes(view))throw new AuthError(400,'Choose a schedule view.');
 const ascending=view==='upcoming'||view==='requests',direction=ascending?'ASC':'DESC',comparison=ascending?'>':'<';let after:[number,string]|null=null;
 if(params.get('cursor')){try{const c=JSON.parse(atob(params.get('cursor')!));if(!Array.isArray(c)||c.length!==2||!Number.isSafeInteger(c[0])||c[0]<0||typeof c[1]!=='string'||!/^[0-9a-f-]{36}$/i.test(c[1]))throw Error();after=[c[0],c[1]];}catch{throw new AuthError(400,'Invalid schedule cursor.');}}
 const now=Date.now(),rows=(await db.prepare(`WITH viewer(id) AS (SELECT ?), own_games AS (
 SELECT g.id,g.title,g.starts_at,g.ends_at,g.time_zone,g.status,g.court_name,g.organizer_id=(SELECT id FROM viewer) AS isOrganizer,
 EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=g.id AND gp.player_id=(SELECT id FROM viewer)) AS joined,
 (SELECT status FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=(SELECT id FROM viewer)) AS request_status,
 EXISTS(SELECT 1 FROM game_cancellations c WHERE c.game_id=g.id AND c.player_id=(SELECT id FROM viewer)) AS left_game,
 EXISTS(SELECT 1 FROM game_notifications n WHERE n.game_id=g.id AND n.actor_id=(SELECT id FROM viewer) AND n.kind='withdrawn') AS withdrew
 FROM games g WHERE (g.visibility='public' OR (g.visibility='unlisted' AND ${unlistedAccessSql('g','(SELECT id FROM viewer)')}) OR (g.visibility='group' AND ${groupEventViewSql('g','(SELECT id FROM viewer)')}))
 AND (g.organizer_id=(SELECT id FROM viewer) OR EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=g.id AND gp.player_id=(SELECT id FROM viewer)) OR EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=(SELECT id FROM viewer)) OR EXISTS(SELECT 1 FROM game_cancellations c WHERE c.game_id=g.id AND c.player_id=(SELECT id FROM viewer)) OR EXISTS(SELECT 1 FROM game_notifications n WHERE n.game_id=g.id AND n.actor_id=(SELECT id FROM viewer) AND n.kind='withdrawn'))
 ), categorized AS (SELECT *,CASE WHEN status='cancelled' THEN 'cancelled' WHEN isOrganizer OR joined THEN CASE WHEN ends_at<=? THEN 'past' ELSE 'upcoming' END WHEN request_status='pending' AND starts_at>? THEN 'requests' ELSE 'cancelled' END AS section FROM own_games)
 SELECT * FROM categorized WHERE (?='all' OR section=?) ${after?`AND (starts_at${comparison}? OR (starts_at=? AND id${comparison}?))`:''} ORDER BY starts_at ${direction},id ${direction} LIMIT 51`).bind(playerId,now,now,view,view,...(after?[after[0],after[0],after[1]]:[])).all<Record<string,unknown>>()).results;
 const shown=rows.slice(0,50);return json({games:shown.map(g=>({...g,isOrganizer:!!g.isOrganizer})),nextCursor:rows.length>50?btoa(JSON.stringify([shown[49].starts_at,shown[49].id])):null});
}
