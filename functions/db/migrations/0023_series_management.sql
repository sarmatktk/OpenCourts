ALTER TABLE games ADD COLUMN series_exception INTEGER NOT NULL DEFAULT 0 CHECK(series_exception IN (0,1));
CREATE TABLE game_series_changes(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,session_hash TEXT NOT NULL,request_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE game_series_change_targets(change_id TEXT NOT NULL REFERENCES game_series_changes(id) ON DELETE CASCADE,game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,expected_version INTEGER NOT NULL,starts_at INTEGER NOT NULL,ends_at INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('scheduled','cancelled')),exception INTEGER NOT NULL CHECK(exception IN (0,1)),PRIMARY KEY(change_id,game_id));
CREATE TRIGGER series_target_guard BEFORE INSERT ON game_series_change_targets
WHEN NOT EXISTS(SELECT 1 FROM games g JOIN game_series_changes c ON c.id=NEW.change_id JOIN auth_sessions s ON s.player_id=c.actor_id AND s.token_hash=c.session_hash JOIN players p ON p.id=c.actor_id
 WHERE g.id=NEW.game_id AND g.version=NEW.expected_version AND g.status='scheduled' AND g.starts_at>c.created_at AND p.status='active' AND s.revoked_at IS NULL AND s.expires_at>c.created_at AND
 ((g.visibility!='group' AND g.organizer_id=c.actor_id) OR (g.visibility='group' AND EXISTS(SELECT 1 FROM tennis_groups t JOIN group_memberships m ON m.group_id=t.id WHERE t.id=g.group_id AND t.status='active' AND m.player_id=c.actor_id AND m.status='active' AND (t.owner_id=c.actor_id OR COALESCE(m.assigned_role,m.role)='coowner' OR (g.organizer_id=c.actor_id AND COALESCE(m.assigned_role,m.role)='organizer'))))))
BEGIN SELECT RAISE(ABORT,'series changed or permission revoked'); END;
CREATE TRIGGER series_target_apply AFTER INSERT ON game_series_change_targets
BEGIN UPDATE games SET starts_at=NEW.starts_at,ends_at=NEW.ends_at,status=NEW.status,series_exception=NEW.exception,version=version+1,updated_at=(SELECT created_at FROM game_series_changes WHERE id=NEW.change_id) WHERE id=NEW.game_id; END;
CREATE TABLE game_schedule_notifications(id TEXT PRIMARY KEY,game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,recipient_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,old_start INTEGER NOT NULL,new_start INTEGER NOT NULL,created_at INTEGER NOT NULL,read_at INTEGER);
CREATE TRIGGER notify_game_schedule_change AFTER UPDATE OF starts_at ON games
WHEN NEW.starts_at!=OLD.starts_at AND NEW.status='scheduled'
BEGIN
 INSERT INTO game_schedule_notifications(id,game_id,recipient_id,old_start,new_start,created_at)
 SELECT lower(hex(randomblob(16))),NEW.id,p.id,OLD.starts_at,NEW.starts_at,NEW.updated_at FROM players p WHERE p.status='active' AND (p.id=NEW.organizer_id OR EXISTS(SELECT 1 FROM game_participants a WHERE a.game_id=NEW.id AND a.player_id=p.id) OR EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=NEW.id AND r.player_id=p.id AND r.status='pending') OR EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=NEW.id AND i.recipient_id=p.id) OR EXISTS(SELECT 1 FROM game_waitlist w WHERE w.game_id=NEW.id AND w.player_id=p.id AND w.status IN ('waiting','offered')));
 UPDATE game_waitlist SET offer_expires_at=MIN(offer_expires_at,NEW.starts_at) WHERE game_id=NEW.id AND status='offered';
END;

CREATE TRIGGER notify_invited_waiting_on_cancellation AFTER UPDATE OF status ON games
WHEN OLD.status='scheduled' AND NEW.status='cancelled'
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),NEW.id,p.id,NEW.organizer_id,'game_cancelled','',0,NEW.updated_at FROM players p WHERE p.status='active' AND p.id!=NEW.organizer_id AND
 (EXISTS(SELECT 1 FROM player_game_invitations i WHERE i.game_id=NEW.id AND i.recipient_id=p.id) OR EXISTS(SELECT 1 FROM game_waitlist w WHERE w.game_id=NEW.id AND w.player_id=p.id AND w.status IN ('waiting','offered')))
 AND NOT EXISTS(SELECT 1 FROM game_participants a WHERE a.game_id=NEW.id AND a.player_id=p.id) AND NOT EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=NEW.id AND r.player_id=p.id);
END;
