-- Shared rooms use a namespaced key, independent of any single occurrence.
CREATE TABLE series_chat_threads(
 id TEXT PRIMARY KEY,
 group_id TEXT REFERENCES tennis_groups(id) ON DELETE SET NULL,
 organizer_id TEXT REFERENCES players(id) ON DELETE SET NULL,
 title TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE series_chat_members(
 series_id TEXT NOT NULL REFERENCES series_chat_threads(id) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 joined_at INTEGER NOT NULL,
 last_message_at INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 left_at INTEGER,
 left_reason TEXT,
 PRIMARY KEY(series_id,player_id)
);
CREATE INDEX series_chat_member_player ON series_chat_members(player_id,active);
ALTER TABLE game_chat_messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'message' CHECK(kind IN ('message','joined','inactive','left'));
CREATE INDEX chat_messages_retention ON game_chat_messages(game_id,created_at);

INSERT INTO series_chat_threads(id,group_id,organizer_id,title,created_at)
 SELECT series_id,group_id,organizer_id,title,MIN(created_at) FROM games
 WHERE visibility='group' AND series_id IS NOT NULL GROUP BY series_id HAVING COUNT(DISTINCT group_id)=1;

CREATE VIEW game_chat_context AS
 SELECT g.id,g.id AS route_game_id,g.organizer_id,g.visibility,g.group_id,g.title,g.starts_at,g.ends_at,g.status,g.chat_cancelled_at,NULL AS series_id,
 COALESCE(g.chat_cancelled_at,CASE WHEN g.status='cancelled' THEN g.updated_at ELSE g.ends_at END)+2592000000 AS chat_expiry
 FROM games g WHERE g.visibility!='group' OR g.series_id IS NULL
 UNION ALL
 SELECT 'series:'||t.id,
 (SELECT sg.id FROM games sg WHERE sg.series_id=t.id AND sg.group_id=t.group_id AND sg.visibility='group' ORDER BY CASE WHEN sg.status='scheduled' THEN 0 ELSE 1 END,sg.starts_at DESC,sg.id LIMIT 1),
 COALESCE((SELECT sg.organizer_id FROM games sg WHERE sg.series_id=t.id AND sg.group_id=t.group_id AND sg.visibility='group' ORDER BY sg.starts_at DESC,sg.id LIMIT 1),t.organizer_id),
 'group',t.group_id,t.title,
 COALESCE((SELECT MIN(starts_at) FROM games WHERE series_id=t.id AND group_id=t.group_id),t.created_at),
 COALESCE((SELECT MAX(ends_at) FROM games WHERE series_id=t.id AND group_id=t.group_id),t.created_at),
 CASE WHEN EXISTS(SELECT 1 FROM games WHERE series_id=t.id AND group_id=t.group_id AND status='scheduled') THEN 'scheduled' ELSE 'cancelled' END,
 NULL,t.id,
 MAX(t.created_at,
 COALESCE((SELECT MAX(CASE WHEN status='cancelled' THEN COALESCE(chat_cancelled_at,updated_at) ELSE ends_at END) FROM games WHERE series_id=t.id AND group_id=t.group_id),0),
 COALESCE((SELECT MAX(created_at) FROM game_chat_messages WHERE game_id='series:'||t.id AND kind='message'),0))+2592000000
 FROM series_chat_threads t;

-- Preserve existing messages, safety holds and the most conservative mute choice.
INSERT INTO game_chat_rooms(game_id,expires_at,legal_hold)
 SELECT 'series:'||t.id,MAX(COALESCE(MAX(r.expires_at),0),MAX(g.ends_at)+2592000000),COALESCE(MAX(r.legal_hold),0)
 FROM series_chat_threads t JOIN games g ON g.series_id=t.id AND g.group_id=t.group_id
 LEFT JOIN game_chat_rooms r ON r.game_id=g.id GROUP BY t.id;
-- Keep rare client-ID collisions from two old occurrence rooms without losing text.
UPDATE game_chat_messages AS m SET client_id=client_id||':'||id WHERE EXISTS(
 SELECT 1 FROM game_chat_messages earlier JOIN games eg ON eg.id=earlier.game_id JOIN games mg ON mg.id=m.game_id
 WHERE mg.visibility='group' AND mg.series_id IS NOT NULL AND eg.series_id=mg.series_id AND eg.group_id=mg.group_id
 AND earlier.author_id=m.author_id AND earlier.client_id=m.client_id AND earlier.seq<m.seq
);
INSERT INTO game_chat_reads(game_id,player_id,last_seq,muted)
 SELECT 'series:'||g.series_id,r.player_id,MIN(r.last_seq),MAX(r.muted) FROM game_chat_reads r JOIN games g ON g.id=r.game_id
 JOIN series_chat_threads t ON t.id=g.series_id AND t.group_id=g.group_id WHERE g.visibility='group' GROUP BY g.series_id,r.player_id;
UPDATE game_chat_messages SET game_id=(SELECT 'series:'||g.series_id FROM games g JOIN series_chat_threads t ON t.id=g.series_id AND t.group_id=g.group_id WHERE g.id=game_chat_messages.game_id AND g.visibility='group')
 WHERE game_id IN(SELECT g.id FROM games g JOIN series_chat_threads t ON t.id=g.series_id AND t.group_id=g.group_id WHERE g.visibility='group');
UPDATE game_chat_reports SET game_id=(SELECT 'series:'||g.series_id FROM games g JOIN series_chat_threads t ON t.id=g.series_id AND t.group_id=g.group_id WHERE g.id=game_chat_reports.game_id AND g.visibility='group')
 WHERE game_id IN(SELECT g.id FROM games g JOIN series_chat_threads t ON t.id=g.series_id AND t.group_id=g.group_id WHERE g.visibility='group');
INSERT INTO series_chat_members(series_id,player_id,joined_at,last_message_at)
 SELECT t.id,member.player_id,MAX(COALESCE(cp.joined_at,t.created_at)),COALESCE((SELECT MAX(m.created_at) FROM game_chat_messages m WHERE m.game_id='series:'||t.id AND m.author_id=member.player_id AND m.kind='message'),0)
 FROM series_chat_threads t JOIN games g ON g.series_id=t.id AND g.group_id=t.group_id
 JOIN (SELECT game_id,player_id FROM game_participants UNION SELECT game_id,player_id FROM game_chat_exclusions) member ON member.game_id=g.id
 LEFT JOIN game_participants cp ON cp.game_id=g.id AND cp.player_id=member.player_id
 JOIN group_memberships gm ON gm.group_id=t.group_id AND gm.player_id=member.player_id AND gm.status='active'
 JOIN players p ON p.id=member.player_id AND p.status='active' GROUP BY t.id,member.player_id;
DELETE FROM game_chat_rooms WHERE game_id IN(SELECT g.id FROM games g JOIN series_chat_threads t ON t.id=g.series_id AND t.group_id=g.group_id WHERE g.visibility='group');

CREATE TRIGGER series_chat_game_created AFTER INSERT ON games WHEN NEW.visibility='group' AND NEW.series_id IS NOT NULL BEGIN
 INSERT OR IGNORE INTO series_chat_threads(id,group_id,organizer_id,title,created_at) VALUES(NEW.series_id,NEW.group_id,NEW.organizer_id,NEW.title,NEW.created_at);
 INSERT INTO game_chat_rooms(game_id,expires_at) VALUES('series:'||NEW.series_id,NEW.ends_at+2592000000)
 ON CONFLICT(game_id) DO UPDATE SET expires_at=MAX(game_chat_rooms.expires_at,excluded.expires_at);
END;
CREATE TRIGGER series_chat_before_rejoin BEFORE INSERT ON game_participants BEGIN
 UPDATE series_chat_members SET active=0,left_reason='inactive',left_at=NEW.joined_at
 WHERE player_id=NEW.player_id AND active=1 AND joined_at<=NEW.joined_at-2592000000 AND last_message_at<=NEW.joined_at-2592000000
 AND series_id=(SELECT series_id FROM games WHERE id=NEW.game_id AND visibility='group')
 AND NOT EXISTS(SELECT 1 FROM game_chat_context g WHERE g.series_id=series_chat_members.series_id AND g.organizer_id=NEW.player_id)
 AND NOT EXISTS(SELECT 1 FROM games sg JOIN game_participants cp ON cp.game_id=sg.id WHERE sg.series_id=series_chat_members.series_id AND cp.player_id=NEW.player_id AND sg.status='scheduled' AND sg.ends_at>NEW.joined_at-2592000000);
END;
CREATE TRIGGER series_chat_participant_joined AFTER INSERT ON game_participants BEGIN
 INSERT INTO series_chat_members(series_id,player_id,joined_at)
 SELECT g.series_id,NEW.player_id,NEW.joined_at FROM games g JOIN group_memberships gm ON gm.group_id=g.group_id AND gm.player_id=NEW.player_id AND gm.status='active'
 WHERE g.id=NEW.game_id AND g.visibility='group' AND g.series_id IS NOT NULL
 ON CONFLICT(series_id,player_id) DO UPDATE SET joined_at=MAX(series_chat_members.joined_at,excluded.joined_at),active=1,left_at=NULL,left_reason=NULL;
END;
CREATE TRIGGER series_chat_organizer_changed AFTER UPDATE OF organizer_id ON games WHEN NEW.visibility='group' AND NEW.series_id IS NOT NULL BEGIN
 INSERT INTO series_chat_members(series_id,player_id,joined_at)
 SELECT NEW.series_id,NEW.organizer_id,NEW.updated_at WHERE EXISTS(SELECT 1 FROM group_memberships WHERE group_id=NEW.group_id AND player_id=NEW.organizer_id AND status='active')
 ON CONFLICT(series_id,player_id) DO UPDATE SET active=1,joined_at=MAX(series_chat_members.joined_at,excluded.joined_at),left_at=NULL,left_reason=NULL;
END;
CREATE TRIGGER series_chat_member_added AFTER INSERT ON series_chat_members WHEN NEW.active=1 BEGIN
 INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at,kind)
 SELECT lower(hex(randomblob(16))),'series:'||NEW.series_id,NEW.player_id,p.display_name,lower(hex(randomblob(16))),NEW.joined_at,'joined' FROM players p JOIN game_chat_rooms cr ON cr.game_id='series:'||NEW.series_id WHERE p.id=NEW.player_id;
