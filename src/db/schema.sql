CREATE TABLE IF NOT EXISTS mail_logs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sender_name TEXT,
  mail_type TEXT NOT NULL,
  smtp_username TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  request_ip TEXT,
  content_preview TEXT
);

CREATE INDEX IF NOT EXISTS idx_mail_logs_created_at
ON mail_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_mail_logs_to_email
ON mail_logs(to_email);

CREATE INDEX IF NOT EXISTS idx_mail_logs_from_email
ON mail_logs(from_email);

CREATE INDEX IF NOT EXISTS idx_mail_logs_status
ON mail_logs(status);
