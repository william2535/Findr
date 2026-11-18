CREATE TABLE IF NOT EXISTS ai_reports (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_reports_expiry ON ai_reports(expires_at);