END;
CREATE TRIGGER series_chat_member_status AFTER UPDATE OF active ON series_chat_members WHEN OLD.active!=NEW.active BEGIN
 INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at,kind)
 SELECT lower(hex(randomblob(16))),'series:'||NEW.series_id,NEW.player_id,p.display_name,lower(hex(randomblob(16))),CASE WHEN NEW.active=1 THEN NEW.joined_at ELSE NEW.left_at END,
 CASE WHEN NEW.active=1 THEN 'joined' WHEN NEW.left_reason='inactive' THEN 'inactive' ELSE 'left' END FROM players p JOIN game_chat_rooms cr ON cr.game_id='series:'||NEW.series_id WHERE p.id=NEW.player_id;
END;
CREATE TRIGGER series_chat_message_activity AFTER INSERT ON game_chat_messages WHEN NEW.kind='message' BEGIN
 UPDATE series_chat_members SET last_message_at=MAX(last_message_at,NEW.created_at) WHERE 'series:'||series_id=NEW.game_id AND player_id=NEW.author_id AND active=1;
 UPDATE game_chat_rooms SET expires_at=MAX(expires_at,NEW.created_at+2592000000) WHERE game_id=NEW.game_id AND EXISTS(SELECT 1 FROM series_chat_threads WHERE 'series:'||id=NEW.game_id);
