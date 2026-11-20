ALTER TABLE games ADD COLUMN chat_cancelled_at INTEGER;
CREATE TABLE game_chat_rooms(game_id TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,legal_hold INTEGER NOT NULL DEFAULT 0 CHECK(legal_hold IN (0,1)));
CREATE INDEX chat_room_expiry ON game_chat_rooms(legal_hold,expires_at);
CREATE TABLE game_chat_messages(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,game_id TEXT NOT NULL REFERENCES game_chat_rooms(game_id) ON DELETE CASCADE,author_id TEXT REFERENCES players(id) ON DELETE SET NULL,body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),client_id TEXT NOT NULL,created_at INTEGER NOT NULL,hidden_at INTEGER,UNIQUE(game_id,author_id,client_id));
CREATE INDEX chat_messages_room ON game_chat_messages(game_id,seq);
CREATE INDEX chat_messages_rate ON game_chat_messages(author_id,created_at);
CREATE TABLE game_chat_reads(game_id TEXT NOT NULL REFERENCES game_chat_rooms(game_id) ON DELETE CASCADE,player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,last_seq INTEGER NOT NULL DEFAULT 0,muted INTEGER NOT NULL DEFAULT 0 CHECK(muted IN (0,1)),PRIMARY KEY(game_id,player_id));
CREATE TABLE game_chat_exclusions(game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,PRIMARY KEY(game_id,player_id));
CREATE TABLE game_chat_reports(id TEXT PRIMARY KEY,game_id TEXT NOT NULL,message_id TEXT NOT NULL,reporter_id TEXT REFERENCES players(id) ON DELETE SET NULL,author_id TEXT REFERENCES players(id) ON DELETE SET NULL,category TEXT NOT NULL,details TEXT NOT NULL,context_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),created_at INTEGER NOT NULL,resolved_at INTEGER,legal_hold INTEGER NOT NULL DEFAULT 0 CHECK(legal_hold IN (0,1)),hold_review_at INTEGER);
CREATE INDEX chat_report_expiry ON game_chat_reports(legal_hold,status,resolved_at);
CREATE TABLE game_chat_report_actions(id TEXT PRIMARY KEY,report_id TEXT NOT NULL REFERENCES game_chat_reports(id) ON DELETE CASCADE,moderator_id TEXT REFERENCES players(id) ON DELETE SET NULL,action TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TRIGGER chat_participant_left AFTER DELETE ON game_participants BEGIN
 INSERT OR IGNORE INTO game_chat_exclusions SELECT OLD.game_id,OLD.player_id WHERE EXISTS(SELECT 1 FROM games WHERE id=OLD.game_id) AND EXISTS(SELECT 1 FROM players WHERE id=OLD.player_id);
END;
CREATE TRIGGER chat_participant_rejoined AFTER INSERT ON game_participants BEGIN
 DELETE FROM game_chat_exclusions WHERE game_id=NEW.game_id AND player_id=NEW.player_id;
END;
CREATE TRIGGER chat_game_cancelled AFTER UPDATE OF status ON games WHEN OLD.status!='cancelled' AND NEW.status='cancelled' BEGIN
 UPDATE games SET chat_cancelled_at=COALESCE(NEW.chat_cancelled_at,NEW.updated_at) WHERE id=NEW.id;
 UPDATE game_chat_rooms SET expires_at=COALESCE(NEW.chat_cancelled_at,NEW.updated_at)+2592000000 WHERE game_id=NEW.id;
END;
CREATE TRIGGER chat_game_rescheduled AFTER UPDATE OF ends_at ON games WHEN NEW.status='scheduled' BEGIN
 UPDATE game_chat_rooms SET expires_at=NEW.ends_at+2592000000 WHERE game_id=NEW.id;
END;
CREATE TRIGGER chat_game_deleted BEFORE DELETE ON games BEGIN
 DELETE FROM game_chat_rooms WHERE game_id=OLD.id AND legal_hold=0;
END;
CREATE TRIGGER chat_author_deleted BEFORE DELETE ON players BEGIN
 DELETE FROM game_chat_messages WHERE author_id=OLD.id AND game_id IN (SELECT game_id FROM game_chat_rooms WHERE legal_hold=0);
END;
