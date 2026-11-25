-- Application-level moderation quotas. Provider reservations are conservative:
-- failed requests remain charged for the current quota window.
CREATE TABLE content_moderation_usage(
 scope TEXT NOT NULL,
 window_start INTEGER NOT NULL,
 requests INTEGER NOT NULL DEFAULT 0 CHECK(requests>=0),
 units INTEGER NOT NULL DEFAULT 0 CHECK(units>=0),
 PRIMARY KEY(scope,window_start)
);
CREATE INDEX content_moderation_usage_window ON content_moderation_usage(window_start);
