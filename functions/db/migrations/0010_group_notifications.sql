CREATE TABLE group_notifications (
 id TEXT PRIMARY KEY,
 group_id TEXT NOT NULL REFERENCES tennis_groups(id) ON DELETE CASCADE,
 recipient_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('group_requested','group_active','group_rejected','group_removed','group_archived')),
 created_at INTEGER NOT NULL,
 read_at INTEGER
);
CREATE INDEX group_notifications_recipient ON group_notifications(recipient_id,created_at DESC);
CREATE TRIGGER notify_group_request_insert AFTER INSERT ON group_memberships
WHEN NEW.status='pending'
BEGIN
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),NEW.group_id,m.player_id,NEW.player_id,'group_requested',NEW.updated_at FROM group_memberships m JOIN tennis_groups g ON g.id=m.group_id WHERE m.group_id=NEW.group_id AND m.status='active' AND (m.role='admin' OR g.owner_id=m.player_id);
END;
CREATE TRIGGER notify_group_membership_status AFTER UPDATE OF status ON group_memberships
WHEN NEW.status!=OLD.status
BEGIN
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),NEW.group_id,m.player_id,NEW.player_id,'group_requested',NEW.updated_at FROM group_memberships m JOIN tennis_groups g ON g.id=m.group_id WHERE m.group_id=NEW.group_id AND NEW.status='pending' AND m.status='active' AND (m.role='admin' OR g.owner_id=m.player_id);
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),g.id,NEW.player_id,g.owner_id,'group_'||NEW.status,NEW.updated_at FROM tennis_groups g WHERE g.id=NEW.group_id AND NEW.status IN ('active','rejected','removed') AND NEW.player_id!=g.owner_id;
END;
CREATE TRIGGER notify_group_archival AFTER UPDATE OF status ON tennis_groups
WHEN OLD.status='active' AND NEW.status='archived'
BEGIN
 INSERT INTO group_notifications(id,group_id,recipient_id,actor_id,kind,created_at)
 SELECT lower(hex(randomblob(16))),NEW.id,m.player_id,NEW.owner_id,'group_archived',NEW.updated_at FROM group_memberships m WHERE m.group_id=NEW.id AND m.status IN ('pending','active') AND m.player_id!=NEW.owner_id;
END;
