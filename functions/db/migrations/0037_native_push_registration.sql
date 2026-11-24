-- Local native APNs registration foundation. Do not apply remotely without rollout approval.
-- APNs tokens use the existing device endpoint column; web encryption columns stay empty.
-- Installation secrets are stored only as hashes, never returned to API clients.
CREATE TABLE native_push_devices (
 device_id TEXT PRIMARY KEY REFERENCES notification_devices(id) ON DELETE CASCADE,
 installation_hash TEXT NOT NULL UNIQUE,
 environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
 topic TEXT NOT NULL
);

-- Revoke native registration and queued deliveries immediately on logout/suspension.
-- Expiry is also checked by fanout and must be checked again by the native sender.
CREATE TRIGGER native_push_session_revoked AFTER UPDATE OF revoked_at ON auth_sessions
WHEN NEW.revoked_at IS NOT NULL BEGIN
 DELETE FROM notification_devices WHERE session_id=NEW.id AND transport='apns';
END;
