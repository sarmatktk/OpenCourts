CREATE TABLE game_waitlist(
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 status TEXT NOT NULL CHECK(status IN ('waiting','offered','expired')),
 created_at INTEGER NOT NULL,offered_at INTEGER,offer_expires_at INTEGER,read_at INTEGER,
 PRIMARY KEY(game_id,player_id));
CREATE INDEX waitlist_queue ON game_waitlist(game_id,status,created_at,player_id);
CREATE TRIGGER waitlist_reserved_insert BEFORE INSERT ON game_participants
WHEN (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=NEW.game_id)+1+NEW.guest_count+(SELECT COUNT(*) FROM game_waitlist WHERE game_id=NEW.game_id AND status='offered' AND player_id!=NEW.player_id AND offer_expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER))>(SELECT COALESCE(event_capacity,capacity) FROM games WHERE id=NEW.game_id)
BEGIN SELECT RAISE(ABORT,'game capacity reserved for waitlist'); END;
CREATE TRIGGER waitlist_reserved_guest_update BEFORE UPDATE OF guest_count,game_id ON game_participants
WHEN (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=NEW.game_id AND NOT(game_id=OLD.game_id AND player_id=OLD.player_id))+1+NEW.guest_count+(SELECT COUNT(*) FROM game_waitlist WHERE game_id=NEW.game_id AND status='offered' AND player_id!=NEW.player_id AND offer_expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER))>(SELECT COALESCE(event_capacity,capacity) FROM games WHERE id=NEW.game_id)
BEGIN SELECT RAISE(ABORT,'game capacity reserved for waitlist'); END;
