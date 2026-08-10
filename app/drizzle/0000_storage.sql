CREATE TABLE IF NOT EXISTS storage_entities (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  season_id TEXT,
  version INTEGER,
  deleted_at TEXT,
  data TEXT NOT NULL,
  PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS storage_entities_season_idx
  ON storage_entities (collection, season_id, deleted_at);
