ALTER TABLE games ADD COLUMN join_policy TEXT NOT NULL DEFAULT 'approval' CHECK(join_policy IN ('instant','approval'));
CREATE TABLE game_join_requests (
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','removed')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(game_id,player_id)
);
CREATE INDEX game_join_requests_player_idx ON game_join_requests(player_id,status,updated_at);
