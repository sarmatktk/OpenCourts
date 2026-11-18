CREATE TABLE group_invitations (
 id TEXT PRIMARY KEY,
 group_id TEXT NOT NULL REFERENCES tennis_groups(id) ON DELETE CASCADE,
 creator_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL,
 expires_at INTEGER,
 revoked_at INTEGER
);
CREATE INDEX group_invitations_group ON group_invitations(group_id,created_at DESC);
CREATE TABLE group_invitation_redemptions (
 invitation_id TEXT NOT NULL REFERENCES group_invitations(id) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 redeemed_at INTEGER NOT NULL,
 PRIMARY KEY(invitation_id,player_id)
);
