-- Ephemeral receipts and selected players exist only inside an atomic edit batch.
CREATE TABLE game_edit_jobs(
 id TEXT PRIMARY KEY,game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,
 old_capacity INTEGER NOT NULL,new_capacity INTEGER NOT NULL,fill_waiting INTEGER NOT NULL
);
CREATE TABLE game_capacity_fill(
 job_id TEXT NOT NULL REFERENCES game_edit_jobs(id) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 position INTEGER NOT NULL,had_request INTEGER NOT NULL,
 PRIMARY KEY(job_id,player_id)
);
CREATE VIEW game_waiting_candidates AS
 SELECT game_id,player_id,created_at,'request' AS source,1 AS priority,NULL AS offer_expires_at
 FROM game_join_requests WHERE status='pending'
 UNION ALL
 SELECT game_id,player_id,created_at,'waitlist',CASE WHEN status='offered' THEN 0 ELSE 1 END,offer_expires_at
 FROM game_waitlist WHERE status IN ('waiting','offered');
