-- Latest voluntary cancellation per player; private to that player/organizer.
CREATE TABLE game_cancellations (
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 reason TEXT NOT NULL DEFAULT '' CHECK(length(reason)<=500),
 cancelled_at INTEGER NOT NULL,
 PRIMARY KEY(game_id,player_id)
);
