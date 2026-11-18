CREATE TABLE game_host_notifications (
 id TEXT PRIMARY KEY,
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 host_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('withdrawn','cancelled')),
 reason TEXT NOT NULL DEFAULT '' CHECK(length(reason)<=500),
 places_released INTEGER NOT NULL CHECK(places_released>=0),
 created_at INTEGER NOT NULL,
 read_at INTEGER
);
CREATE INDEX game_host_notifications_inbox ON game_host_notifications(host_id,created_at DESC);
