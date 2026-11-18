-- General private inbox; preserve all existing host events.
DROP TRIGGER notify_host_on_game_request;
CREATE TABLE game_notifications (
 id TEXT PRIMARY KEY,
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 recipient_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('requested','withdrawn','cancelled','approved','rejected','removed','game_cancelled')),
 reason TEXT NOT NULL DEFAULT '' CHECK(length(reason)<=500),
 places_released INTEGER NOT NULL CHECK(places_released>=0),
 created_at INTEGER NOT NULL,
 read_at INTEGER
);
INSERT INTO game_notifications SELECT * FROM game_host_notifications;
DROP TABLE game_host_notifications;
CREATE INDEX game_notifications_inbox ON game_notifications(recipient_id,created_at DESC);
CREATE TRIGGER notify_host_on_game_request AFTER INSERT ON game_join_requests
WHEN NEW.status='pending'
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),id,organizer_id,NEW.player_id,'requested','',0,NEW.created_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility='public';
END;
CREATE TRIGGER notify_requester_on_game_decision AFTER UPDATE OF status ON game_join_requests
WHEN NEW.status!=OLD.status AND NEW.status IN ('approved','rejected','removed')
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),id,NEW.player_id,organizer_id,NEW.status,'',0,NEW.updated_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility='public';
END;
-- A removed participant may have joined before requests were introduced.
CREATE TRIGGER notify_requester_on_inserted_decision AFTER INSERT ON game_join_requests
WHEN NEW.status IN ('rejected','removed')
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),id,NEW.player_id,organizer_id,NEW.status,'',0,NEW.updated_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility='public';
END;
CREATE TRIGGER notify_players_on_game_cancellation AFTER UPDATE OF status ON games
WHEN OLD.status='scheduled' AND NEW.status='cancelled' AND NEW.visibility='public'
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),NEW.id,p.id,NEW.organizer_id,'game_cancelled','',0,NEW.updated_at FROM players p
 WHERE p.status='active' AND p.id!=NEW.organizer_id AND (EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=NEW.id AND gp.player_id=p.id) OR EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=NEW.id AND r.player_id=p.id AND r.status='pending'));
END;
