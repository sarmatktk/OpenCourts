CREATE TABLE game_host_notifications_v2 (
 id TEXT PRIMARY KEY,
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 host_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('requested','withdrawn','cancelled')),
 reason TEXT NOT NULL DEFAULT '' CHECK(length(reason)<=500),
 places_released INTEGER NOT NULL CHECK(places_released>=0),
 created_at INTEGER NOT NULL,
 read_at INTEGER
);
INSERT INTO game_host_notifications_v2 SELECT * FROM game_host_notifications;
DROP TABLE game_host_notifications;
ALTER TABLE game_host_notifications_v2 RENAME TO game_host_notifications;
CREATE INDEX game_host_notifications_inbox ON game_host_notifications(host_id,created_at DESC);
-- Notify once when a new pending request is actually inserted, including retries.
CREATE TRIGGER notify_host_on_game_request AFTER INSERT ON game_join_requests
WHEN NEW.status='pending' AND EXISTS(SELECT 1 FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility='public')
BEGIN
 INSERT INTO game_host_notifications(id,game_id,host_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),id,organizer_id,NEW.player_id,'requested','',0,NEW.created_at FROM games WHERE id=NEW.game_id;
END;
