-- Capacity edits can move a confirmed player into a waitlist/approval queue
-- and group waitlist auto-fill can confirm that player's place again.
ALTER TABLE game_capacity_fill ADD COLUMN party_size INTEGER NOT NULL DEFAULT 0 CHECK(party_size>=0);
DROP TRIGGER IF EXISTS push_event_game_notifications;
DROP TRIGGER IF EXISTS suppress_self_game_notification;
DROP TRIGGER IF EXISTS attribute_game_notification;
DROP TRIGGER IF EXISTS notify_host_on_game_request;
DROP TRIGGER IF EXISTS notify_requester_on_game_decision;
DROP TRIGGER IF EXISTS notify_requester_on_inserted_decision;
DROP TRIGGER IF EXISTS notify_players_on_game_cancellation;
DROP TRIGGER IF EXISTS notify_invited_waiting_on_cancellation;

ALTER TABLE game_notifications RENAME TO game_notifications_before_capacity_notices;
CREATE TABLE game_notifications (
 id TEXT PRIMARY KEY,
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 recipient_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('requested','withdrawn','cancelled','approved','rejected','removed','game_cancelled','waitlisted','confirmed')),
 reason TEXT NOT NULL DEFAULT '' CHECK(length(reason)<=500),
 places_released INTEGER NOT NULL CHECK(places_released>=0),
 created_at INTEGER NOT NULL,
 read_at INTEGER
);
INSERT INTO game_notifications SELECT * FROM game_notifications_before_capacity_notices;
DROP TABLE game_notifications_before_capacity_notices;
CREATE INDEX game_notifications_inbox ON game_notifications(recipient_id,created_at DESC);

CREATE TRIGGER push_event_game_notifications AFTER INSERT ON game_notifications
BEGIN INSERT OR IGNORE INTO notification_events VALUES(lower(hex(randomblob(16))),'game_notifications',NEW.id,NEW.recipient_id,'games',NEW.kind,'game',NEW.game_id,NEW.created_at,NEW.created_at+86400000); END;
CREATE TRIGGER suppress_self_game_notification BEFORE INSERT ON game_notifications
WHEN NEW.recipient_id=COALESCE((SELECT actor_id FROM notification_action_context WHERE id=1),NEW.actor_id)
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER attribute_game_notification AFTER INSERT ON game_notifications
WHEN EXISTS(SELECT 1 FROM notification_action_context WHERE id=1)
BEGIN UPDATE game_notifications SET actor_id=(SELECT actor_id FROM notification_action_context WHERE id=1) WHERE id=NEW.id; END;

CREATE TRIGGER notify_host_on_game_request AFTER INSERT ON game_join_requests WHEN NEW.status='pending'
BEGIN INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at) SELECT lower(hex(randomblob(16))),id,organizer_id,NEW.player_id,'requested','',0,NEW.created_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility IN ('public','unlisted'); END;
CREATE TRIGGER notify_requester_on_game_decision AFTER UPDATE OF status ON game_join_requests
WHEN NEW.status!=OLD.status AND NEW.status IN ('approved','rejected','removed')
BEGIN INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at) SELECT lower(hex(randomblob(16))),id,NEW.player_id,organizer_id,NEW.status,'',0,NEW.updated_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility IN ('public','group','unlisted'); END;
CREATE TRIGGER notify_requester_on_inserted_decision AFTER INSERT ON game_join_requests WHEN NEW.status IN ('rejected','removed')
BEGIN INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at) SELECT lower(hex(randomblob(16))),id,NEW.player_id,organizer_id,NEW.status,'',0,NEW.updated_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility IN ('public','group','unlisted'); END;
CREATE TRIGGER notify_players_on_game_cancellation AFTER UPDATE OF status ON games
WHEN OLD.status='scheduled' AND NEW.status='cancelled' AND NEW.visibility IN ('public','group','unlisted')
BEGIN INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at) SELECT lower(hex(randomblob(16))),NEW.id,p.id,COALESCE((SELECT actor_id FROM notification_action_context WHERE id=1),NEW.organizer_id),'game_cancelled','',0,NEW.updated_at FROM players p WHERE p.status='active' AND (p.id=NEW.organizer_id OR EXISTS(SELECT 1 FROM game_participants a WHERE a.game_id=NEW.id AND a.player_id=p.id) OR EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=NEW.id AND r.player_id=p.id AND r.status='pending'));
END;
CREATE TRIGGER notify_invited_waiting_on_cancellation AFTER UPDATE OF status ON games
WHEN OLD.status='scheduled' AND NEW.status='cancelled'
BEGIN INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at) SELECT lower(hex(randomblob(16))),NEW.id,p.id,COALESCE((SELECT actor_id FROM notification_action_context WHERE id=1),NEW.organizer_id),'game_cancelled','',0,NEW.updated_at FROM players p WHERE p.status='active' AND p.id!=NEW.organizer_id AND (EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=NEW.id AND i.recipient_id=p.id) OR EXISTS(SELECT 1 FROM game_waitlist w WHERE w.game_id=NEW.id AND w.player_id=p.id AND w.status IN ('waiting','offered'))) AND NOT EXISTS(SELECT 1 FROM game_participants a WHERE a.game_id=NEW.id AND a.player_id=p.id) AND NOT EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=NEW.id AND r.player_id=p.id AND r.status='pending');
END;
