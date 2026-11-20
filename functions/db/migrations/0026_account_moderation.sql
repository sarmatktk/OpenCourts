CREATE TABLE account_moderation_actions (
 id TEXT PRIMARY KEY,
 player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
 moderator_id TEXT REFERENCES players(id) ON DELETE SET NULL,
 action TEXT NOT NULL CHECK(action IN ('suspend','restore')),
 reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 500),
 created_at INTEGER NOT NULL
);
CREATE INDEX account_moderation_history ON account_moderation_actions(created_at,id);
CREATE TRIGGER revoke_suspended_account AFTER UPDATE OF status ON players
WHEN NEW.status='disabled' AND OLD.status!='disabled' BEGIN
 UPDATE auth_sessions SET revoked_at=NEW.updated_at WHERE player_id=NEW.id AND revoked_at IS NULL;
 UPDATE notification_devices SET revoked_at=NEW.updated_at,updated_at=NEW.updated_at WHERE player_id=NEW.id AND revoked_at IS NULL;
END;
