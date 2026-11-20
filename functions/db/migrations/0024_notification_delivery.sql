-- Additive notification delivery foundation. Remote development application requires approval.
-- Event records contain routing metadata only: never names, email, cancellation reasons or invite tokens.
CREATE TABLE notification_events (
 id TEXT PRIMARY KEY, source TEXT NOT NULL, source_id TEXT NOT NULL,
 recipient_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 category TEXT NOT NULL CHECK(category IN ('games','groups')), kind TEXT NOT NULL,
 entity_type TEXT NOT NULL CHECK(entity_type IN ('game','group')), entity_id TEXT NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, UNIQUE(source,source_id,recipient_id)
);
CREATE INDEX notification_events_retention ON notification_events(expires_at);
CREATE TABLE notification_preferences (
 player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
 push_enabled INTEGER NOT NULL DEFAULT 0 CHECK(push_enabled IN (0,1)),
 games INTEGER NOT NULL DEFAULT 1 CHECK(games IN (0,1)), groups INTEGER NOT NULL DEFAULT 1 CHECK(groups IN (0,1)), updated_at INTEGER NOT NULL
);
CREATE TABLE notification_devices (
 id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 session_id TEXT NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
 transport TEXT NOT NULL CHECK(transport IN ('webpush','apns')), endpoint_hash TEXT NOT NULL UNIQUE,
 endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, key_id TEXT NOT NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, revoked_at INTEGER
);
CREATE INDEX notification_devices_player ON notification_devices(player_id,revoked_at);
CREATE TABLE notification_deliveries (
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
 device_id TEXT REFERENCES notification_devices(id) ON DELETE CASCADE,
 channel TEXT NOT NULL DEFAULT 'webpush' CHECK(channel IN ('webpush','apns','email')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','skipped','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL, lease_until INTEGER, lease_token TEXT,
 sent_at INTEGER, last_error TEXT, UNIQUE(event_id,device_id)
);
CREATE UNIQUE INDEX notification_delivery_account_channel ON notification_deliveries(event_id,channel) WHERE device_id IS NULL;
CREATE INDEX notification_deliveries_pending ON notification_deliveries(status,next_attempt_at);
CREATE TABLE notification_worker_state(name TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TRIGGER notification_fanout AFTER INSERT ON notification_events
BEGIN
 INSERT OR IGNORE INTO notification_deliveries(id,event_id,device_id,channel,next_attempt_at)
 SELECT lower(hex(randomblob(16))),NEW.id,d.id,d.transport,NEW.created_at FROM notification_devices d
 JOIN notification_preferences p ON p.player_id=d.player_id JOIN auth_sessions s ON s.id=d.session_id
 WHERE d.player_id=NEW.recipient_id AND d.revoked_at IS NULL AND d.created_at<=NEW.created_at
 AND p.push_enabled=1 AND CASE NEW.category WHEN 'games' THEN p.games ELSE p.groups END=1
 AND s.revoked_at IS NULL AND s.expires_at>NEW.created_at;
END;
CREATE TRIGGER push_event_game_notifications AFTER INSERT ON game_notifications
BEGIN INSERT OR IGNORE INTO notification_events VALUES(lower(hex(randomblob(16))),'game_notifications',NEW.id,NEW.recipient_id,'games',NEW.kind,'game',NEW.game_id,NEW.created_at,NEW.created_at+86400000); END;
CREATE TRIGGER push_event_group_notifications AFTER INSERT ON group_notifications
BEGIN INSERT OR IGNORE INTO notification_events VALUES(lower(hex(randomblob(16))),'group_notifications',NEW.id,NEW.recipient_id,'groups',NEW.kind,'group',NEW.group_id,NEW.created_at,NEW.created_at+86400000); END;
CREATE TRIGGER push_event_game_guest_notifications AFTER INSERT ON game_guest_notifications
BEGIN INSERT OR IGNORE INTO notification_events VALUES(lower(hex(randomblob(16))),'game_guest_notifications',NEW.id,NEW.recipient_id,'games',NEW.kind,'game',NEW.game_id,NEW.created_at,NEW.created_at+86400000); END;
CREATE TRIGGER push_event_player_game_invitations AFTER INSERT ON player_game_invitations
BEGIN INSERT OR IGNORE INTO notification_events VALUES(lower(hex(randomblob(16))),'player_game_invitations',NEW.id,NEW.recipient_id,'games','game_invited','game',NEW.game_id,NEW.created_at,NEW.created_at+86400000); END;
CREATE TRIGGER push_event_game_schedule_notifications AFTER INSERT ON game_schedule_notifications
BEGIN INSERT OR IGNORE INTO notification_events VALUES(lower(hex(randomblob(16))),'game_schedule_notifications',NEW.id,NEW.recipient_id,'games','schedule_changed','game',NEW.game_id,NEW.created_at,NEW.created_at+86400000); END;
CREATE TRIGGER push_event_waitlist AFTER UPDATE OF status ON game_waitlist
WHEN NEW.status='offered' AND OLD.status!='offered'
BEGIN INSERT OR IGNORE INTO notification_events VALUES(lower(hex(randomblob(16))),'game_waitlist',NEW.game_id||':'||NEW.player_id||':'||NEW.offered_at,NEW.player_id,'games','waitlist_offer','game',NEW.game_id,NEW.offered_at,NEW.offer_expires_at); END;
