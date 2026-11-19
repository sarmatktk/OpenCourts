-- Additive migration: retain per-match capacity for compatibility with existing rows.
-- event_capacity is total attendance; NULL preserves the original 2/4-player event.
ALTER TABLE games ADD COLUMN court_count INTEGER NOT NULL DEFAULT 1 CHECK(typeof(court_count)='integer' AND court_count BETWEEN 1 AND 16);
ALTER TABLE games ADD COLUMN event_capacity INTEGER CHECK(event_capacity IS NULL OR (typeof(event_capacity)='integer' AND event_capacity BETWEEN 2 AND 128));
CREATE TRIGGER game_event_size_insert BEFORE INSERT ON games
WHEN COALESCE(NEW.event_capacity,NEW.capacity)<NEW.court_count*NEW.capacity
BEGIN SELECT RAISE(ABORT,'capacity below planned court places'); END;
CREATE TRIGGER game_event_size_update BEFORE UPDATE OF event_capacity,capacity,court_count,format ON games
WHEN COALESCE(NEW.event_capacity,NEW.capacity)<NEW.court_count*NEW.capacity
BEGIN SELECT RAISE(ABORT,'capacity below planned court places'); END;
DROP TRIGGER game_capacity_insert;
DROP TRIGGER game_capacity_update;
DROP TRIGGER game_capacity_move;
CREATE TRIGGER game_capacity_insert BEFORE INSERT ON game_participants
WHEN (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=NEW.game_id)+1+NEW.guest_count>(SELECT COALESCE(event_capacity,capacity) FROM games WHERE id=NEW.game_id)
BEGIN SELECT RAISE(ABORT,'game capacity exceeded'); END;
CREATE TRIGGER game_capacity_update BEFORE UPDATE OF capacity,event_capacity ON games
WHEN COALESCE(NEW.event_capacity,NEW.capacity)<(SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=NEW.id)
BEGIN SELECT RAISE(ABORT,'capacity below participant count'); END;
CREATE TRIGGER game_capacity_move BEFORE UPDATE OF game_id,guest_count ON game_participants
WHEN (SELECT COALESCE(SUM(1+guest_count),0) FROM game_participants WHERE game_id=NEW.game_id AND NOT(game_id=OLD.game_id AND player_id=OLD.player_id))+1+NEW.guest_count>(SELECT COALESCE(event_capacity,capacity) FROM games WHERE id=NEW.game_id)
BEGIN SELECT RAISE(ABORT,'game capacity exceeded'); END;
