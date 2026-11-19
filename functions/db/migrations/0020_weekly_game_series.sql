-- Each occurrence retains its independent game ID, attendance and invitations.
ALTER TABLE games ADD COLUMN series_id TEXT;
ALTER TABLE games ADD COLUMN series_week INTEGER CHECK(series_week IS NULL OR series_week BETWEEN 1 AND 12);
ALTER TABLE games ADD COLUMN series_weeks INTEGER CHECK(series_weeks IS NULL OR series_weeks BETWEEN 2 AND 12);
CREATE UNIQUE INDEX games_series_week ON games(series_id,series_week) WHERE series_id IS NOT NULL;
