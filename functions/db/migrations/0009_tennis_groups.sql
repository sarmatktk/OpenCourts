CREATE TABLE tennis_groups (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
 visibility TEXT NOT NULL CHECK(visibility IN ('public','private')),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 public_description TEXT NOT NULL DEFAULT '' CHECK(length(public_description)<=500),
 description TEXT NOT NULL DEFAULT '' CHECK(length(description)<=2000),
 general_location TEXT NOT NULL CHECK(length(general_location) BETWEEN 1 AND 120),
 skill_preference TEXT NOT NULL DEFAULT 'any' CHECK(skill_preference IN ('any','beginner','intermediate','advanced')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
 version INTEGER NOT NULL DEFAULT 1,
 request_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(owner_id,request_id)
);
CREATE INDEX tennis_groups_discovery ON tennis_groups(status,created_at DESC,id);
CREATE TABLE group_memberships (
 group_id TEXT NOT NULL REFERENCES tennis_groups(id) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','admin')),
 status TEXT NOT NULL CHECK(status IN ('pending','active','rejected','removed','left')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(group_id,player_id)
);
CREATE INDEX group_memberships_player ON group_memberships(player_id,status,updated_at DESC);
