CREATE TABLE IF NOT EXISTS tennis_courts (
  osm_type TEXT NOT NULL CHECK (osm_type IN ('node', 'way', 'relation')),
  osm_id INTEGER NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  tags_json TEXT NOT NULL,
  PRIMARY KEY (osm_type, osm_id)
);

CREATE INDEX IF NOT EXISTS tennis_courts_lat_lon_idx
  ON tennis_courts (lat, lon);
