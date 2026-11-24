-- Development-only preparation. Apply only after review of the target environment.
CREATE TABLE native_provider_challenges (
  id_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK(provider IN ('google', 'apple')),
  nonce TEXT NOT NULL,
  requester_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE INDEX native_provider_challenges_expiry ON native_provider_challenges(expires_at);
CREATE INDEX native_provider_challenges_requester ON native_provider_challenges(requester_hash, created_at);
