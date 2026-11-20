-- Staff do not produce an inactivity departure when confirming a new place.
-- Access itself is evaluated against live roles by the application.
DROP TRIGGER series_chat_before_rejoin;
CREATE TRIGGER series_chat_before_rejoin BEFORE INSERT ON game_participants BEGIN
 UPDATE series_chat_members SET active=0,left_reason='inactive',left_at=NEW.joined_at
 WHERE player_id=NEW.player_id AND active=1 AND joined_at<=NEW.joined_at-2592000000 AND last_message_at<=NEW.joined_at-2592000000
 AND series_id=(SELECT series_id FROM games WHERE id=NEW.game_id AND visibility='group')
 AND NOT EXISTS(SELECT 1 FROM game_chat_context g WHERE g.series_id=series_chat_members.series_id AND g.organizer_id=NEW.player_id)
 AND NOT EXISTS(SELECT 1 FROM series_chat_threads t JOIN tennis_groups tg ON tg.id=t.group_id JOIN group_memberships staff ON staff.group_id=tg.id
  WHERE t.id=series_chat_members.series_id AND tg.status='active' AND staff.player_id=NEW.player_id AND staff.status='active'
  AND (tg.owner_id=NEW.player_id OR COALESCE(staff.assigned_role,staff.role) IN ('coowner','organizer')))
 AND NOT EXISTS(SELECT 1 FROM games sg JOIN game_participants cp ON cp.game_id=sg.id WHERE sg.series_id=series_chat_members.series_id AND cp.player_id=NEW.player_id AND sg.status='scheduled' AND sg.ends_at>NEW.joined_at-2592000000);
END;
