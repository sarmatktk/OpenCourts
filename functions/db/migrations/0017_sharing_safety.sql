CREATE TABLE game_invitation_links (
 id TEXT PRIMARY KEY,
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL UNIQUE,
 expires_at INTEGER NOT NULL,
 revoked_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE INDEX game_invitation_game ON game_invitation_links(game_id,created_at DESC);
CREATE TABLE game_invitation_access (
 link_id TEXT NOT NULL REFERENCES game_invitation_links(id) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(link_id,player_id)
);
CREATE TABLE player_blocks (
 blocker_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 blocked_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(blocker_id,blocked_id),CHECK(blocker_id!=blocked_id)
);
CREATE INDEX player_block_reverse ON player_blocks(blocked_id,blocker_id);
CREATE TABLE safety_reports (
 id TEXT PRIMARY KEY,
 reporter_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 subject_type TEXT NOT NULL CHECK(subject_type IN ('player','game','group')),
 subject_id TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('harassment','spam','unsafe','privacy','other')),
 details TEXT NOT NULL CHECK(length(details)<=1000),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewed','resolved')),
 created_at INTEGER NOT NULL,
 reviewed_at INTEGER
);
CREATE INDEX safety_report_queue ON safety_reports(status,created_at);
DROP TRIGGER notify_host_on_game_request;
CREATE TRIGGER notify_host_on_game_request AFTER INSERT ON game_join_requests WHEN NEW.status='pending'
BEGIN INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at) SELECT lower(hex(randomblob(16))),id,organizer_id,NEW.player_id,'requested','',0,NEW.created_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility IN ('public','unlisted'); END;

DROP TRIGGER notify_requester_on_game_decision;
DROP TRIGGER notify_requester_on_inserted_decision;
DROP TRIGGER notify_players_on_game_cancellation;
CREATE TRIGGER notify_requester_on_game_decision AFTER UPDATE OF status ON game_join_requests
WHEN NEW.status!=OLD.status AND NEW.status IN ('approved','rejected','removed')
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),id,NEW.player_id,organizer_id,NEW.status,'',0,NEW.updated_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility IN ('public','group','unlisted');
END;
-- A removed participant may have joined before requests were introduced.
CREATE TRIGGER notify_requester_on_inserted_decision AFTER INSERT ON game_join_requests
WHEN NEW.status IN ('rejected','removed')
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),id,NEW.player_id,organizer_id,NEW.status,'',0,NEW.updated_at FROM games WHERE id=NEW.game_id AND organizer_id!=NEW.player_id AND visibility IN ('public','group','unlisted');
END;
CREATE TRIGGER notify_players_on_game_cancellation AFTER UPDATE OF status ON games
WHEN OLD.status='scheduled' AND NEW.status='cancelled' AND NEW.visibility IN ('public','group','unlisted')
BEGIN
 INSERT INTO game_notifications(id,game_id,recipient_id,actor_id,kind,reason,places_released,created_at)
 SELECT lower(hex(randomblob(16))),NEW.id,p.id,NEW.organizer_id,'game_cancelled','',0,NEW.updated_at FROM players p
 WHERE p.status='active' AND p.id!=NEW.organizer_id AND (EXISTS(SELECT 1 FROM game_participants gp WHERE gp.game_id=NEW.id AND gp.player_id=p.id) OR EXISTS(SELECT 1 FROM game_join_requests r WHERE r.game_id=NEW.id AND r.player_id=p.id AND r.status='pending'));
END;

