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

export type MailLog = {
    id: string;
    created_at: string;
    from_email: string;
    to_email: string;
    subject: string;
    sender_name: string | null;
    mail_type: string;
    smtp_username: string;
    status: string;
    error_message: string | null;
    request_ip: string | null;
    content_text: string | null;
};

export type QueryMailLogsParams = {
    email?: string;
    page?: number;
    pageSize?: number;
};

export type QueryMailLogsResult = {
    items: MailLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export const queryMailLogs = async (
    db: AppD1Database | undefined,
    params: QueryMailLogsParams
): Promise<QueryMailLogsResult> => {
    if (!db) {
        throw new Error("D1 binding DB is not configured");
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;
    const offset = (page - 1) * pageSize;

    let countQuery = "SELECT COUNT(*) as total FROM mail_logs";
    let dataQuery = "SELECT * FROM mail_logs";
    const conditions: string[] = [];
    const bindings: string[] = [];

    if (params.email) {
        conditions.push("(from_email LIKE ? OR to_email LIKE ?)");
        bindings.push(`%${params.email}%`, `%${params.email}%`);
    }

    if (conditions.length > 0) {
        const whereClause = " WHERE " + conditions.join(" AND ");
        countQuery += whereClause;
        dataQuery += whereClause;
    }

    dataQuery += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const dataBindings = [...bindings, String(pageSize), String(offset)];

    const countResult = await db.prepare(countQuery).bind(...bindings).first<{ total: number }>();
    const total = countResult?.total ?? 0;

    const items = await db.prepare(dataQuery).bind(...dataBindings).all<MailLog>();

    return {
        items: items.results || [],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
};

// ─── SMTP 账号管理 ────────────────────────────────────────────

const SMTP_ACCOUNTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS smtp_accounts (
  id TEXT PRIMARY KEY,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_email TEXT,
  sender_name TEXT,
  protocol TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  remark TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);`;

export const ensureSmtpAccountsTable = async (db?: AppD1Database) => {
    if (!db) {
        throw new Error("D1 binding DB is not configured");
    }
    await db.prepare(SMTP_ACCOUNTS_SCHEMA.trim()).run();
};

export type SmtpAccount = {
    id: string;
    host: string;
    port: number;
    username: string;
    password: string;
    from_email: string | null;
    sender_name: string | null;
    protocol: string | null;
    enabled: number;
    remark: string | null;
    created_at: string;
    updated_at: string;
};

export type SmtpAccountPayload = {
    host: string;
    port: number;
    username: string;
    password: string;
    fromEmail?: string;
    senderName?: string;
    protocol?: string;
    enabled?: number;
    remark?: string;
};

// 列出所有启用的 SMTP 账号，供发件时匹配
export const getAllEnabledSmtpAccounts = async (db: AppD1Database | undefined): Promise<SmtpAccount[]> => {
    if (!db) {
        throw new Error("D1 binding DB is not configured");
    }
    const result = await db.prepare("SELECT * FROM smtp_accounts WHERE enabled = 1").all<SmtpAccount>();
    return result.results || [];
};

// 分页查询全部 SMTP 账号（含禁用的）
export const querySmtpAccounts = async (
    db: AppD1Database | undefined,
    page: number = 1,
    pageSize: number = 20
): Promise<{ items: SmtpAccount[]; total: number; page: number; pageSize: number; totalPages: number }> => {
    if (!db) {
        throw new Error("D1 binding DB is not configured");
    }

    const p = page > 0 ? page : 1;
    const ps = pageSize > 0 ? pageSize : 20;
    const offset = (p - 1) * ps;

    const countResult = await db.prepare("SELECT COUNT(*) as total FROM smtp_accounts").first<{ total: number }>();
    const total = countResult?.total ?? 0;

    const items = await db.prepare("SELECT * FROM smtp_accounts ORDER BY created_at DESC LIMIT ? OFFSET ?")
        .bind(ps, offset)
        .all<SmtpAccount>();

    return { items: items.results || [], total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) };
};

// 按 ID 查询单个账号
export const getSmtpAccountById = async (db: AppD1Database | undefined, id: string): Promise<SmtpAccount | null> => {
    if (!db) {
        throw new Error("D1 binding DB is not configured");
    }
    return await db.prepare("SELECT * FROM smtp_accounts WHERE id = ?").bind(id).first<SmtpAccount>() ?? null;
};

// 新增 SMTP 账号
export const insertSmtpAccount = async (db: AppD1Database | undefined, payload: SmtpAccountPayload): Promise<SmtpAccount> => {
    if (!db) {
        throw new Error("D1 binding DB is not configured");
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(
        `INSERT INTO smtp_accounts (id, host, port, username, password, from_email, sender_name, protocol, enabled, remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        id,
        payload.host,
        payload.port,
        payload.username,
        payload.password,
        payload.fromEmail ?? null,
        payload.senderName ?? null,
        payload.protocol ?? null,
        payload.enabled ?? 1,
        payload.remark ?? null,
        now,
        now
    ).run();

    return (await getSmtpAccountById(db, id))!;
};

// 更新 SMTP 账号（部分更新）
export const updateSmtpAccount = async (db: AppD1Database | undefined, id: string, payload: Partial<SmtpAccountPayload>): Promise<SmtpAccount | null> => {
    if (!db) {
        throw new Error("D1 binding DB is not configured");
    }

    const existing = await getSmtpAccountById(db, id);
    if (!existing) return null;

    // 动态构建 SET 子句，只更新传入的字段
    const fields: string[] = [];
    const bindings: (string | number)[] = [];

    if (payload.host !== undefined) { fields.push("host = ?"); bindings.push(payload.host); }
    if (payload.port !== undefined) { fields.push("port = ?"); bindings.push(payload.port); }
    if (payload.username !== undefined) { fields.push("username = ?"); bindings.push(payload.username); }
    if (payload.password !== undefined) { fields.push("password = ?"); bindings.push(payload.password); }
    if (payload.fromEmail !== undefined) { fields.push("from_email = ?"); bindings.push(payload.fromEmail ?? ""); }
    if (payload.senderName !== undefined) { fields.push("sender_name = ?"); bindings.push(payload.senderName ?? ""); }
    if (payload.protocol !== undefined) { fields.push("protocol = ?"); bindings.push(payload.protocol ?? ""); }
    if (payload.enabled !== undefined) { fields.push("enabled = ?"); bindings.push(payload.enabled); }
    if (payload.remark !== undefined) { fields.push("remark = ?"); bindings.push(payload.remark ?? ""); }

    if (fields.length === 0) return existing;

    fields.push("updated_at = ?");
    bindings.push(new Date().toISOString());
    bindings.push(id);

    await db.prepare(`UPDATE smtp_accounts SET ${fields.join(", ")} WHERE id = ?`).bind(...bindings).run();

    return await getSmtpAccountById(db, id);
};

// 删除 SMTP 账号
export const deleteSmtpAccount = async (db: AppD1Database | undefined, id: string): Promise<boolean> => {
    if (!db) {
        throw new Error("D1 binding DB is not configured");
    }
    const result = await db.prepare("DELETE FROM smtp_accounts WHERE id = ?").bind(id).run();
    return result.meta.changes > 0;
};
