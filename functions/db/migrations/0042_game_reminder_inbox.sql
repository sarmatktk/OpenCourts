CREATE TABLE game_reminder_notifications (
 id TEXT PRIMARY KEY,
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 recipient_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 starts_at INTEGER NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('game_reminder_24h','game_reminder_3h')),
 created_at INTEGER NOT NULL,
 read_at INTEGER,
 UNIQUE(game_id,recipient_id,starts_at,kind)
);
CREATE INDEX game_reminder_notifications_inbox
 ON game_reminder_notifications(recipient_id,created_at DESC);
