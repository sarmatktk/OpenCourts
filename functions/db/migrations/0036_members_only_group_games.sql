-- Group visibility controls the group preview only. Every group game requires approved membership.
DROP TRIGGER group_game_participant_access;
CREATE TRIGGER group_game_participant_access BEFORE INSERT ON game_participants
WHEN EXISTS(SELECT 1 FROM games WHERE id=NEW.game_id AND visibility='group') AND NOT EXISTS(SELECT 1 FROM games g JOIN tennis_groups t ON t.id=g.group_id JOIN group_memberships m ON m.group_id=t.id JOIN players p ON p.id=m.player_id WHERE g.id=NEW.game_id AND t.status='active' AND m.player_id=NEW.player_id AND m.status='active' AND p.status='active')
BEGIN SELECT RAISE(ABORT,'group membership required'); END;

DROP TRIGGER notify_group_request_insert;
DROP TRIGGER notify_group_membership_status;
CREATE TRIGGER notify_group_request_insert AFTER INSERT ON group_memberships
WHEN NEW.status='pending'
BEGIN
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),NEW.group_id,m.player_id,NEW.player_id,'group_requested',NEW.updated_at FROM group_memberships m JOIN tennis_groups g ON g.id=m.group_id WHERE m.group_id=NEW.group_id AND m.status='active' AND (COALESCE(m.assigned_role,m.role) IN ('admin','coowner','organizer') OR g.owner_id=m.player_id);
END;
CREATE TRIGGER notify_group_membership_status AFTER UPDATE OF status ON group_memberships
WHEN NEW.status!=OLD.status
BEGIN
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),NEW.group_id,m.player_id,NEW.player_id,'group_requested',NEW.updated_at FROM group_memberships m JOIN tennis_groups g ON g.id=m.group_id WHERE m.group_id=NEW.group_id AND NEW.status='pending' AND m.status='active' AND (COALESCE(m.assigned_role,m.role) IN ('admin','coowner','organizer') OR g.owner_id=m.player_id);
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),g.id,NEW.player_id,g.owner_id,'group_'||NEW.status,NEW.updated_at FROM tennis_groups g WHERE g.id=NEW.group_id AND NEW.status IN ('active','rejected','removed') AND NEW.player_id!=g.owner_id;
END;
