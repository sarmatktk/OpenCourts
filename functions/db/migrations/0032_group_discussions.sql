CREATE TABLE group_discussion_posts(
 id TEXT PRIMARY KEY,group_id TEXT NOT NULL REFERENCES tennis_groups(id) ON DELETE CASCADE,
 author_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),client_id TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,locked INTEGER NOT NULL DEFAULT 0 CHECK(locked IN(0,1)),deleted_at INTEGER,
 UNIQUE(group_id,author_id,client_id));
CREATE INDEX discussion_posts_group ON group_discussion_posts(group_id,created_at DESC,id);
CREATE INDEX discussion_posts_rate ON group_discussion_posts(author_id,created_at);
CREATE TABLE group_discussion_comments(
 id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES group_discussion_posts(id) ON DELETE CASCADE,
 author_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
 client_id TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,version INTEGER NOT NULL DEFAULT 1,deleted_at INTEGER,
 UNIQUE(post_id,author_id,client_id));
CREATE INDEX discussion_comments_post ON group_discussion_comments(post_id,created_at,id);
CREATE INDEX discussion_comments_rate ON group_discussion_comments(author_id,created_at);
CREATE TABLE group_discussion_likes(
 post_id TEXT NOT NULL REFERENCES group_discussion_posts(id) ON DELETE CASCADE,
 comment_id TEXT NOT NULL DEFAULT '',player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,PRIMARY KEY(post_id,comment_id,player_id));
CREATE TRIGGER discussion_comment_likes_deleted AFTER DELETE ON group_discussion_comments BEGIN
 DELETE FROM group_discussion_likes WHERE comment_id=OLD.id;
END;
CREATE TABLE group_discussion_subscriptions(
 post_id TEXT NOT NULL REFERENCES group_discussion_posts(id) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,muted INTEGER NOT NULL DEFAULT 0 CHECK(muted IN(0,1)),
 PRIMARY KEY(post_id,player_id));
CREATE TABLE group_discussion_notifications(
 id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES group_discussion_posts(id) ON DELETE CASCADE,
 comment_id TEXT NOT NULL REFERENCES group_discussion_comments(id) ON DELETE CASCADE,
 group_id TEXT NOT NULL REFERENCES tennis_groups(id) ON DELETE CASCADE,
 recipient_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,read_at INTEGER,UNIQUE(comment_id,recipient_id));
CREATE INDEX discussion_notifications_recipient ON group_discussion_notifications(recipient_id,created_at DESC);
CREATE TRIGGER discussion_reply_notification AFTER INSERT ON group_discussion_comments BEGIN
 INSERT OR IGNORE INTO group_discussion_subscriptions(post_id,player_id) VALUES(NEW.post_id,NEW.author_id);
 INSERT OR IGNORE INTO group_discussion_notifications(id,post_id,comment_id,group_id,recipient_id,actor_id,created_at)
 SELECT lower(hex(randomblob(16))),p.id,NEW.id,p.group_id,s.player_id,NEW.author_id,NEW.created_at
 FROM group_discussion_posts p JOIN group_discussion_subscriptions s ON s.post_id=p.id
 JOIN group_memberships m ON m.group_id=p.group_id AND m.player_id=s.player_id
 JOIN tennis_groups g ON g.id=p.group_id JOIN players recipient ON recipient.id=s.player_id
 WHERE p.id=NEW.post_id AND p.deleted_at IS NULL AND p.locked=0 AND s.muted=0 AND s.player_id!=NEW.author_id
 AND m.status='active' AND recipient.status='active' AND g.status='active'
 AND NOT EXISTS(SELECT 1 FROM player_blocks b WHERE (b.blocker_id=s.player_id AND b.blocked_id=NEW.author_id) OR (b.blocker_id=NEW.author_id AND b.blocked_id=s.player_id));
END;
CREATE TRIGGER discussion_push_event AFTER INSERT ON group_discussion_notifications BEGIN
 INSERT OR IGNORE INTO notification_events VALUES(lower(hex(randomblob(16))),'discussion_notifications',NEW.id,NEW.recipient_id,'groups','discussion_reply','group',NEW.group_id,NEW.created_at,NEW.created_at+86400000);
END;
CREATE TABLE group_discussion_reports(
 id TEXT PRIMARY KEY,group_id TEXT NOT NULL,post_id TEXT NOT NULL,content_id TEXT NOT NULL,content_type TEXT NOT NULL CHECK(content_type IN('post','comment')),
 reporter_id TEXT REFERENCES players(id) ON DELETE SET NULL,author_id TEXT REFERENCES players(id) ON DELETE SET NULL,
 category TEXT NOT NULL,details TEXT NOT NULL,snapshot TEXT NOT NULL,created_at INTEGER NOT NULL,resolved_at INTEGER,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open','resolved')),legal_hold INTEGER NOT NULL DEFAULT 0 CHECK(legal_hold IN(0,1)));
CREATE INDEX discussion_report_expiry ON group_discussion_reports(status,resolved_at);
CREATE TABLE group_discussion_actions(id TEXT PRIMARY KEY,group_id TEXT NOT NULL,post_id TEXT NOT NULL,content_id TEXT NOT NULL,
 actor_id TEXT REFERENCES players(id) ON DELETE SET NULL,action TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE player_photo_preferences(player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,shared INTEGER NOT NULL DEFAULT 0 CHECK(shared IN(0,1)),updated_at INTEGER NOT NULL);
