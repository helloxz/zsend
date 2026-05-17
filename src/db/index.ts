import type { AppD1Database } from "../types/env";

const MAIL_LOGS_SCHEMA = [
    `CREATE TABLE IF NOT EXISTS mail_logs (
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
  content_text TEXT
);`,
    `CREATE INDEX IF NOT EXISTS idx_mail_logs_created_at
ON mail_logs(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_mail_logs_to_email
ON mail_logs(to_email);`,
    `CREATE INDEX IF NOT EXISTS idx_mail_logs_from_email
ON mail_logs(from_email);`,
    `CREATE INDEX IF NOT EXISTS idx_mail_logs_status
ON mail_logs(status);`,
];

export const ensureMailLogsTable = async (db?: AppD1Database) => {
    if (!db) {
        throw new Error("D1 binding DB is not configured");
    }

    for (const statement of MAIL_LOGS_SCHEMA) {
        await db.prepare(statement.trim()).run();
    }
};

type MailLogPayload = {
    fromEmail: string;
    toEmail: string;
    subject: string;
    senderName?: string;
    mailType: string;
    smtpUsername: string;
    status: "success" | "failed";
    errorMessage?: string;
    requestIp?: string | null;
    contentText?: string;
};

const createLogId = () => {
    return crypto.randomUUID();
};

const getCurrentTimestamp = () => {
    return new Date().toISOString();
};

export const insertMailLog = async (db: AppD1Database | undefined, payload: MailLogPayload) => {
    if (!db) {
        throw new Error("D1 binding DB is not configured");
    }

    // 日志写入保持扁平字段，方便后续直接按时间、状态、收发件地址做 SQL 查询。
    await db.prepare(
        `INSERT INTO mail_logs (
          id,
          created_at,
          from_email,
          to_email,
          subject,
          sender_name,
          mail_type,
          smtp_username,
          status,
          error_message,
          request_ip,
          content_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        createLogId(),
        getCurrentTimestamp(),
        payload.fromEmail,
        payload.toEmail,
        payload.subject,
        payload.senderName ?? null,
        payload.mailType,
        payload.smtpUsername,
        payload.status,
        payload.errorMessage ?? null,
        payload.requestIp ?? null,
        payload.contentText ?? null
    ).run();
};
