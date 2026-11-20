-- Suppress the actual actor before inbox insertion and push fanout.
-- The application inserts/removes context in the same atomic batch as mutations.
CREATE TABLE notification_action_context (
 id INTEGER PRIMARY KEY CHECK(id=1),
 actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE
);
ALTER TABLE game_schedule_notifications ADD COLUMN actor_id TEXT REFERENCES players(id) ON DELETE SET NULL;

-- Recover historical schedule actors only where the existing audit identifies them.
UPDATE game_schedule_notifications AS n SET actor_id=(
 SELECT MIN(c.actor_id) FROM game_series_changes c JOIN game_series_change_targets t ON t.change_id=c.id
 WHERE t.game_id=n.game_id AND c.created_at=n.created_at AND t.starts_at=n.new_start
 AND t.status='scheduled' HAVING COUNT(DISTINCT c.actor_id)=1
);

CREATE TRIGGER suppress_self_game_notification BEFORE INSERT ON game_notifications
WHEN NEW.recipient_id=COALESCE((SELECT actor_id FROM notification_action_context WHERE id=1),NEW.actor_id)
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER attribute_game_notification AFTER INSERT ON game_notifications
WHEN EXISTS(SELECT 1 FROM notification_action_context WHERE id=1)
BEGIN UPDATE game_notifications SET actor_id=(SELECT actor_id FROM notification_action_context WHERE id=1) WHERE id=NEW.id; END;
CREATE TRIGGER suppress_self_group_notification BEFORE INSERT ON group_notifications
WHEN NEW.recipient_id=COALESCE((SELECT actor_id FROM notification_action_context WHERE id=1),NEW.actor_id)
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER attribute_group_notification AFTER INSERT ON group_notifications
WHEN EXISTS(SELECT 1 FROM notification_action_context WHERE id=1)
BEGIN UPDATE group_notifications SET actor_id=(SELECT actor_id FROM notification_action_context WHERE id=1) WHERE id=NEW.id; END;
CREATE TRIGGER suppress_self_guest_notification BEFORE INSERT ON game_guest_notifications
WHEN NEW.recipient_id=COALESCE((SELECT actor_id FROM notification_action_context WHERE id=1),NEW.actor_id)
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER attribute_guest_notification AFTER INSERT ON game_guest_notifications
WHEN EXISTS(SELECT 1 FROM notification_action_context WHERE id=1)
BEGIN UPDATE game_guest_notifications SET actor_id=(SELECT actor_id FROM notification_action_context WHERE id=1) WHERE id=NEW.id; END;
CREATE TRIGGER suppress_self_schedule_notification BEFORE INSERT ON game_schedule_notifications
WHEN NEW.recipient_id=NEW.actor_id
BEGIN SELECT RAISE(IGNORE); END;

DROP TRIGGER notify_game_schedule_change;
CREATE TRIGGER notify_game_schedule_change AFTER UPDATE OF starts_at ON games
WHEN NEW.starts_at!=OLD.starts_at AND NEW.status='scheduled'
BEGIN
 INSERT INTO game_schedule_notifications(id,game_id,recipient_id,old_start,new_start,created_at,actor_id)
 SELECT lower(hex(randomblob(16))),NEW.id,p.id,OLD.starts_at,NEW.starts_at,NEW.updated_at,
 COALESCE((SELECT actor_id FROM notification_action_context WHERE id=1),NEW.organizer_id)
 FROM players p WHERE p.status='active' AND
 (p.id=NEW.organizer_id OR EXISTS(SELECT 1 FROM game_participants a WHERE a.game_id=NEW.id AND a.player_id=p.id)
 OR EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=NEW.id AND r.player_id=p.id AND r.status='pending')
 OR EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=NEW.id AND i.recipient_id=p.id)
 OR EXISTS(SELECT 1 FROM game_waitlist w WHERE w.game_id=NEW.id AND w.player_id=p.id AND w.status IN ('waiting','offered')));
 UPDATE game_waitlist SET offer_expires_at=MIN(offer_expires_at,NEW.starts_at) WHERE game_id=NEW.id AND status='offered';
END;

-- A manager may cancel while also participating. Notify the organizer when another
-- manager acted, but never the cancelling manager (including series and archival).
DROP TRIGGER notify_players_on_game_cancellation;
CREATE TRIGGER notify_players_on_game_cancellation AFTER UPDATE OF status ON games
WHEN OLD.status='scheduled' AND NEW.status='cancelled' AND NEW.visibility IN ('public','group','unlisted')
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),NEW.id,p.id,COALESCE((SELECT actor_id FROM notification_action_context WHERE id=1),NEW.organizer_id),'game_cancelled','',0,NEW.updated_at
 FROM players p WHERE p.status='active' AND (p.id=NEW.organizer_id
 OR EXISTS(SELECT 1 FROM game_participants a WHERE a.game_id=NEW.id AND a.player_id=p.id)
 OR EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=NEW.id AND r.player_id=p.id AND r.status='pending'));
END;
DROP TRIGGER notify_invited_waiting_on_cancellation;
CREATE TRIGGER notify_invited_waiting_on_cancellation AFTER UPDATE OF status ON games
WHEN OLD.status='scheduled' AND NEW.status='cancelled'
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),NEW.id,p.id,COALESCE((SELECT actor_id FROM notification_action_context WHERE id=1),NEW.organizer_id),'game_cancelled','',0,NEW.updated_at
 FROM players p WHERE p.status='active' AND p.id!=NEW.organizer_id AND
 (EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=NEW.id AND i.recipient_id=p.id)
 OR EXISTS(SELECT 1 FROM game_waitlist w WHERE w.game_id=NEW.id AND w.player_id=p.id AND w.status IN ('waiting','offered')))
 AND NOT EXISTS(SELECT 1 FROM game_participants a WHERE a.game_id=NEW.id AND a.player_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=NEW.id AND r.player_id=p.id AND r.status='pending');
END;

-- Remove only identifiable historical self-notifications, including queued pushes.
DELETE FROM notification_events WHERE
 (source='game_schedule_notifications' AND source_id IN (SELECT id FROM game_schedule_notifications WHERE actor_id=recipient_id)) OR
 (source='game_notifications' AND source_id IN (SELECT id FROM game_notifications WHERE actor_id=recipient_id)) OR
 (source='group_notifications' AND source_id IN (SELECT id FROM group_notifications WHERE actor_id=recipient_id)) OR
 (source='game_guest_notifications' AND source_id IN (SELECT id FROM game_guest_notifications WHERE actor_id=recipient_id));
DELETE FROM game_schedule_notifications WHERE actor_id=recipient_id;
DELETE FROM game_notifications WHERE actor_id=recipient_id;
DELETE FROM group_notifications WHERE actor_id=recipient_id;
DELETE FROM game_guest_notifications WHERE actor_id=recipient_id;
