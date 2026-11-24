-- A capacity change moves someone to the waitlist without revoking access
-- they earned as a confirmed player. Explicit removal clears this grant.
CREATE TABLE game_chat_capacity_access(
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 granted_at INTEGER NOT NULL,
 PRIMARY KEY(game_id,player_id)
);

-- Preserve access for confirmed players demoted before this migration lands.
INSERT OR IGNORE INTO game_chat_capacity_access(game_id,player_id,granted_at)
 SELECT game_id,recipient_id,created_at FROM game_notifications WHERE kind='waitlisted';
