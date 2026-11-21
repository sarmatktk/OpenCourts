-- Local preparation only. No remote migration or production activation authorized.
-- No separate players, memberships or conversations: grants reference shared sessions.
CREATE TABLE native_auth_grants (
  id_hash TEXT PRIMARY KEY,
  challenge TEXT NOT NULL CHECK(length(challenge)=43),
  client_state TEXT NOT NULL CHECK(length(client_state) BETWEEN 32 AND 128),
  requester_hash TEXT NOT NULL,
  source_session_id TEXT REFERENCES auth_sessions(id) ON DELETE CASCADE,
  code_hash TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE INDEX native_auth_grants_expiry ON native_auth_grants(expires_at);
CREATE INDEX native_auth_grants_requester ON native_auth_grants(requester_hash,created_at);