END;
CREATE TRIGGER series_chat_group_member_left AFTER UPDATE OF status ON group_memberships WHEN NEW.status!='active' BEGIN
 UPDATE series_chat_members SET active=0,left_reason='group',left_at=NEW.updated_at WHERE player_id=NEW.player_id AND active=1 AND series_id IN(SELECT id FROM series_chat_threads WHERE group_id=NEW.group_id);
END;
CREATE TRIGGER series_chat_group_member_deleted BEFORE DELETE ON group_memberships BEGIN
 UPDATE series_chat_members SET active=0,left_reason='group',left_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE player_id=OLD.player_id AND active=1 AND series_id IN(SELECT id FROM series_chat_threads WHERE group_id=OLD.group_id);
END;
CREATE TRIGGER series_chat_group_archived AFTER UPDATE OF status ON tennis_groups WHEN NEW.status='archived' BEGIN
 UPDATE series_chat_members SET active=0,left_reason='group',left_at=NEW.updated_at WHERE active=1 AND series_id IN(SELECT id FROM series_chat_threads WHERE group_id=NEW.id);
END;

-- Avoid creating a new named notice during the account-deletion cascade.
CREATE TRIGGER series_chat_author_deleted BEFORE DELETE ON players BEGIN
 DELETE FROM series_chat_members WHERE player_id=OLD.id;
END;
