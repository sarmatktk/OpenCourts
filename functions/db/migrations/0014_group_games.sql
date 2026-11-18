-- Guard group participation at the database boundary as well as the API.
CREATE TRIGGER group_game_participant_access BEFORE INSERT ON game_participants
WHEN EXISTS(SELECT 1 FROM games WHERE id=NEW.game_id AND visibility='group') AND NOT EXISTS(SELECT 1 FROM games g JOIN tennis_groups t ON t.id=g.group_id JOIN group_memberships m ON m.group_id=t.id JOIN players p ON p.id=m.player_id WHERE g.id=NEW.game_id AND t.status='active' AND m.player_id=NEW.player_id AND m.status='active' AND p.status='active')
BEGIN SELECT RAISE(ABORT,'group membership required'); END;
CREATE TRIGGER group_game_membership_loss AFTER UPDATE OF status,assigned_role,role ON group_memberships
BEGIN
 UPDATE games SET organizer_id=(SELECT owner_id FROM tennis_groups WHERE id=NEW.group_id),version=version+1,updated_at=NEW.updated_at
 WHERE group_id=NEW.group_id AND visibility='group' AND organizer_id=NEW.player_id AND starts_at>NEW.updated_at AND status='scheduled' AND organizer_id!=(SELECT owner_id FROM tennis_groups WHERE id=NEW.group_id) AND (NEW.status!='active' OR COALESCE(NEW.assigned_role,NEW.role) NOT IN ('organizer','coowner'));
 DELETE FROM game_participants WHERE player_id=NEW.player_id AND NEW.status!='active' AND game_id IN (SELECT id FROM games WHERE group_id=NEW.group_id AND visibility='group' AND starts_at>NEW.updated_at);
 DELETE FROM game_join_requests WHERE player_id=NEW.player_id AND NEW.status!='active' AND game_id IN (SELECT id FROM games WHERE group_id=NEW.group_id AND visibility='group');
END;
CREATE TRIGGER group_archive_games AFTER UPDATE OF status ON tennis_groups
WHEN NEW.status='archived' AND OLD.status='active'
BEGIN UPDATE games SET status='cancelled',version=version+1,updated_at=NEW.updated_at WHERE group_id=NEW.id AND visibility='group' AND status='scheduled' AND starts_at>NEW.updated_at; END;
