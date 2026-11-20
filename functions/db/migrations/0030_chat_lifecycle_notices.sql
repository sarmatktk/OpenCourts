-- Standalone confirmed attendance gets the same quiet lifecycle lines as series.
CREATE TRIGGER chat_confirmed_player_added AFTER INSERT ON game_participants
WHEN EXISTS(SELECT 1 FROM games WHERE id=NEW.game_id AND (visibility!='group' OR series_id IS NULL)) BEGIN
 INSERT INTO game_chat_rooms(game_id,expires_at)
 SELECT id,COALESCE(chat_cancelled_at,CASE WHEN status='cancelled' THEN updated_at ELSE ends_at END)+2592000000 FROM games WHERE id=NEW.game_id
 ON CONFLICT(game_id) DO NOTHING;
 INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at,kind)
 SELECT lower(hex(randomblob(16))),NEW.game_id,p.id,COALESCE(NULLIF(trim(p.display_name),''),'Unnamed player'),lower(hex(randomblob(16))),NEW.joined_at,'joined'
 FROM players p JOIN game_chat_rooms cr ON cr.game_id=NEW.game_id WHERE p.id=NEW.player_id;
END;
CREATE TRIGGER chat_confirmed_player_left AFTER DELETE ON game_participants
WHEN EXISTS(SELECT 1 FROM games WHERE id=OLD.game_id AND organizer_id!=OLD.player_id AND (visibility!='group' OR series_id IS NULL)) BEGIN
 INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at,kind)
 SELECT lower(hex(randomblob(16))),OLD.game_id,p.id,COALESCE(NULLIF(trim(p.display_name),''),'Unnamed player'),lower(hex(randomblob(16))),CAST(strftime('%s','now') AS INTEGER)*1000,'left'
 FROM players p JOIN game_chat_rooms cr ON cr.game_id=OLD.game_id WHERE p.id=OLD.player_id;
END;

-- Staff can have access without a series membership row. Their group departure
-- still needs a notice. Active membership rows use the existing status trigger.
CREATE TRIGGER series_chat_staff_group_left BEFORE UPDATE OF status ON group_memberships
WHEN OLD.status='active' AND NEW.status!='active' BEGIN
 INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at,kind)
 SELECT lower(hex(randomblob(16))),g.id,p.id,COALESCE(NULLIF(trim(p.display_name),''),'Unnamed player'),lower(hex(randomblob(16))),NEW.updated_at,'left'
 FROM game_chat_context g JOIN tennis_groups t ON t.id=g.group_id JOIN players p ON p.id=OLD.player_id
 JOIN game_chat_rooms cr ON cr.game_id=g.id
 WHERE g.series_id IS NOT NULL AND t.id=OLD.group_id AND t.status='active'
 AND (t.owner_id=OLD.player_id OR g.organizer_id=OLD.player_id OR COALESCE(OLD.assigned_role,OLD.role) IN ('coowner','organizer'))
 AND NOT EXISTS(SELECT 1 FROM series_chat_members sm WHERE sm.series_id=g.series_id AND sm.player_id=OLD.player_id AND sm.active=1);
END;

-- Repair recent confirmed admissions that predate standalone notice support.
-- Do not invent admissions for pending requests or replay old participant history.
INSERT INTO game_chat_rooms(game_id,expires_at)
 SELECT DISTINCT g.id,COALESCE(g.chat_cancelled_at,CASE WHEN g.status='cancelled' THEN g.updated_at ELSE g.ends_at END)+2592000000
 FROM games g JOIN game_participants cp ON cp.game_id=g.id
 WHERE (g.visibility!='group' OR g.series_id IS NULL) AND cp.player_id!=g.organizer_id
 AND cp.joined_at>=CAST(strftime('%s','now') AS INTEGER)*1000-86400000
 ON CONFLICT(game_id) DO NOTHING;
INSERT INTO game_chat_messages(id,game_id,author_id,body,client_id,created_at,kind)
 SELECT lower(hex(randomblob(16))),g.id,p.id,COALESCE(NULLIF(trim(p.display_name),''),'Unnamed player'),lower(hex(randomblob(16))),cp.joined_at,'joined'
 FROM games g JOIN game_participants cp ON cp.game_id=g.id JOIN players p ON p.id=cp.player_id JOIN game_chat_rooms cr ON cr.game_id=g.id
 WHERE (g.visibility!='group' OR g.series_id IS NULL) AND cp.player_id!=g.organizer_id
 AND cp.joined_at>=CAST(strftime('%s','now') AS INTEGER)*1000-86400000
 AND NOT EXISTS(SELECT 1 FROM game_chat_messages m WHERE m.game_id=g.id AND m.author_id=p.id AND m.kind='joined' AND m.created_at>=cp.joined_at);
