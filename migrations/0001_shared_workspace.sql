-- Preparation only: not registered as a production migration or applied remotely.
CREATE TABLE IF NOT EXISTS workspace_revisions (
  owner_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  write_id TEXT NOT NULL,
  raw TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created TEXT NOT NULL,
  PRIMARY KEY (owner_id, revision)
);
CREATE TABLE IF NOT EXISTS workspace_imports (
  owner_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  raw_backup TEXT NOT NULL,
  checksum TEXT NOT NULL,
  PRIMARY KEY (owner_id, revision),
  FOREIGN KEY (owner_id, revision) REFERENCES workspace_revisions(owner_id, revision)
);
