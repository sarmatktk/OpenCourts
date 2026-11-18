-- Phase 1 only: apply locally first; remote development requires separate approval.
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '' CHECK(length(display_name) <= 60),
  bio TEXT NOT NULL DEFAULT '' CHECK(length(bio) <= 500),
  general_location TEXT NOT NULL DEFAULT '' CHECK(length(general_location) <= 100),
  skill_level TEXT NOT NULL DEFAULT 'unspecified' CHECK(skill_level IN ('unspecified','beginner','intermediate','advanced')),
  discoverable INTEGER NOT NULL DEFAULT 0 CHECK(discoverable IN (0,1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('google','apple')),
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK(email_verified IN (0,1)),
  provider_token_encrypted TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(issuer, subject),
  UNIQUE(player_id, provider)
);
CREATE INDEX auth_identities_player_idx ON auth_identities(player_id);
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  client_type TEXT NOT NULL DEFAULT 'web' CHECK(client_type IN ('web','ios','android')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX auth_sessions_player_idx ON auth_sessions(player_id);
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at);
CREATE TABLE auth_login_attempts (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK(provider IN ('google','apple')),
  browser_hash TEXT NOT NULL,
  requester_hash TEXT NOT NULL,
  nonce TEXT NOT NULL,
  code_verifier TEXT,
  return_path TEXT NOT NULL DEFAULT '/play-together',
  link_player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  link_session_hash TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  CHECK ((link_player_id IS NULL) = (link_session_hash IS NULL))
);
CREATE INDEX auth_login_attempts_expiry_idx ON auth_login_attempts(expires_at);
CREATE INDEX auth_login_attempts_requester_idx ON auth_login_attempts(requester_hash, created_at);
