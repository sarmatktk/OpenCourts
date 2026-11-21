-- New staff posts notify current active members. Existing posts are not backfilled.
CREATE TABLE group_discussion_announcements(
 id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES group_discussion_posts(id) ON DELETE CASCADE,
 group_id TEXT NOT NULL REFERENCES tennis_groups(id) ON DELETE CASCADE,
 recipient_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,read_at INTEGER,UNIQUE(post_id,recipient_id));
CREATE INDEX discussion_announcements_recipient ON group_discussion_announcements(recipient_id,created_at DESC);
CREATE TRIGGER discussion_staff_post AFTER INSERT ON group_discussion_posts BEGIN
 INSERT OR IGNORE INTO group_discussion_announcements(id,post_id,group_id,recipient_id,actor_id,created_at)
 SELECT lower(hex(randomblob(16))),NEW.id,NEW.group_id,m.player_id,NEW.author_id,NEW.created_at
 FROM tennis_groups g JOIN group_memberships author ON author.group_id=g.id AND author.player_id=NEW.author_id
 JOIN players a ON a.id=author.player_id JOIN group_memberships m ON m.group_id=g.id
 JOIN players recipient ON recipient.id=m.player_id
 WHERE g.id=NEW.group_id AND g.status='active' AND author.status='active' AND a.status='active'
 AND (g.owner_id=author.player_id OR COALESCE(author.assigned_role,author.role) IN('coowner','admin','organizer'))
 AND m.status='active' AND recipient.status='active' AND m.player_id!=NEW.author_id
 AND NOT EXISTS(SELECT 1 FROM player_blocks b WHERE (b.blocker_id=m.player_id AND b.blocked_id=NEW.author_id) OR (b.blocker_id=NEW.author_id AND b.blocked_id=m.player_id));
END;
CREATE TRIGGER discussion_announcement_push AFTER INSERT ON group_discussion_announcements BEGIN
 INSERT OR IGNORE INTO notification_events VALUES(lower(hex(randomblob(16))),'discussion_announcements',NEW.id,NEW.recipient_id,'groups','discussion_post','group',NEW.group_id,NEW.created_at,NEW.created_at+86400000);
END;
