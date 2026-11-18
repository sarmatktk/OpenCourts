-- Local first. New remote development migration requires explicit approval.
-- group_id intentionally has no FK until groups are introduced; all group and
-- unlisted creation/reads fail closed in the Phase 2 API.
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL CHECK(visibility IN ('public','unlisted','group')),
  group_id TEXT,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 80),
  court_id TEXT NOT NULL,
  court_name TEXT NOT NULL,
  court_lat REAL NOT NULL CHECK(court_lat BETWEEN -90 AND 90),
  court_lon REAL NOT NULL CHECK(court_lon BETWEEN -180 AND 180),
  court_access TEXT NOT NULL CHECK(court_access IN ('public','unknown')),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL CHECK(ends_at > starts_at),
  time_zone TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('singles','doubles')),
  capacity INTEGER NOT NULL CHECK((format='singles' AND capacity=2) OR (format='doubles' AND capacity=4)),
  skill_preference TEXT NOT NULL DEFAULT 'any' CHECK(skill_preference IN ('any','beginner','intermediate','advanced')),
  notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=1000),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','cancelled')),
  version INTEGER NOT NULL DEFAULT 1,
  request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(organizer_id,request_id),
  CHECK((visibility='group' AND group_id IS NOT NULL) OR (visibility!='group' AND group_id IS NULL))
);
CREATE INDEX games_public_start_idx ON games(visibility,status,starts_at,id);
CREATE INDEX games_group_start_idx ON games(group_id,status,starts_at,id);
CREATE INDEX games_organizer_idx ON games(organizer_id,starts_at);
CREATE TABLE game_participants (
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY(game_id,player_id)
);
CREATE INDEX game_participants_player_idx ON game_participants(player_id,game_id);
CREATE TRIGGER game_capacity_insert BEFORE INSERT ON game_participants
WHEN (SELECT COUNT(*) FROM game_participants WHERE game_id=NEW.game_id)>=(SELECT capacity FROM games WHERE id=NEW.game_id)
BEGIN SELECT RAISE(ABORT,'game capacity exceeded'); END;
CREATE TRIGGER game_capacity_update BEFORE UPDATE OF capacity ON games
WHEN NEW.capacity<(SELECT COUNT(*) FROM game_participants WHERE game_id=NEW.id)
BEGIN SELECT RAISE(ABORT,'capacity below participant count'); END;
CREATE TRIGGER game_capacity_move BEFORE UPDATE OF game_id ON game_participants
WHEN NEW.game_id!=OLD.game_id AND (SELECT COUNT(*) FROM game_participants WHERE game_id=NEW.game_id)>=(SELECT capacity FROM games WHERE id=NEW.game_id)
BEGIN SELECT RAISE(ABORT,'game capacity exceeded'); END;
