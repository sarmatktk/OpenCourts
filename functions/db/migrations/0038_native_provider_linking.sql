-- Development-only preparation. Apply to a target only after review and approval.
-- Native provider challenges bind the link operation to the signed-in player
-- and exact recently authenticated session that created the challenge.
ALTER TABLE native_provider_challenges ADD COLUMN link_player_id TEXT REFERENCES players(id) ON DELETE CASCADE;
ALTER TABLE native_provider_challenges ADD COLUMN link_session_hash TEXT;
