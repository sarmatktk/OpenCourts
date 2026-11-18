DROP TRIGGER notify_requester_on_game_decision;
DROP TRIGGER notify_requester_on_inserted_decision;
DROP TRIGGER notify_players_on_game_cancellation;
CREATE TRIGGER notify_requester_on_game_decision AFTER UPDATE OF status ON game_join_requests
WHEN NEW.status!=OLD.status AND NEW.status IN ('approved','rejected','removed')
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),id,NEW.player_id,organizer_id,NEW.status,'',0,NEW.updated_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility IN ('public','group');
END;
-- A removed participant may have joined before requests were introduced.
CREATE TRIGGER notify_requester_on_inserted_decision AFTER INSERT ON game_join_requests
WHEN NEW.status IN ('rejected','removed')
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),id,NEW.player_id,organizer_id,NEW.status,'',0,NEW.updated_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility IN ('public','group');
END;
CREATE TRIGGER notify_players_on_game_cancellation AFTER UPDATE OF status ON games
WHEN OLD.status='scheduled' AND NEW.status='cancelled' AND NEW.visibility IN ('public','group')
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),NEW.id,p.id,NEW.organizer_id,'game_cancelled','',0,NEW.updated_at FROM players p
 WHERE p.status='active' AND p.id!=NEW.organizer_id AND (EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=NEW.id AND gp.player_id=p.id) OR EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=NEW.id AND r.player_id=p.id AND r.status='pending'));
END;

CREATE TRIGGER transfer_group_games_before_player_delete BEFORE DELETE ON players
BEGIN
 UPDATE games SET organizer_id=(SELECT owner_id FROM tennis_groups WHERE id=games.group_id),version=version+1 WHERE visibility='group' AND organizer_id=OLD.id AND organizer_id!=(SELECT owner_id FROM tennis_groups WHERE id=games.group_id) AND status='scheduled' AND starts_at>CAST(strftime('%s','now') AS INTEGER)*1000;
END;
