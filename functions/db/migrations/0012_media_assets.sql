CREATE TABLE media_assets (
 kind TEXT NOT NULL CHECK(kind IN ('player','group')),
 subject_id TEXT NOT NULL,
 object_key TEXT NOT NULL UNIQUE,
 version TEXT NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(kind,subject_id)
);
CREATE TABLE media_cleanup (
 object_key TEXT PRIMARY KEY,
 queued_at INTEGER NOT NULL
);
CREATE TRIGGER cleanup_player_photo AFTER DELETE ON players BEGIN
 INSERT OR IGNORE INTO media_cleanup SELECT object_key,CAST(strftime('%s','now') AS INTEGER)*1000 FROM media_assets WHERE kind='player' AND subject_id=OLD.id;
 DELETE FROM media_assets WHERE kind='player' AND subject_id=OLD.id;
END;
CREATE TRIGGER cleanup_group_cover AFTER DELETE ON tennis_groups BEGIN
 INSERT OR IGNORE INTO media_cleanup SELECT object_key,CAST(strftime('%s','now') AS INTEGER)*1000 FROM media_assets WHERE kind='group' AND subject_id=OLD.id;
 DELETE FROM media_assets WHERE kind='group' AND subject_id=OLD.id;
END;
