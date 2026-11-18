ALTER TABLE group_memberships ADD COLUMN assigned_role TEXT CHECK(assigned_role IN ('member','organizer','coowner'));
-- NULL preserves legacy Admin/Member permissions. No automatic promotions.

DROP TRIGGER notify_group_request_insert;
DROP TRIGGER notify_group_membership_status;
DROP TRIGGER notify_group_archival;
CREATE TRIGGER notify_group_request_insert AFTER INSERT ON group_memberships
WHEN NEW.status='pending'
BEGIN
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),NEW.group_id,m.player_id,NEW.player_id,'group_requested',NEW.updated_at FROM group_memberships m JOIN tennis_groups g ON g.id=m.group_id WHERE m.group_id=NEW.group_id AND m.status='active' AND (COALESCE(m.assigned_role,m.role) IN ('admin','coowner') OR g.owner_id=m.player_id);
END;
CREATE TRIGGER notify_group_membership_status AFTER UPDATE OF status ON group_memberships
WHEN NEW.status!=OLD.status
BEGIN
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),NEW.group_id,m.player_id,NEW.player_id,'group_requested',NEW.updated_at FROM group_memberships m JOIN tennis_groups g ON g.id=m.group_id WHERE m.group_id=NEW.group_id AND NEW.status='pending' AND m.status='active' AND (COALESCE(m.assigned_role,m.role) IN ('admin','coowner') OR g.owner_id=m.player_id);
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),g.id,NEW.player_id,g.owner_id,'group_'||NEW.status,NEW.updated_at FROM tennis_groups g WHERE g.id=NEW.group_id AND NEW.status IN ('active','rejected','removed') AND NEW.player_id!=g.owner_id;
END;
CREATE TRIGGER notify_group_archival AFTER UPDATE OF status ON tennis_groups
WHEN OLD.status='active' AND NEW.status='archived'
BEGIN
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),NEW.id,m.player_id,NEW.owner_id,'group_archived',NEW.updated_at FROM group_memberships m WHERE m.group_id=NEW.id AND m.status IN ('pending','active') AND m.player_id!=NEW.owner_id;
END;
