-- Apply locally first. Remote development migration requires separate approval.
CREATE TABLE player_game_invitations (
 id TEXT PRIMARY KEY,
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 sender_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 recipient_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 read_at INTEGER,
 UNIQUE(game_id,recipient_id),
 CHECK(sender_id!=recipient_id)
);
CREATE INDEX player_game_invitation_inbox ON player_game_invitations(recipient_id,created_at DESC);
CREATE INDEX player_game_invitation_sender ON player_game_invitations(sender_id,created_at DESC);
