import type {AuthDatabase} from './auth';
export type GroupGameAccess={canView:boolean;canCreate:boolean;canManage:boolean;canJoin:boolean};
/** Always resolve current approved membership; legacy Admin does not imply event authority. */
export async function groupGameAccess(db:AuthDatabase,groupId:string,playerId:string|null,organizerId?:string):Promise<GroupGameAccess>{
 const publicGroup=!!await db.prepare("SELECT 1 FROM tennis_groups WHERE id=? AND status='active' AND visibility='public'").bind(groupId).first();
 const denied={canView:publicGroup,canCreate:false,canManage:false,canJoin:false};if(!playerId)return denied;
 const row=await db.prepare(`SELECT g.owner_id,COALESCE(m.assigned_role,m.role) AS role FROM tennis_groups g JOIN group_memberships m ON m.group_id=g.id JOIN players p ON p.id=m.player_id WHERE g.id=? AND g.status='active' AND m.player_id=? AND m.status='active' AND p.status='active'`).bind(groupId,playerId).first<{owner_id:string;role:string}>();if(!row)return denied;
 const owner=row.owner_id===playerId,coowner=row.role==='coowner',organizer=row.role==='organizer';return {canView:true,canCreate:owner||coowner||organizer,canManage:owner||coowner||(organizer&&organizerId===playerId),canJoin:true};
}

/** Source-controlled SQL expressions only; never interpolate request input. */
export function groupEventViewSql(game:string,actor:string){return `EXISTS(SELECT 1 FROM tennis_groups vt WHERE vt.id=${game}.group_id AND vt.status='active' AND (vt.visibility='public' OR EXISTS(SELECT 1 FROM group_memberships vm WHERE vm.group_id=vt.id AND vm.player_id=${actor} AND vm.status='active')))`;}
