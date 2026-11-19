-- Group-event visibility follows current group visibility, not a copied game flag.
DROP TRIGGER group_game_participant_access;
CREATE TRIGGER group_game_participant_access BEFORE INSERT ON game_participants
WHEN EXISTS(SELECT 1 FROM games WHERE id=NEW.game_id AND visibility='group') AND NOT EXISTS(
 SELECT 1 FROM games g JOIN tennis_groups t ON t.id=g.group_id JOIN players p ON p.id=NEW.player_id
 WHERE g.id=NEW.game_id AND t.status='active' AND p.status='active' AND (
 EXISTS(SELECT 1 FROM group_memberships m WHERE m.group_id=t.id AND m.player_id=NEW.player_id AND m.status='active')
 OR (t.visibility='public' AND EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=g.id AND r.player_id=NEW.player_id AND r.status='pending'))))
BEGIN SELECT RAISE(ABORT,'group membership or public-event host approval required'); END;
CREATE TRIGGER private_group_event_access AFTER UPDATE OF visibility ON tennis_groups
WHEN NEW.visibility='private' AND OLD.visibility='public'
BEGIN
 DELETE FROM game_participants WHERE game_id IN (SELECT id FROM games WHERE group_id=NEW.id AND visibility='group' AND starts_at>NEW.updated_at)
 AND NOT EXISTS(SELECT 1 FROM group_memberships m WHERE m.group_id=NEW.id AND m.player_id=game_participants.player_id AND m.status='active');
 DELETE FROM game_join_requests WHERE game_id IN (SELECT id FROM games WHERE group_id=NEW.id AND visibility='group')
 AND NOT EXISTS(SELECT 1 FROM group_memberships m WHERE m.group_id=NEW.id AND m.player_id=game_join_requests.player_id AND m.status='active');
END;
