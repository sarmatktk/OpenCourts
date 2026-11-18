-- A guest is a place sponsored by a confirmed player, not a private-group member.
ALTER TABLE game_participants ADD COLUMN guest_count INTEGER NOT NULL DEFAULT 0 CHECK(guest_count BETWEEN 0 AND 3);
CREATE TABLE game_guest_requests (
 game_id TEXT NOT NULL,
 player_id TEXT NOT NULL,
 guest_count INTEGER NOT NULL CHECK(guest_count BETWEEN 1 AND 3),
 status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','cancelled')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(game_id,player_id),
 FOREIGN KEY(game_id,player_id) REFERENCES game_participants(game_id,player_id) ON DELETE CASCADE
);
DROP TRIGGER game_capacity_insert;
DROP TRIGGER game_capacity_update;
DROP TRIGGER game_capacity_move;
CREATE TRIGGER game_capacity_insert BEFORE INSERT ON game_participants
WHEN (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=NEW.game_id)+1+NEW.guest_count>(SELECT capacity FROM games WHERE id=NEW.game_id)
BEGIN SELECT RAISE(ABORT,'game capacity exceeded'); END;
CREATE TRIGGER game_capacity_update BEFORE UPDATE OF capacity ON games
WHEN NEW.capacity<(SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=NEW.id)
BEGIN SELECT RAISE(ABORT,'capacity below participant count'); END;
CREATE TRIGGER game_capacity_move BEFORE UPDATE OF game_id,guest_count ON game_participants
WHEN (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=NEW.game_id AND NOT(game_id=OLD.game_id AND player_id=OLD.player_id))+1+NEW.guest_count>(SELECT capacity FROM games WHERE id=NEW.game_id)
BEGIN SELECT RAISE(ABORT,'game capacity exceeded'); END;
CREATE TABLE game_guest_notifications (
 id TEXT PRIMARY KEY,
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 recipient_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('guest_requested','guest_approved','guest_rejected','guest_cancelled')),
 guest_count INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 read_at INTEGER
);
CREATE INDEX guest_notification_recipient ON game_guest_notifications(recipient_id,created_at DESC);
CREATE TRIGGER guest_request_created AFTER INSERT ON game_guest_requests WHEN NEW.status='pending'
BEGIN INSERT INTO game_guest_notifications SELECT lower(hex(randomblob(16))),NEW.game_id,g.organizer_id,NEW.player_id,'guest_requested',NEW.guest_count,NEW.updated_at,NULL FROM games g WHERE g.id=NEW.game_id; END;
CREATE TRIGGER guest_request_changed AFTER UPDATE OF status ON game_guest_requests WHEN NEW.status!=OLD.status
BEGIN INSERT INTO game_guest_notifications SELECT lower(hex(randomblob(16))),NEW.game_id,CASE WHEN NEW.status='pending' OR NEW.status='cancelled' THEN g.organizer_id ELSE NEW.player_id END,CASE WHEN NEW.status='pending' OR NEW.status='cancelled' THEN NEW.player_id ELSE g.organizer_id END,CASE NEW.status WHEN 'pending' THEN 'guest_requested' WHEN 'approved' THEN 'guest_approved' WHEN 'rejected' THEN 'guest_rejected' ELSE 'guest_cancelled' END,NEW.guest_count,NEW.updated_at,NULL FROM games g WHERE g.id=NEW.game_id; END;
